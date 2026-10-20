from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from app.services.document_service import DocumentService
from app.schemas.schemas import DocumentBase, DocumentDetail

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload", response_model=DocumentDetail)
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename
    if not (filename.endswith(".pdf") or filename.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Only .pdf and .txt files are supported.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        doc = DocumentService.save_document(filename, content)
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.get("", response_model=List[DocumentBase])
def list_documents():
    return DocumentService.list_documents()

@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(document_id: str):
    doc = DocumentService.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc

@router.delete("/{document_id}")
def delete_document(document_id: str):
    success = DocumentService.delete_document(document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"status": "success", "message": f"Document {document_id} and associated chunks deleted."}
