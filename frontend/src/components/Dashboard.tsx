// Dashboard component for ParallelProof

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Code2, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Send,
  Copy,
  Award
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { startOptimization } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';

export function Dashboard() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [numAgents, setNumAgents] = useState(5);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { agentResults, bestResult, status, isConnected } = useWebSocket(taskId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await startOptimization({
        code,
        language,
        num_agents: numAgents,
      });

      setTaskId(response.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start optimization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleReset = () => {
    setTaskId(null);
    setCode('');
    setError(null);
  };

  // Prepare data for the chart
  const chartData = agentResults.map((result) => ({
    name: result.strategy_name,
    improvement: result.improvement_percent,
    confidence: result.confidence * 100,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-12 h-12 text-yellow-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ParallelProof
            </h1>
          </div>
          <p className="text-xl text-gray-300">
            Multi-Agent Code Optimization with Tiger Agentic Postgres
          </p>
        </motion.div>

        {/* Main Content */}
        {!taskId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Code Input */}
              <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
                <label className="flex items-center gap-2 text-lg font-semibold mb-3">
                  <Code2 className="w-5 h-5 text-blue-400" />
                  Code to Optimize
                </label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-64 bg-slate-900 text-white rounded-lg p-4 font-mono text-sm border border-slate-700 focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Enter your code here..."
                  required
                />
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Language Select */}
                <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
                  <label htmlFor="language-select" className="block text-lg font-semibold mb-3">
                    Language
                  </label>
                  <select
                    id="language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="sql">SQL</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>

                {/* Number of Agents */}
                <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
                  <label htmlFor="num-agents" className="block text-lg font-semibold mb-3">
                    Number of Agents: {numAgents}
                  </label>
                  <input
                    id="num-agents"
                    type="range"
                    min="1"
                    max="10"
                    value={numAgents}
                    onChange={(e) => setNumAgents(parseInt(e.target.value))}
                    className="w-full"
                    aria-label="Number of agents"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-2">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center gap-3"
                >
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting || !code}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg shadow-lg flex items-center justify-center gap-3 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Starting Optimization...
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    Optimize Code
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Status Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-800 rounded-lg p-6 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-lg">
                    Status: <span className="font-bold capitalize">{status}</span>
                  </span>
                </div>
                <motion.button
                  onClick={handleReset}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg"
                >
                  New Optimization
                </motion.button>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Task ID: {taskId}
              </div>
            </motion.div>

            {/* Agent Results */}
            {agentResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-800 rounded-lg p-6 shadow-xl"
              >
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  Agent Results ({agentResults.length})
                </h2>

                {/* Chart */}
                <div className="mb-6 bg-slate-900 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#9CA3AF" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="improvement" fill="#3B82F6" name="Improvement %" />
                      <Bar dataKey="confidence" fill="#10B981" name="Confidence %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Agent Cards */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {agentResults.map((result, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-slate-900 rounded-lg p-4 border border-slate-700"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              Agent {result.agent_id}: {result.strategy_name}
                              {bestResult?.agent_id === result.agent_id && (
                                <Award className="w-5 h-5 text-yellow-400" />
                              )}
                            </h3>
                            <div className="flex gap-4 mt-1 text-sm">
                              <span className="text-green-400">
                                ↑ {result.improvement_percent.toFixed(1)}% improvement
                              </span>
                              <span className="text-blue-400">
                                {(result.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCopyCode(result.optimized_code)}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Copy code"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{result.explanation}</p>
                        <pre className="bg-slate-950 rounded p-3 overflow-x-auto text-sm border border-slate-700">
                          <code>{result.optimized_code}</code>
                        </pre>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Best Result */}
            {bestResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-500 rounded-lg p-6 shadow-xl"
              >
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-yellow-400" />
                  Best Optimization
                </h2>
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">
                        Agent {bestResult.agent_id}: {bestResult.strategy_name}
                      </h3>
                      <div className="flex gap-4 mt-1">
                        <span className="text-green-400 font-bold">
                          ↑ {bestResult.improvement_percent.toFixed(1)}% improvement
                        </span>
                        <span className="text-blue-400">
                          {(bestResult.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyCode(bestResult.optimized_code)}
                      className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Copy code"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-gray-300 mb-3">{bestResult.explanation}</p>
                  <pre className="bg-slate-950 rounded p-4 overflow-x-auto border border-slate-700">
                    <code>{bestResult.optimized_code}</code>
                  </pre>
                </div>
              </motion.div>
            )}

            {/* Loading State */}
            {agentResults.length === 0 && status === 'pending' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-800 rounded-lg p-12 shadow-xl text-center"
              >
                <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-blue-400" />
                <p className="text-xl">Agents are analyzing your code...</p>
                <p className="text-gray-400 mt-2">This may take a few moments</p>
              </motion.div>
            )}

            {/* Completed State */}
            {status === 'completed' && agentResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-900/30 border border-green-500 rounded-lg p-6 flex items-center gap-3"
              >
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <span className="text-lg">Optimization completed successfully!</span>
              </motion.div>
            )}

            {/* Failed State */}
            {status === 'failed' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/30 border border-red-500 rounded-lg p-6 flex items-center gap-3"
              >
                <XCircle className="w-6 h-6 text-red-400" />
                <span className="text-lg">Optimization failed. Please try again.</span>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
