import React, { useState, useEffect } from 'react';
import { Zap, Database, GitBranch, TrendingUp, CheckCircle, XCircle, Loader2, Play, BarChart3, Sparkles } from 'lucide-react';

// Types
interface AgentResult {
  agent_id: string;
  strategy: string;
  improvement_percent: number;
  optimized_code?: string;
  explanation?: string;
  error?: string;
  patterns_used?: string[];
}

interface Stats {
  forksCreated: number;
  completed: number;
  failed: number;
  avgImprovement: number;
}

interface WebSocketMessage {
  type: 'forks_created' | 'agent_completed' | 'complete' | 'error';
  count?: number;
  data?: AgentResult;
  best_result?: AgentResult;
  error?: string;
}

// Main App Component
export default function App() {
  const [activeView, setActiveView] = useState<'input' | 'optimizing' | 'results'>('input');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('sql');
  const [numAgents, setNumAgents] = useState(50);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [results, setResults] = useState<AgentResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [bestResult, setBestResult] = useState<AgentResult | null>(null);
  const [stats, setStats] = useState<Stats>({
    forksCreated: 0,
    completed: 0,
    failed: 0,
    avgImprovement: 0
  });

  // WebSocket connection
  useEffect(() => {
    if (!taskId) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/${taskId}`);
    
    ws.onmessage = (event) => {
      const msg: WebSocketMessage = JSON.parse(event.data);
      
      switch (msg.type) {
        case 'forks_created':
          setStats(prev => ({ ...prev, forksCreated: msg.count || 0 }));
          setActiveView('optimizing');
          break;
          
        case 'agent_completed':
          if (msg.data) {
            setResults(prev => {
              const newResults = [...prev, msg.data!];
              const completed = newResults.filter(r => !r.error).length;
              const failed = newResults.filter(r => r.error).length;
              const avgImprovement = newResults
                .filter(r => r.improvement_percent)
                .reduce((sum, r) => sum + r.improvement_percent, 0) / completed || 0;
              
              setStats({ forksCreated: stats.forksCreated, completed, failed, avgImprovement });
              return newResults;
            });
          }
          break;
          
        case 'complete':
          setIsComplete(true);
          if (msg.best_result) {
            setBestResult(msg.best_result);
          }
          setActiveView('results');
          break;
          
        case 'error':
          console.error('Optimization error:', msg.error);
          break;
      }
    };

    return () => ws.close();
  }, [taskId, stats.forksCreated]);

  const startOptimization = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, num_agents: numAgents }),
      });
      
      const data = await response.json();
      setTaskId(data.task_id);
    } catch (error) {
      console.error('Failed to start optimization:', error);
    }
  };

  const reset = () => {
    setActiveView('input');
    setTaskId(null);
    setResults([]);
    setIsComplete(false);
    setBestResult(null);
    setStats({ forksCreated: 0, completed: 0, failed: 0, avgImprovement: 0 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">ParallelProof</h1>
                  <p className="text-sm text-purple-300">Multi-Agent Code Optimizer</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center">
                <StatBadge icon={<Database className="w-4 h-4" />} label="Tiger Forks" value={stats.forksCreated} />
                <StatBadge icon={<GitBranch className="w-4 h-4" />} label="Agents" value={`${stats.completed}/${numAgents}`} />
                <StatBadge icon={<TrendingUp className="w-4 h-4" />} label="Avg Gain" value={`${stats.avgImprovement.toFixed(1)}%`} />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {activeView === 'input' && (
            <InputView
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={setLanguage}
              numAgents={numAgents}
              setNumAgents={setNumAgents}
              onStart={startOptimization}
            />
          )}
          
          {activeView === 'optimizing' && (
            <OptimizingView results={results} numAgents={numAgents} stats={stats} />
          )}
          
          {activeView === 'results' && (
            <ResultsView results={results} bestResult={bestResult} onReset={reset} />
          )}
        </main>
      </div>
    </div>
  );
}

// Input View Component
interface InputViewProps {
  code: string;
  setCode: (code: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  numAgents: number;
  setNumAgents: (num: number) => void;
  onStart: () => void;
}

function InputView({ code, setCode, language, setLanguage, numAgents, setNumAgents, onStart }: InputViewProps) {
  const examples: Record<string, string> = {
    sql: `SELECT u.*, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id
ORDER BY order_count DESC
LIMIT 1000;`,
    python: `def find_duplicates(items):
    duplicates = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j]:
                duplicates.append(items[i])
    return duplicates`,
    javascript: `function processData(data) {
    let result = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            if (data[i].id === data[j].parent_id) {
                result.push({ parent: data[i], child: data[j] });
            }
        }
    }
    return result;
}`
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-purple-300">Powered by Tiger Agentic Postgres</span>
        </div>
        
        <h2 className="text-5xl font-bold text-white">
          Optimize Code in <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Minutes</span>
        </h2>
        
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          50-100 AI agents explore optimization strategies simultaneously using zero-copy database forks
        </p>
      </div>

      {/* Main Input Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        {/* Language Tabs */}
        <div className="flex border-b border-white/10 bg-black/20">
          {['sql', 'python', 'javascript'].map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang);
                setCode(examples[lang]);
              }}
              className={`px-6 py-3 text-sm font-medium transition-all ${
                language === lang
                  ? 'text-white bg-white/10 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Code Editor */}
        <div className="relative">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here..."
            className="w-full h-96 p-6 bg-transparent text-white font-mono text-sm resize-none focus:outline-none"
            style={{ lineHeight: '1.6' }}
          />
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 rounded-lg text-xs text-gray-400">
            {code.split('\n').length} lines
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 sm:p-6 bg-black/20 border-t border-white/10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
              <div className="w-full sm:w-auto">
                <label className="block text-sm text-gray-400 mb-2">Number of Agents</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={numAgents}
                    onChange={(e) => setNumAgents(parseInt(e.target.value))}
                    className="w-48"
                    title="Number of AI agents to use"
                  />
                  <span className="text-white font-bold text-lg w-12">{numAgents}</span>
                </div>
              </div>
              
              <div className="text-sm text-gray-400 text-center sm:text-left">
                <div>Est. Time: <span className="text-white font-medium">2-3 min</span></div>
                <div>Fork Creation: <span className="text-white font-medium">~{numAgents * 2.5}s</span></div>
              </div>
            </div>

            <button
              onClick={onStart}
              disabled={!code.trim()}
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl overflow-hidden transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full sm:w-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                Start Optimization
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <FeatureCard
          icon={<Zap className="w-6 h-6" />}
          title="Zero-Copy Forks"
          description="2-3s fork creation vs 5-10min traditional"
          color="purple"
        />
        <FeatureCard
          icon={<GitBranch className="w-6 h-6" />}
          title="Parallel Agents"
          description="50-100 strategies explored simultaneously"
          color="blue"
        />
        <FeatureCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Proven Results"
          description="14.6-30.9% average performance gain"
          color="green"
        />
      </div>
    </div>
  );
}

