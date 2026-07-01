from typing import List

from sqlalchemy.orm import Session

from app.services.cache_service import get_cached_json, semantic_search_cache_key, set_cached_json
from app.services.audit_logger import log_audit_event
from app.services.embedding_service import get_embedding_service
from app.services.memory_documents import MemoryDocument, build_memory_documents
from app.services.vector_store import VectorSearchResult, get_vector_store


def sync_user_memories(db: Session, user_id: int) -> List[MemoryDocument]:
    documents = build_memory_documents(db, user_id)
    if not documents:
        return []

    embedding_service = get_embedding_service()
    vector_store = get_vector_store()
    embeddings = embedding_service.embed_texts([document.text for document in documents])
    vector_store.upsert(documents, embeddings)
    return documents


def semantic_search_memories(
    db: Session,
    query_text: str,
    user_id: int,
    top_k: int = 3,
) -> List[VectorSearchResult]:
    cache_key = semantic_search_cache_key(user_id, query_text, top_k)
    log_audit_event(
        event_type="semantic_retrieval",
        status="attempted",
        user_id=user_id,
        entity_type="memory",
        message="Semantic memory retrieval started",
        metadata={"query_text": query_text, "top_k": top_k},
        db=db,
    )
    try:
        cached = get_cached_json(cache_key)
        if cached is not None:
            return [VectorSearchResult(**item) for item in cached]

        documents = sync_user_memories(db, user_id)
        if not documents:
            log_audit_event(
                event_type="semantic_retrieval",
                status="completed",
                user_id=user_id,
                entity_type="memory",
                message="Semantic memory retrieval returned no documents",
                metadata={"result_count": 0},
                db=db,
            )
            return []

        embedding_service = get_embedding_service()
        vector_store = get_vector_store()
        query_embedding = embedding_service.embed_texts([query_text])[0]
        results = vector_store.search(query_embedding, user_id=user_id, top_k=top_k)
        set_cached_json(cache_key, [result.__dict__ for result in results])
        log_audit_event(
            event_type="semantic_retrieval",
            status="completed",
            user_id=user_id,
            entity_type="memory",
            message="Semantic memory retrieval completed",
            metadata={"result_count": len(results)},
            db=db,
        )
        return results
    except Exception as exc:
        log_audit_event(
            event_type="semantic_retrieval",
            status="failed",
            user_id=user_id,
            entity_type="memory",
            message=str(exc),
            metadata={"query_text": query_text},
            db=db,
        )
        return []
