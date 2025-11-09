// API client for ParallelProof backend

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface OptimizationRequest {
  code: string;
  language: string;
  num_agents?: number;
}

export interface OptimizationResponse {
  task_id: string;
  status: string;
  num_agents: number;
  websocket_url: string;
  message: string;
}

export interface AgentResult {
  agent_id: string;
  strategy: string;
  optimized_code: string | null;
  improvement_percent: number;
  status: string;
  error_message: string | null;
}

export interface TaskStatus {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  language: string;
  num_agents: number;
  created_at: string;
  completed_at?: string;
  agent_results: AgentResult[];
  best_result?: AgentResult;
}

export async function startOptimization(
  request: OptimizationRequest
): Promise<OptimizationResponse> {
  const response = await fetch(`${API_BASE_URL}/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to start optimization: ${response.statusText}`);
  }

  return response.json();
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const response = await fetch(`${API_BASE_URL}/task/${taskId}`);

  if (!response.ok) {
    throw new Error(`Failed to get task status: ${response.statusText}`);
  }

  return response.json();
}
