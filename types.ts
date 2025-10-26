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
}

// New types for analysis
export interface Agent {
  name: string;
  description: string;
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
