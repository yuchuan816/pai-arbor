import pino from 'pino';
import { env } from '@/lib/server/env';

function buildLogger(): pino.Logger {
  if (!env.LOG_TO_LOKI) {
    return pino({ level: 'silent' });
  }

  const transport = pino.transport({
    target: 'pino-loki',
    options: {
      host: env.LOKI_URL,
      labels: { app: 'pai-arbor' },
      propsToLabels: ['event'],
      batching: { interval: 5 },
    },
    level: env.LOG_LEVEL,
  });

  return pino({ level: env.LOG_LEVEL, base: { app: 'pai-arbor' } }, transport);
}

export const logger = buildLogger();

export type LlmLogEvent =
  | 'llm.chat.request'
  | 'llm.chat.response'
  | 'llm.consolidation.request'
  | 'llm.consolidation.response'
  | 'llm.consolidation.complete'
  | 'llm.consolidation.failed'
  | 'llm.consolidation.mark';

export function logLlmEvent(event: LlmLogEvent, fields: Record<string, unknown>): void {
  logger.info({ event, ...fields });
}
