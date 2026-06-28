import pino from 'pino';

const level = process.env.LOG_LEVEL;
const logToLoki = process.env.LOG_TO_LOKI === 'true';
const lokiHost = process.env.LOKI_URL;

function buildLogger(): pino.Logger {
  if (!logToLoki) {
    return pino({ level: 'silent' });
  }

  const transport = pino.transport({
    target: 'pino-loki',
    options: {
      host: lokiHost,
      labels: { app: 'pai-arbor' },
      propsToLabels: ['event'],
      batching: { interval: 5 },
    },
    level,
  });

  return pino({ level, base: { app: 'pai-arbor' } }, transport);
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
