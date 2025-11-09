import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startOptimization } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';

export function Dashboard() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('sql');
  const [numAgents, setNumAgents] = useState(5);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { agentResults, bestResult, status } = useWebSocket(taskId);

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

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 50%, #f0f9ff 100%)' 
    }}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <h1 className="text-7xl font-bold mb-4 gradient-text">
            ParallelProof
          </h1>
          <p className="text-2xl text-gray-700 max-w-3xl leading-relaxed">
            Experience the power of <span className="font-bold" style={{ color: '#ff6b00' }}>Tiger Cloud's Agentic PostgreSQL</span>—where 
            instant zero-copy database forks enable parallel AI agents to optimize your code simultaneously.
          </p>
          
          <div className="mt-8 animated-border">
            <div className="animated-border-content">
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#ff6b00' }}>
                How It Works
              </h2>
              <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-700 leading-relaxed">
                <div className="card-hover p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg">
                  <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <span>1. Zero-Copy Forks</span>
                  </div>
                  <p>Tiger creates isolated database environments in <strong className="gradient-text">2-3 seconds</strong> using copy-on-write technology. No data duplication.</p>
                </div>
                <div className="card-hover p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg">
                  <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-2xl">🤖</span>
                    <span>2. Parallel Agents</span>
                  </div>
                  <p>Each agent explores different optimization strategies simultaneously in its own fork. <strong style={{ color: '#0066ff' }}>5-100 agents</strong> work together.</p>
                </div>
                <div className="card-hover p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg">
                  <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-2xl">🎯</span>
                    <span>3. Best Result</span>
                  </div>
                  <p>Hybrid search (BM25 + vector embeddings) finds proven patterns. <strong style={{ color: '#a855f7' }}>Gemini AI</strong> applies them. You get the best optimization.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        {!taskId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Code Input */}
              <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-transparent hover:border-orange-200 transition-all card-hover tiger-stripes">
                <label className="block text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#ff6b00' }}>
                  Your Code
                </label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-80 bg-gray-50 text-gray-900 rounded-lg p-6 font-mono text-sm border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:outline-none resize-none transition-all"
                  placeholder="SELECT * FROM users WHERE id = 123;&#10;&#10;for i in range(len(items)):&#10;    if items[i].id == target_id:&#10;        return items[i]&#10;&#10;// Paste any code that needs optimization..."
                  required
                  style={{ 
                    boxShadow: code ? '0 0 0 2px rgba(255, 107, 0, 0.1)' : 'none' 
                  }}
                />
              </div>

              {/* Settings */}
              <div className="grid md:grid-cols-2 gap-8">
                
                {/* Language Select */}
                <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-transparent hover:border-blue-200 transition-all card-hover">
                  <label htmlFor="language-select" className="block text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#0066ff' }}>
                    Language
                  </label>
                  <select
                    id="language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-gradient-to-br from-gray-50 to-white text-gray-900 rounded-lg p-4 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all text-base font-medium cursor-pointer"
                  >
                    <option value="sql">SQL</option>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>

                {/* Number of Agents */}
                <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-transparent hover:border-purple-200 transition-all card-hover">
                  <label htmlFor="num-agents" className="block text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#a855f7' }}>
                    Parallel Agents
                  </label>
                  <div className="flex items-center gap-4 mb-2">
                    <input
                      id="num-agents"
                      type="range"
                      min="1"
                      max="10"
                      value={numAgents}
                      onChange={(e) => setNumAgents(parseInt(e.target.value))}
                      className="flex-1 h-3 bg-gradient-to-r from-orange-200 via-purple-200 to-blue-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        accentColor: '#ff6b00',
                      }}
                      aria-label="Number of agents"
                    />
                    <span className="text-4xl font-bold gradient-text w-16 text-right">{numAgents}</span>
                  </div>
                  <div className="progress-bar mt-3"></div>
                  <p className="text-sm text-gray-600 mt-4 leading-relaxed">
                    Each agent runs in its own <strong className="gradient-text">zero-copy database fork</strong>, exploring different optimization strategies simultaneously.
                  </p>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border-l-4 border-red-600 rounded-lg p-5"
                >
                  <p className="text-red-900 font-medium">{error}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting || !code}
                whileHover={{ scale: isSubmitting || !code ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting || !code ? 1 : 0.98 }}
                className="w-full btn-tiger text-lg relative overflow-hidden"
                style={{
                  background: isSubmitting || !code 
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' 
                    : 'linear-gradient(135deg, #ff6b00 0%, #e65100 100%)',
                  boxShadow: isSubmitting || !code 
                    ? 'none' 
                    : '0 4px 14px rgba(255, 107, 0, 0.4), 0 0 20px rgba(255, 107, 0, 0.2)',
                }}
              >
                <span className={isSubmitting ? 'shimmer' : ''}>
                  {isSubmitting ? '⚡ Creating database forks and starting agents...' : '🚀 Start Optimization'}
                </span>
              </motion.button>
              
              <p className="text-center text-sm text-gray-600">
                Powered by <strong className="gradient-text">Tiger Agentic PostgreSQL</strong> with <strong style={{ color: '#0066ff' }}>Google Gemini AI</strong>
              </p>
            </form>
          </motion.div>
        ) : (
          <div className="space-y-8">
            
            {/* Status Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-lg p-6 shadow-lg border-2 glow-orange"
              style={{
                borderColor: status === 'completed' ? '#10b981' :
                            status === 'failed' ? '#ef4444' :
                            status === 'running' ? '#0066ff' :
                            '#e5e5e5'
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded-full relative ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'failed' ? 'bg-red-500' :
                    status === 'running' ? 'bg-blue-500 status-running' :
                    'bg-gray-400'
                  }`} />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#ff6b00' }}>
                      Task Status
                    </div>
                    <div className="text-3xl font-bold text-gray-900 capitalize">
                      {status === 'running' ? '⚡ ' : ''}{status}
                    </div>
                  </div>
                </div>
                <motion.button
                  onClick={handleReset}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-gray-100 to-gray-200 hover:from-orange-50 hover:to-orange-100 text-gray-700 hover:text-orange-700 font-semibold px-6 py-3 rounded-lg transition-all shadow-md"
                >
                  🔄 New Optimization
                </motion.button>
              </div>
              <div className="mt-4 pt-4 border-t-2 border-gray-100">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Task ID:</span> <code className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs border border-orange-200">{taskId}</code>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-600">Agents:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                      style={{ width: `${(agentResults.length / numAgents) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold gradient-text">{agentResults.length} / {numAgents}</span>
                </div>
              </div>
            </motion.div>

            {/* Agent Results */}
            {agentResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    Optimization Results
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-6">
                    Each agent explored your code in an isolated database fork, applying different optimization strategies.
                    Below are the results ranked by improvement potential.
                  </p>
                </div>

                {/* Agent Cards */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {agentResults
                      .sort((a, b) => b.improvement_percent - a.improvement_percent)
                      .map((result, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`bg-white rounded-lg p-6 shadow-sm border-2 ${
                          bestResult?.agent_id === result.agent_id 
                            ? 'border-orange-500' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Agent {result.agent_id}
                              </span>
                              {bestResult?.agent_id === result.agent_id && (
                                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded">
                                  BEST RESULT
                                </span>
                              )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {result.strategy}
                            </h3>
                            <div className="flex gap-6 text-sm">
                              <div>
                                <span className="text-gray-500">Improvement:</span>{' '}
                                <span className="font-bold text-green-600">
                                  +{result.improvement_percent.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCopyCode(result.optimized_code || '')}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition text-sm"
                          >
                            Copy Code
                          </button>
                        </div>
                        
                        {result.optimized_code && (
                          <div className="mt-4">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Optimized Code
                            </div>
                            <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-sm border border-gray-200">
                              <code className="text-gray-800">{result.optimized_code}</code>
                            </pre>
                          </div>
                        )}
                        
                        {result.error_message && (
                          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-600 rounded">
                            <p className="text-sm text-red-900">
                              <span className="font-semibold">Error:</span> {result.error_message}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Loading State */}
            {agentResults.length === 0 && (status === 'pending' || status === 'running') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-lg p-12 shadow-lg border-2 border-blue-200 text-center float"
              >
                <div className="w-20 h-20 mx-auto mb-6 spinner glow-blue"></div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">
                  ⚡ Agents are working...
                </h3>
                <p className="text-gray-600 max-w-lg mx-auto leading-relaxed text-lg">
                  <strong className="gradient-text">Tiger Cloud</strong> is creating <strong>{numAgents}</strong> zero-copy database forks. Each agent is exploring 
                  different optimization strategies in parallel. Results will appear as they complete.
                </p>
                <div className="mt-6 flex justify-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </motion.div>
            )}

            {/* Completed State */}
            {status === 'completed' && agentResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border-l-4 border-green-600 rounded-lg p-6"
              >
                <h3 className="text-lg font-bold text-green-900 mb-2">
                  Optimization Complete
                </h3>
                <p className="text-green-800">
                  All {agentResults.length} agents have finished analyzing your code. Review the results above to find the best optimization.
                </p>
              </motion.div>
            )}

            {/* Failed State */}
            {status === 'failed' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border-l-4 border-red-600 rounded-lg p-6"
              >
                <h3 className="text-lg font-bold text-red-900 mb-2">
                  Optimization Failed
                </h3>
                <p className="text-red-800">
                  The optimization process encountered an error. Please try again with different code or settings.
                </p>
              </motion.div>
            )}
            
            {/* Tiger Cloud Promotion */}
            {agentResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-orange-50 via-white to-blue-50 rounded-lg p-8 border-2 shadow-lg glow-orange"
                style={{ borderColor: '#ff6b00' }}
              >
                <h2 className="text-3xl font-bold mb-6 gradient-text">
                  ⚡ Why This Is Fast
                </h2>
                <div className="space-y-4 text-gray-700 leading-relaxed text-lg">
                  <p>
                    <strong className="font-bold" style={{ color: '#ff6b00' }}>Tiger's Agentic PostgreSQL</strong> uses 
                    zero-copy fork technology to create isolated database environments in <strong className="gradient-text">2-3 seconds</strong>—not 
                    the <span className="line-through text-gray-400">5-10 minutes</span> traditional database copies require.
                  </p>
                  <p>
                    Instead of duplicating data, <strong style={{ color: '#0066ff' }}>Tiger's Fluid Storage</strong> layer uses copy-on-write semantics. 
                    Each fork shares the same underlying blocks until changes occur, saving <strong className="text-green-600">massive amounts 
                    of storage and time</strong>.
                  </p>
                  <p>
                    This enables true parallel exploration: <strong className="gradient-text">{numAgents} AI agents</strong> working simultaneously, 
                    each with its own isolated database, completing in <strong>minutes</strong> what would traditionally take <strong className="line-through text-gray-400">hours</strong>.
                  </p>
                  <div className="pt-6 mt-6 border-t-2 border-orange-200">
                    <a 
                      href="https://www.tigerdata.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block btn-tiger"
                    >
                      🐅 Learn More About Tiger Cloud
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
