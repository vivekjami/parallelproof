"""Agent optimization strategies"""
from dataclasses import dataclass
from enum import Enum


class StrategyCategory(str, Enum):
    """Categories of optimization strategies"""
    ALGORITHMIC = "algorithmic"
    DATABASE = "database"
    CACHING = "caching"
    DATA_STRUCTURES = "data_structures"
    PARALLELIZATION = "parallelization"
    MEMORY = "memory"


@dataclass
class OptimizationStrategy:
    """Represents an optimization strategy for agents"""
    name: str
    category: StrategyCategory
    prompt_template: str


# Define all optimization strategies
STRATEGIES = [
    OptimizationStrategy(
        name="Database Index Optimization",
        category=StrategyCategory.DATABASE,
        prompt_template="""Optimize this SQL query by adding appropriate indexes:

{code}

Requirements:
1. Use CREATE INDEX CONCURRENTLY to avoid locking
2. Consider composite indexes for multi-column queries
3. Analyze JOIN operations and WHERE clauses

Return ONLY valid JSON (no markdown, no code blocks):
{{"optimized_code": "...", "explanation": "...", "improvement": "..."}}"""
    ),
    
    OptimizationStrategy(
        name="Algorithm Complexity Reduction",
        category=StrategyCategory.ALGORITHMIC,
        prompt_template="""Reduce the computational complexity of this code:

{code}

Requirements:
1. Identify current complexity (Big O notation)
2. Apply algorithmic optimizations (better data structures, algorithms)
3. Reduce nested loops where possible

Return ONLY valid JSON (no markdown, no code blocks):
{{"optimized_code": "...", "complexity_before": "...", "complexity_after": "...", "improvement": "..."}}"""
    ),
    
    OptimizationStrategy(
        name="LRU Cache Implementation",
        category=StrategyCategory.CACHING,
        prompt_template="""Add LRU caching to eliminate redundant computations:

{code}

Requirements:
1. Identify repeated function calls or computations
2. Implement appropriate cache size based on use case
3. Use @lru_cache or similar caching mechanism

Return ONLY valid JSON (no markdown, no code blocks):
{{"optimized_code": "...", "cache_strategy": "...", "improvement": "..."}}"""
    ),
    
    OptimizationStrategy(
        name="Hash Map Optimization",
        category=StrategyCategory.DATA_STRUCTURES,
        prompt_template="""Replace nested loops with hash map lookups:

{code}

Requirements:
1. Identify O(n²) operations in nested loops
2. Use hash maps/dictionaries for O(1) lookups
3. Maintain correctness while improving performance

Return ONLY valid JSON (no markdown, no code blocks):
{{"optimized_code": "...", "complexity_improvement": "...", "improvement": "..."}}"""
    ),
    
    OptimizationStrategy(
        name="Async/Await Parallelization",
        category=StrategyCategory.PARALLELIZATION,
        prompt_template="""Convert to async/await for concurrent execution:

{code}

Requirements:
1. Identify I/O-bound operations that can run concurrently
2. Implement async/await properly with asyncio.gather
3. Handle errors appropriately

Return ONLY valid JSON (no markdown, no code blocks):
{{"optimized_code": "...", "concurrency_improvement": "...", "improvement": "..."}}"""
    ),
    
    OptimizationStrategy(
        name="Memory Optimization with Generators",
        category=StrategyCategory.MEMORY,
        prompt_template="""Optimize memory usage using generators and streaming:

{code}

Requirements:
1. Replace lists with generators where possible
2. Implement streaming for large datasets
3. Use yield instead of return for iterables

Return ONLY valid JSON (no markdown, no code blocks):
{{"optimized_code": "...", "memory_savings": "...", "improvement": "..."}}"""
    ),
    
    OptimizationStrategy(
        name="Batch Processing",
        category=StrategyCategory.ALGORITHMIC,
        prompt_template="""Optimize by processing records in batches:

{code}

Requirements:
1. Group operations into batches to reduce overhead
2. Choose optimal batch size (e.g., 1000 records)
3. Maintain data integrity

Return ONLY valid JSON (no markdown, no code blocks):
{{"optimized_code": "...", "batch_size": "...", "improvement": "..."}}"""
    ),
    
    OptimizationStrategy(
        name="Connection Pooling",
        category=StrategyCategory.DATABASE,
        prompt_template="""Implement connection pooling for database operations:

{code}

Requirements:
1. Replace individual connections with connection pool
2. Set appropriate pool size (min_size=10, max_size=50)
3. Handle connection lifecycle properly

Return ONLY valid JSON (no markdown, no code blocks):
{{"optimized_code": "...", "pool_config": "...", "improvement": "..."}}"""
    ),
]
