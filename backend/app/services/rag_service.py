import time
import os
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.database import get_setting
from app.schemas.schemas import RetrievedChunk, RAGCitation, RAGResponse

SYSTEM_INSTRUCTION = (
    "You are a document-grounded research assistant. Answer the user's question using only the "
    "provided document passages. Do not invent information. If the retrieved context does not contain "
    "enough evidence, explicitly state that the answer cannot be determined from the provided documents. "
    "Always cite the source passage numbers [Citation X] when referencing information."
)

class RAGService:
    @classmethod
    def get_api_key(cls) -> str:
        # Check database setting first, then env variable
        db_key = get_setting("GEMINI_API_KEY", "")
        if db_key and str(db_key).strip():
            return str(db_key).strip()
        env_key = os.getenv("GEMINI_API_KEY", "")
        if env_key and str(env_key).strip():
            return str(env_key).strip()
        return settings.GEMINI_API_KEY or ""

    @classmethod
    def generate_answer(
        cls,
        query: str,
        retrieved_chunks: List[RetrievedChunk],
        chunking_strategy: str,
        retrieval_method: str,
        retrieval_latency_ms: float,
        model_name: Optional[str] = None
    ) -> RAGResponse:
        api_key = cls.get_api_key()
        active_model = model_name or get_setting("DEFAULT_GEMINI_MODEL", settings.DEFAULT_GEMINI_MODEL)

        # Build citations list
        citations = []
        for i, chunk in enumerate(retrieved_chunks, start=1):
            snippet = chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content
            citations.append(RAGCitation(
                citation_id=i,
                document_name=chunk.document_name,
                page_number=chunk.page_number,
                chunk_index=chunk.chunk_index,
                relevance_score=chunk.score,
                snippet=snippet
            ))

        # Check if chunks are empty
        if not retrieved_chunks:
            return RAGResponse(
                query=query,
                answer="No relevant document passages were found to answer this question. Please ensure documents are uploaded and indexed.",
                citations=[],
                retrieved_chunks=[],
                chunking_strategy=chunking_strategy,
                retrieval_method=retrieval_method,
                model_used=active_model,
                retrieval_latency_ms=retrieval_latency_ms,
                generation_latency_ms=0.0,
                total_latency_ms=retrieval_latency_ms,
                is_grounded=True,
                api_available=bool(api_key),
                error_message=None
            )

        # If no API key is configured, preserve retrieval results and return honest notice
        if not api_key:
            return RAGResponse(
                query=query,
                answer=(
                    "Retrieval succeeded and evidence passages were extracted. However, LLM answer generation requires a "
                    "Gemini API key. You can add your GEMINI_API_KEY in the 'Settings' tab or through your .env file to enable "
                    "automated synthesis and grounding."
                ),
                citations=citations,
                retrieved_chunks=retrieved_chunks,
                chunking_strategy=chunking_strategy,
                retrieval_method=retrieval_method,
                model_used=active_model,
                retrieval_latency_ms=retrieval_latency_ms,
                generation_latency_ms=0.0,
                total_latency_ms=retrieval_latency_ms,
                is_grounded=False,
                api_available=False,
                error_message="Gemini API Key is not configured."
            )

        # Build context prompt with strict boundary isolation
        context_blocks = []
        for i, chunk in enumerate(retrieved_chunks, start=1):
            page_info = f" (Page {chunk.page_number})" if chunk.page_number else ""
            context_blocks.append(
                f"[Citation {i}] Document: {chunk.document_name}{page_info}\n"
                f"Content:\n{chunk.content}\n"
            )

        context_text = "\n---\n".join(context_blocks)
        user_prompt = (
            f"Here are the retrieved document evidence passages:\n\n"
            f"<evidence_passages>\n{context_text}\n</evidence_passages>\n\n"
            f"User Question: {query}\n\n"
            f"Please provide an accurate, grounded answer based strictly on the evidence passages above. "
            f"Cite the passages using [Citation X] format."
        )

        gen_start = time.perf_counter()
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=active_model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.2,
                )
            )
            gen_time = (time.perf_counter() - gen_start) * 1000
            answer_text = response.text or "No text generated."

            return RAGResponse(
                query=query,
                answer=answer_text,
                citations=citations,
                retrieved_chunks=retrieved_chunks,
                chunking_strategy=chunking_strategy,
                retrieval_method=retrieval_method,
                model_used=active_model,
                retrieval_latency_ms=retrieval_latency_ms,
                generation_latency_ms=round(gen_time, 2),
                total_latency_ms=round(retrieval_latency_ms + gen_time, 2),
                is_grounded=True,
                api_available=True,
                error_message=None
            )
        except Exception as e:
            gen_time = (time.perf_counter() - gen_start) * 1000
            error_str = str(e)
            return RAGResponse(
                query=query,
                answer=f"Could not generate answer due to an API error: {error_str}. The retrieved passages are shown below for manual review.",
                citations=citations,
                retrieved_chunks=retrieved_chunks,
                chunking_strategy=chunking_strategy,
                retrieval_method=retrieval_method,
                model_used=active_model,
                retrieval_latency_ms=retrieval_latency_ms,
                generation_latency_ms=round(gen_time, 2),
                total_latency_ms=round(retrieval_latency_ms + gen_time, 2),
                is_grounded=False,
                api_available=False,
                error_message=error_str
            )
