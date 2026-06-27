export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ExtractedMemory {
  text: string;
  type: 'preference' | 'event' | 'fact';
}

export interface ConsolidationJobRawPayload {
  model: string;
  system: string;
  prompt: string;
  response: string;
}

export interface ConsolidationJobSnapshot {
  messageIds?: string[];
  userId?: string;
  rawPayload?: ConsolidationJobRawPayload;
}

export interface ConsolidationJob {
  id: string;
  status: JobStatus;
  startedAt: number;
  completedAt?: number;
  progress: string;
  result?: {
    memoriesExtracted: number;
    memories: ExtractedMemory[];
    consolidatedMessageCount: number;
    unfinishedMessageCount: number;
  };
  error?: string;
  snapshot?: ConsolidationJobSnapshot;
}
