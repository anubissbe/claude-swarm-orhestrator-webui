
export enum ResponseStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface ResponseItem {
  id: number;
  status: ResponseStatus;
  content?: string;
  error?: string;
  activeTool?: string | null;
  toolUsed?: string;
}

// New types for analysis
export type Priority = 'High' | 'Medium' | 'Low';

export interface Agent {
  name: string;
  description: string;
  tools?: string[];
  priority: Priority;
  priorityReasoning: string;
}

export interface Tool {
  name: string;
  description: string;
}

export interface AnalysisResult {
  improvedPrompt: string;
  agents: Agent[];
  tools: Tool[];
}

// New types for post-mission summary
export interface KPI {
  name: string;
  value: string;
  description: string;
}

export interface ToolUsage {
    name: string;
    count: number;
}

export interface ExecutiveSummary {
  overallOutcome: 'Success' | 'Partial Success' | 'Failure' | string;
  summary: string;
  kpis: KPI[];
  toolUsage: ToolUsage[];
  recommendations: string;
}

// New type for chat messages
export interface ChatMessage {
  role: 'user' | 'model';
  content: string | AnalysisResult | ExecutiveSummary;
}