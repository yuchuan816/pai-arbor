export const queryKeys = {
  defaultSession: ['session', 'default'] as const,
  messageHistory: (sessionId: string) => ['messages', sessionId, 'initial'] as const,
};