// Optimizing View Component
interface OptimizingViewProps {
  results: AgentResult[];
  numAgents: number;
  stats: Stats;
}

function OptimizingView({ results, numAgents, stats }: OptimizingViewProps) {
  const progress = (results.length / numAgents) * 100;
  
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Optimization in Progress</h2>
            <p className="text-gray-400">
              {results.length} / {numAgents} agents completed
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{progress.toFixed(0)}%</div>
              <div className="text-sm text-gray-400">Complete</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <StatCard label="Successful" value={stats.completed} color="green" />
          <StatCard label="Failed" value={stats.failed} color="red" />
          <StatCard label="Avg Improvement" value={`${stats.avgImprovement.toFixed(1)}%`} color="blue" />
        </div>
      </div>

      {/* Agent Results Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {results.map((result, idx) => (
          <AgentCard key={idx} result={result} index={idx} />
        ))}
        
        {/* Loading Placeholders */}
        {Array.from({ length: numAgents - results.length }).map((_, idx) => (
          <div
            key={`loading-${idx}`}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center justify-center"
          >
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Results View Component
interface ResultsViewProps {
  results: AgentResult[];
  bestResult: AgentResult | null;
  onReset: () => void;
}

function ResultsView({ results, bestResult, onReset }: ResultsViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentResult | null>(bestResult);
  const successful = results.filter(r => !r.error);
  const sortedResults = [...successful].sort((a, b) => b.improvement_percent - a.improvement_percent);

  return (
    <div className="space-y-6">
      {/* Winner Card */}
      {bestResult && (
        <div className="relative bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border-2 border-yellow-500/50 rounded-2xl p-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full mb-3">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-300 font-medium">Best Result</span>
                </div>
                
                <h2 className="text-4xl font-bold text-white mb-2">{bestResult.strategy}</h2>
                <p className="text-gray-300">{bestResult.explanation || 'Optimization completed successfully'}</p>
              </div>
              
              <div className="text-right">
                <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-400">
                  {bestResult.improvement_percent.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400 mt-2">Performance Gain</div>
              </div>
            </div>

            {bestResult.optimized_code && (
              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Optimized Code</span>
                  <button className="text-xs text-purple-400 hover:text-purple-300">Copy</button>
                </div>
                <pre className="text-sm text-white font-mono overflow-x-auto">
                  {bestResult.optimized_code.substring(0, 200)}...
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-black/20">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              All Results
            </h3>
          </div>
          
          <div className="divide-y divide-white/10">
            {sortedResults.slice(0, 10).map((result, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAgent(result)}
                className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {idx + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{result.strategy}</div>
                  <div className="text-sm text-gray-400">{result.agent_id}</div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold text-green-400">
                    +{result.improvement_percent.toFixed(1)}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Details Panel */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Details</h3>
          
          {selectedAgent ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Strategy</div>
                <div className="text-white font-medium">{selectedAgent.strategy}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-400 mb-1">Agent ID</div>
                <div className="text-white font-mono text-sm">{selectedAgent.agent_id}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-400 mb-1">Improvement</div>
                <div className="text-3xl font-bold text-green-400">
                  {selectedAgent.improvement_percent.toFixed(1)}%
                </div>
              </div>
              
              {selectedAgent.patterns_used && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">Patterns Used</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.patterns_used.map((pattern, idx) => (
                      <span key={idx} className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-300">
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              Select a result to view details
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={onReset}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
        >
          Optimize New Code
        </button>
        
        <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-xl transition-all">
          Export Results
        </button>
      </div>
    </div>
  );
}

// Utility Components
interface StatBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatBadge({ icon, label, value }: StatBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
      <div className="text-purple-400">{icon}</div>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-sm font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: 'green' | 'red' | 'blue';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colors = {
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400',
    red: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'purple' | 'blue' | 'green';
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  const colors = {
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} backdrop-blur-xl border rounded-xl p-6`}>
      <div className="mb-3 text-white">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-300">{description}</p>
    </div>
  );
}

interface AgentCardProps {
  result: AgentResult;
  index: number;
}

function AgentCard({ result, index }: AgentCardProps) {
  const isSuccess = !result.error;
  
  return (
    <div
      className={`bg-white/5 backdrop-blur-xl border rounded-xl p-4 transition-all hover:scale-105 ${
        isSuccess 
          ? 'border-green-500/30 hover:border-green-500/50' 
          : 'border-red-500/30 hover:border-red-500/50'
      }`}
      style={{ animationDelay: `${index * 20}ms` }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs text-gray-400 truncate flex-1">{result.strategy}</div>
        {isSuccess ? (
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        )}
      </div>
      
      {isSuccess ? (
        <div className="text-2xl font-bold text-green-400">
          +{result.improvement_percent.toFixed(1)}%
        </div>
      ) : (
        <div className="text-xs text-red-400 line-clamp-2">{result.error}</div>
      )}
    </div>
  );
}
