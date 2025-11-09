import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface OptimizeRequest {
  code: string;
  language: string;
  num_agents: number;
}

interface AgentResult {
  agent_id: string;
  strategy: string;
  optimized_code: string | null;
  improvement_percent: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message: string | null;
}

interface OptimizeResponse {
  task_id: string;
  status: string;
  agent_results: AgentResult[];
}

function App() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [numAgents, setNumAgents] = useState(5);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [bestResult, setBestResult] = useState<AgentResult | null>(null);

  // WebSocket connection
  useEffect(() => {
    if (!taskId) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/${taskId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'agent_update') {
        const agentResult: AgentResult = data.agent_result;
        
        setAgentResults((prev) => {
          const existing = prev.find((r) => r.agent_id === agentResult.agent_id);
          if (existing) {
            return prev.map((r) =>
              r.agent_id === agentResult.agent_id ? agentResult : r
            );
          }
          return [...prev, agentResult];
        });

        if (agentResult.status === 'completed') {
          setCompletedCount((prev) => prev + 1);
        }
      } else if (data.type === 'task_complete') {
        // Find best result
        const completed = agentResults.filter((r) => r.status === 'completed');
        if (completed.length > 0) {
          const best = completed.reduce((max, r) =>
            r.improvement_percent > max.improvement_percent ? r : max
          );
          setBestResult(best);
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [taskId, agentResults]);

  const handleSubmit = async () => {
    if (!code.trim()) return;

    setIsSubmitting(true);
    setAgentResults([]);
    setCompletedCount(0);
    setBestResult(null);

    try {
      const response = await fetch('http://localhost:8000/api/v1/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          num_agents: numAgents,
        } as OptimizeRequest),
      });

      const data: OptimizeResponse = await response.json();
      setTaskId(data.task_id);
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTaskId(null);
    setAgentResults([]);
    setCompletedCount(0);
    setBestResult(null);
    setCode('');
  };

  const sortedResults = [...agentResults].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return -1;
    if (a.status !== 'completed' && b.status === 'completed') return 1;
    if (a.status === 'completed' && b.status === 'completed') {
      return b.improvement_percent - a.improvement_percent;
    }
    return 0;
  });

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0A1929] via-[#1A2332] to-[#0A1929] overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A1929]/80 backdrop-blur-lg border-b border-[#FF6B35]/20 w-full">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF6B35] via-[#FF8C42] to-[#00B4D8] bg-clip-text text-transparent">
                ParallelProof
              </h1>
              <p className="text-sm text-[#E9ECEF]/60 mt-1">
                Powered by Tiger Cloud's Zero-Copy Forks ⚡
              </p>
            </div>
            {taskId && (
              <div className="text-right">
                <div className="text-sm text-[#E9ECEF]/60">Progress</div>
                <div className="text-2xl font-bold text-[#00B4D8]">
                  {completedCount}/{numAgents}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Best Result Banner */}
        <AnimatePresence>
          {bestResult && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="mb-8 p-6 rounded-xl bg-gradient-to-r from-[#06FFA5]/10 to-[#00D9A3]/10 border-2 border-[#06FFA5] max-w-6xl mx-auto"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-[#06FFA5] to-[#00D9A3] flex items-center justify-center">
                  <span className="text-3xl">🏆</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[#06FFA5] mb-1">
                    Best Result Found!
                  </h2>
                  <p className="text-[#E9ECEF]/80">
                    Strategy: <span className="text-[#00B4D8] font-semibold">{bestResult.strategy}</span>
                  </p>
                  <p className="text-[#E9ECEF]/80">
                    Improvement: <span className="text-[#06FFA5] font-bold text-xl">{bestResult.improvement_percent.toFixed(1)}%</span>
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-semibold shadow-lg shadow-[#FF6B35]/30"
                >
                  New Task
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Section */}
        {!taskId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 max-w-6xl mx-auto"
          >
            <div className="bg-gradient-to-br from-[#1A2332] to-[#0A1929] rounded-xl p-8 border border-[#FF6B35]/20 shadow-xl">
              <h2 className="text-2xl font-bold text-[#F8F9FA] mb-6">
                Submit Code for Optimization
              </h2>

              {/* Code Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#FF6B35] mb-2">
                  Your Code
                </label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste your code here..."
                  className="w-full h-64 px-4 py-3 bg-[#0A1929] border-2 border-[#4A148C]/40 rounded-lg text-[#F8F9FA] font-mono text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/30 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Language Selector */}
                <div>
                  <label className="block text-sm font-semibold text-[#00B4D8] mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A1929] border-2 border-[#00B4D8]/40 rounded-lg text-[#F8F9FA] font-semibold focus:outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/30 transition-all"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="sql">SQL</option>
                    <option value="java">Java</option>
                  </select>
                </div>

                {/* Agent Count */}
                <div>
                  <label className="block text-sm font-semibold text-[#6A1B9A] mb-2">
                    Number of Agents
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={numAgents}
                      onChange={(e) => setNumAgents(parseInt(e.target.value))}
                      className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #FF6B35 0%, #6A1B9A 50%, #00B4D8 100%)`,
                      }}
                    />
                    <div className="text-4xl font-bold bg-gradient-to-r from-[#FF6B35] to-[#6A1B9A] bg-clip-text text-transparent">
                      {numAgents}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isSubmitting || !code.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] hover:from-[#FF8C42] hover:to-[#FF6B35] text-white text-xl font-bold shadow-lg shadow-[#FF6B35]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-3 border-white border-t-transparent rounded-full"
                    />
                    Starting Optimization...
                  </span>
                ) : (
                  '🚀 Start Optimization'
                )}
              </motion.button>

              {/* Info */}
              <p className="mt-4 text-center text-sm text-[#E9ECEF]/60">
                Each agent tests a different optimization strategy in parallel using Tiger's zero-copy forks
              </p>
            </div>
          </motion.div>
        )}

        {/* Agent Results Grid */}
        {taskId && agentResults.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-[#F8F9FA] mb-6">
              Agent Results ({completedCount}/{numAgents} Complete)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {sortedResults.map((result, idx) => (
                  <motion.div
                    key={result.agent_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className={`p-6 rounded-xl border-2 ${
                      result.status === 'completed'
                        ? 'bg-gradient-to-br from-[#1A2332] to-[#0A1929] border-[#06FFA5]'
                        : result.status === 'failed'
                        ? 'bg-gradient-to-br from-[#1A2332] to-[#0A1929] border-red-500/50'
                        : 'bg-gradient-to-br from-[#1A2332] to-[#0A1929] border-[#00B4D8]/30'
                    } shadow-lg transition-all`}
                  >
                    {/* Status Icon */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-[#E9ECEF]/60">
                        Agent #{result.agent_id}
                      </span>
                      {result.status === 'completed' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                          className="w-8 h-8 rounded-full bg-[#06FFA5] flex items-center justify-center"
                        >
                          <span className="text-lg">✓</span>
                        </motion.div>
                      )}
                      {result.status === 'running' && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-8 h-8 rounded-full border-3 border-[#00B4D8] border-t-transparent"
                        />
                      )}
                      {result.status === 'failed' && (
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-lg">✗</span>
                        </div>
                      )}
                      {result.status === 'pending' && (
                        <div className="w-8 h-8 rounded-full border-2 border-[#E9ECEF]/30" />
                      )}
                    </div>

                    {/* Strategy */}
                    <h3 className="text-lg font-bold text-[#F8F9FA] mb-2 line-clamp-2">
                      {result.strategy}
                    </h3>

                    {/* Improvement */}
                    {result.status === 'completed' && (
                      <div className="mt-4">
                        <div className="text-sm text-[#E9ECEF]/60 mb-1">Improvement</div>
                        <div className="text-3xl font-bold text-[#00B4D8]">
                          {result.improvement_percent.toFixed(1)}%
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {result.status === 'failed' && result.error_message && (
                      <p className="text-sm text-red-400 mt-2 line-clamp-2">
                        {result.error_message}
                      </p>
                    )}

                    {/* Status Text */}
                    {result.status === 'running' && (
                      <p className="text-sm text-[#00B4D8] mt-2">Optimizing...</p>
                    )}
                    {result.status === 'pending' && (
                      <p className="text-sm text-[#E9ECEF]/60 mt-2">Waiting...</p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Loading State */}
        {taskId && agentResults.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 max-w-2xl mx-auto"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-[#FF6B35] border-t-transparent"
            />
            <h3 className="text-2xl font-bold text-[#F8F9FA] mb-2">
              Initializing Agents...
            </h3>
            <p className="text-[#E9ECEF]/60">
              Creating {numAgents} zero-copy database forks
            </p>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-[#FF6B35]/20 w-full">
        <div className="w-full px-6 text-center">
          <p className="text-sm text-[#E9ECEF]/60">
            Parallel code optimization powered by{' '}
            <span className="text-[#FF6B35] font-semibold">Tiger Cloud</span>'s instant database forks
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

