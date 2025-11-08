"""Hybrid search combining BM25 and vector similarity"""
import logging
from typing import List
import asyncpg

from app.core.database import db
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


async def hybrid_search(query_text: str, category: str, limit: int = 5) -> List[asyncpg.Record]:
    """
    Hybrid search combining BM25 (keyword) and vector similarity
    Uses Reciprocal Rank Fusion (RRF) to combine results
    
    Args:
        query_text: Search query
        category: Strategy category to filter by
        limit: Number of results to return
        
    Returns:
        List of optimization pattern records
    """
    try:
        # Generate embedding for vector search
        query_embedding = await gemini_service.generate_embedding(query_text)
        
        if not query_embedding:
            # Fall back to BM25 only if embedding fails
            logger.warning("Embedding generation failed, using BM25 only")
            return await bm25_search(query_text, category, limit)
        
        # BM25 keyword search
        bm25_query = """
            SELECT id, pattern_name, description, code_example,
                   ts_rank(to_tsvector('english', description || ' ' || pattern_name), 
                          plainto_tsquery('english', $1)) as bm25_score,
                   ROW_NUMBER() OVER (ORDER BY ts_rank DESC) as rank
            FROM optimization_patterns
            WHERE category = $2
              AND to_tsvector('english', description || ' ' || pattern_name) @@ plainto_tsquery('english', $1)
            LIMIT 20
        """
        
        bm25_results = await db.fetch(bm25_query, query_text, category)
        
        # Vector similarity search
        vector_query = """
            SELECT id, pattern_name, description, code_example,
                   1 - (embedding <=> $1::vector) as vector_score,
                   ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) as rank
            FROM optimization_patterns
            WHERE category = $2 AND embedding IS NOT NULL
            LIMIT 20
        """
        
        vector_results = await db.fetch(vector_query, query_embedding, category)
        
        # Combine using Reciprocal Rank Fusion (RRF)
        combined = {}
        k = 60  # RRF constant (standard value)
        
        # Add BM25 results
        for row in bm25_results:
            combined[row['id']] = {
                'pattern': dict(row),
                'rrf_score': 1 / (k + row['rank'])
            }
        
        # Add vector results (combining scores if already exists)
        for row in vector_results:
            if row['id'] in combined:
                combined[row['id']]['rrf_score'] += 1 / (k + row['rank'])
            else:
                combined[row['id']] = {
                    'pattern': dict(row),
                    'rrf_score': 1 / (k + row['rank'])
                }
        
        # Sort by RRF score and return top results
        sorted_results = sorted(
            combined.values(), 
            key=lambda x: x['rrf_score'], 
            reverse=True
        )
        
        # Extract just the pattern records
        top_patterns = [r['pattern'] for r in sorted_results[:limit]]
        
        logger.info(f"Hybrid search returned {len(top_patterns)} results for category: {category}")
        return top_patterns
        
    except Exception as e:
        logger.error(f"Hybrid search error: {e}")
        # Fall back to BM25 search on error
        return await bm25_search(query_text, category, limit)


async def bm25_search(query_text: str, category: str, limit: int = 5) -> List[asyncpg.Record]:
    """
    BM25-only fallback search
    
    Args:
        query_text: Search query
        category: Strategy category to filter by
        limit: Number of results to return
        
    Returns:
        List of optimization pattern records
    """
    try:
        query = """
            SELECT id, pattern_name, description, code_example
            FROM optimization_patterns
            WHERE category = $1
              AND to_tsvector('english', description || ' ' || pattern_name) @@ plainto_tsquery('english', $2)
            ORDER BY ts_rank(to_tsvector('english', description || ' ' || pattern_name), 
                            plainto_tsquery('english', $2)) DESC
            LIMIT $3
        """
        
        results = await db.fetch(query, category, query_text, limit)
        logger.info(f"BM25 search returned {len(results)} results for category: {category}")
        return results
        
    except Exception as e:
        logger.error(f"BM25 search error: {e}")
        return []
