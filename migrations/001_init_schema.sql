-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vectorscale CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optimization patterns table
CREATE TABLE IF NOT EXISTS optimization_patterns (
    id SERIAL PRIMARY KEY,
    pattern_name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    code_example TEXT,
    embedding vector(768),  -- Gemini embedding dimensions
    language TEXT DEFAULT 'sql',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for optimization patterns
CREATE INDEX IF NOT EXISTS idx_patterns_fts ON optimization_patterns 
    USING GIN (to_tsvector('english', description || ' ' || pattern_name));

CREATE INDEX IF NOT EXISTS idx_patterns_vector ON optimization_patterns 
    USING diskann (embedding);

CREATE INDEX IF NOT EXISTS idx_patterns_category ON optimization_patterns(category);

-- Agent results table
CREATE TABLE IF NOT EXISTS agent_results (
    id SERIAL PRIMARY KEY,
    task_id TEXT NOT NULL,
    fork_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    strategy TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    original_code TEXT NOT NULL,
    optimized_code TEXT,
    performance_before JSONB,
    performance_after JSONB,
    improvement_percent NUMERIC,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_results_task_id ON agent_results(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_results_improvement ON agent_results(improvement_percent DESC);
CREATE INDEX IF NOT EXISTS idx_agent_results_status ON agent_results(status);

-- Optimization tasks table
CREATE TABLE IF NOT EXISTS optimization_tasks (
    id TEXT PRIMARY KEY,
    original_code TEXT NOT NULL,
    language TEXT NOT NULL,
    num_agents INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    best_result_id INTEGER REFERENCES agent_results(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON optimization_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON optimization_tasks(created_at DESC);

-- Seed data
INSERT INTO optimization_patterns (pattern_name, category, description, code_example, tags) VALUES
('Composite Index', 'database', 'Create composite index for JOIN performance', 
 'CREATE INDEX CONCURRENTLY idx_user_orders ON orders(user_id, created_at);',
 ARRAY['index', 'join', 'performance']),
 
('HashMap Lookup', 'algorithmic', 'Replace nested loops with HashMap for O(1) lookup',
 'lookup = {item.id: item for item in items}',
 ARRAY['algorithm', 'data-structure', 'complexity']),
 
('Query Optimization', 'database', 'Optimize SELECT statements with proper filtering',
 'SELECT id, name FROM users WHERE active = true AND created_at > NOW() - INTERVAL ''30 days'';',
 ARRAY['query', 'filter', 'performance']),
 
('Batch Processing', 'algorithmic', 'Process records in batches instead of one-by-one',
 'for batch in chunks(items, 1000): process_batch(batch)',
 ARRAY['batch', 'efficiency', 'throughput']),
 
('Connection Pooling', 'database', 'Use connection pooling for database connections',
 'pool = await asyncpg.create_pool(dsn, min_size=10, max_size=50)',
 ARRAY['connection', 'pooling', 'scalability']),
 
('Memoization', 'caching', 'Cache function results to avoid recomputation',
 '@lru_cache(maxsize=128)\ndef expensive_function(arg): return compute(arg)',
 ARRAY['cache', 'memoization', 'performance'])
ON CONFLICT DO NOTHING;
