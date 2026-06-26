export const queryKeys = {
  defaultSession: ['session', 'default'] as const,
  messageHistory: (sessionId: string) => ['messages', sessionId, 'initial'] as const,
  memoryJob: (jobId: string) => ['memory', 'job', jobId] as const,
  memoryList: ['memory', 'list'] as const,
};
