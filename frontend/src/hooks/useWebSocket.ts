// WebSocket hook for real-time optimization updates

import { useEffect, useRef, useState } from 'react';
import type { AgentResult } from '../lib/api';

const WS_BASE_URL = 'ws://localhost:8000';

export interface WebSocketMessage {
  type: 'status' | 'agent_result' | 'completion' | 'error';
  data?: { status?: string };
  agent_result?: AgentResult;
  message?: string;
  best_result?: AgentResult;
}

export function useWebSocket(taskId: string | null) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const [bestResult, setBestResult] = useState<AgentResult | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!taskId) return;

    // Connect to WebSocket
    const ws = new WebSocket(`${WS_BASE_URL}/ws/${taskId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message:', message);

      setMessages((prev) => [...prev, message]);

      // Handle different message types
      switch (message.type) {
        case 'status':
          setStatus(message.data?.status || 'unknown');
          break;

        case 'agent_result':
          if (message.agent_result) {
            setAgentResults((prev) => [...prev, message.agent_result!]);
          }
          break;

        case 'completion':
          setStatus('completed');
          if (message.best_result) {
            setBestResult(message.best_result);
          }
          break;

        case 'error':
          setStatus('error');
          console.error('Optimization error:', message.message);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [taskId]);

  return {
    messages,
    isConnected,
    agentResults,
    bestResult,
    status,
  };
}
