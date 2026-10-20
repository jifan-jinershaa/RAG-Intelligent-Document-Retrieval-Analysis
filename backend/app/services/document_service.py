import re
import uuid
import shutil
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import pymupdf  # PyMuPDF official import

from app.core.config import settings
from app.core.database import get_db_connection
from app.schemas.schemas import DocumentBase, DocumentDetail

def clean_extracted_text(text: str) -> str:
    """
    Cleans extracted text carefully:
    - Normalizes windows \r\n to \n
    - Collapses 3+ newlines to double newlines (paragraphs)
    - Replaces odd control characters and non-breaking spaces
    - Collapses multiple horizontal spaces to single space without destroying newlines
    """
    if not text:
        return ""
    # Replace non-breaking space and control chars
    text = text.replace('\xa0', ' ').replace('\r\n', '\n').replace('\r', '\n')
    # Collapse multiple horizontal whitespaces
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.split('\n')]
    cleaned = '\n'.join(lines)
    # Collapse 3+ newlines into 2 (paragraphs)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()
    return cleaned

class DocumentService:
    @staticmethod
    def extract_from_pdf(file_path: Path) -> Tuple[str, List[Dict[str, Any]], int]:
        """
        Extracts text from PDF page-by-page using PyMuPDF.
        Returns:
            (full_clean_text, pages_metadata, page_count)
        """
        doc = pymupdf.open(str(file_path))
        page_count = len(doc)
        pages_data = []
        full_text_parts = []
        char_offset = 0

        for page_idx in range(page_count):
            page = doc[page_idx]
            page_raw = page.get_text("text") or ""
            page_clean = clean_extracted_text(page_raw)
            page_len = len(page_clean)
            
            pages_data.append({
                "page_number": page_idx + 1,
                "text": page_clean,
                "char_count": page_len,
                "start_char": char_offset,
                "end_char": char_offset + page_len
            })
            
            if page_clean:
                full_text_parts.append(page_clean)
                char_offset += page_len + 2  # accounted for paragraph separator

        doc.close()
        full_text = "\n\n".join(full_text_parts)
        return full_text, pages_data, page_count

    @staticmethod
    def extract_from_txt(file_path: Path) -> Tuple[str, List[Dict[str, Any]], int]:
        """
        Extracts text from TXT file with utf-8 or latin-1 fallback.
        """
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                raw_text = f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="latin-1") as f:
                raw_text = f.read()

        clean_text = clean_extracted_text(raw_text)
        pages_data = [{
            "page_number": 1,
            "text": clean_text,
            "char_count": len(clean_text),
            "start_char": 0,
            "end_char": len(clean_text)
        }]
        return clean_text, pages_data, 1

    @classmethod
    def save_document(cls, filename: str, content_bytes: bytes) -> DocumentDetail:
        doc_id = str(uuid.uuid4())
        file_ext = Path(filename).suffix.lower()
        if file_ext not in [".pdf", ".txt"]:
            raise ValueError(f"Unsupported file format: {file_ext}. Only PDF and TXT are supported.")

        saved_filename = f"{doc_id}_{filename}"
        saved_path = settings.UPLOAD_PATH / saved_filename
        with open(saved_path, "wb") as f:
            f.write(content_bytes)

        file_size = len(content_bytes)
        
        # Extraction
        if file_ext == ".pdf":
            full_text, pages_data, page_count = cls.extract_from_pdf(saved_path)
        else:
            full_text, pages_data, page_count = cls.extract_from_txt(saved_path)

        char_count = len(full_text)
        if char_count == 0:
            status = "empty_or_scanned"
        else:
            status = "ready"

        upload_date = datetime.utcnow().isoformat()
        metadata_dict = {
            "original_filename": filename,
            "pages": pages_data,
            "is_scanned_notice": "No extractable text found. Scanned PDFs requiring OCR are not supported." if status == "empty_or_scanned" else None
        }

        import json
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO documents (
                id, filename, file_type, file_size, page_count, char_count, 
                upload_date, status, file_path, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            doc_id, filename, file_ext.replace(".", "").upper(), file_size, 
            page_count, char_count, upload_date, status, str(saved_path), 
            json.dumps(metadata_dict)
        ))
        conn.commit()
        conn.close()

        preview = full_text[:1200] if full_text else ""
        return DocumentDetail(
            id=doc_id,
            filename=filename,
            file_type=file_ext.replace(".", "").upper(),
            file_size=file_size,
            page_count=page_count,
            char_count=char_count,
            upload_date=upload_date,
            status=status,
            file_path=str(saved_path),
            preview_text=preview,
            metadata_json=metadata_dict
        )

    @classmethod
    def list_documents(cls) -> List[DocumentBase]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, filename, file_type, file_size, page_count, char_count, upload_date, status FROM documents ORDER BY upload_date DESC")
        rows = cursor.fetchall()
        conn.close()

        return [
            DocumentBase(
                id=row["id"],
                filename=row["filename"],
                file_type=row["file_type"],
                file_size=row["file_size"],
                page_count=row["page_count"],
                char_count=row["char_count"],
                upload_date=row["upload_date"],
                status=row["status"]
            )
            for row in rows
        ]

    @classmethod
    def get_document(cls, document_id: str) -> Optional[DocumentDetail]:
        import json
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE id = ?", (document_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        metadata = json.loads(row["metadata_json"]) if row["metadata_json"] else {}
        file_path = Path(row["file_path"])
        full_text = ""
        if file_path.exists():
            if row["file_type"] == "PDF":
                full_text, _, _ = cls.extract_from_pdf(file_path)
            else:
                full_text, _, _ = cls.extract_from_txt(file_path)

        preview = full_text[:2000] if full_text else ""
        return DocumentDetail(
            id=row["id"],
            filename=row["filename"],
            file_type=row["file_type"],
            file_size=row["file_size"],
            page_count=row["page_count"],
            char_count=row["char_count"],
            upload_date=row["upload_date"],
            status=row["status"],
            file_path=row["file_path"],
            preview_text=preview,
            metadata_json=metadata
        )

    @classmethod
    def delete_document(cls, document_id: str) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT file_path FROM documents WHERE id = ?", (document_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False

        file_path = Path(row["file_path"])
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass

        # Delete chunks from DB
        cursor.execute("DELETE FROM document_chunks WHERE document_id = ?", (document_id,))
        cursor.execute("DELETE FROM eval_queries WHERE document_id = ?", (document_id,))
        cursor.execute("DELETE FROM documents WHERE id = ?", (document_id,))
        conn.commit()
        conn.close()
        return True

    @classmethod
    def get_document_full_text(cls, document_id: str) -> Tuple[str, List[Dict[str, Any]]]:
        import json
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT file_path, file_type, metadata_json FROM documents WHERE id = ?", (document_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return "", []

        file_path = Path(row["file_path"])
        if not file_path.exists():
            return "", []

        if row["file_type"] == "PDF":
            full_text, pages, _ = cls.extract_from_pdf(file_path)
            return full_text, pages
        else:
            full_text, pages, _ = cls.extract_from_txt(file_path)
            return full_text, pages
