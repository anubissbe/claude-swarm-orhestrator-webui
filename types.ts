
export enum ResponseStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface ResponseItem {
  id: number; // Corresponds to Task ID
  status: ResponseStatus;
  content?: string;
  error?: string;
  activeTool?: string | null;
  toolUsed?: string;
}

export type Priority = 'High' | 'Medium' | 'Low';

export interface Task {
  id: number;
  name: string;
  description: string;
  tools?: string[];
  dependencies: number[];
  priority: Priority;
  priorityReasoning: string;
}

export interface Tool {
  name: string;
  description: string;
}

export interface AnalysisResult {
  improvedPrompt: string;
  tasks: Task[];
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
