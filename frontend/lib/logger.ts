type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV === 'development';

const COLORS: Record<LogLevel, string> = {
  debug: 'color:#6b7280',
  info:  'color:#3b82f6',
  warn:  'color:#f59e0b',
  error: 'color:#ef4444',
};

const PREFIXES: Record<LogLevel, string> = {
  debug: '[DEBUG]',
  info:  '[INFO]',
  warn:  '[WARN]',
  error: '[ERROR]',
};

function log(level: LogLevel, context: string, message: string, ...data: unknown[]) {
  if (level === 'debug' && !isDev) return;

  const timestamp = new Date().toISOString();
  const prefix = `%c${PREFIXES[level]} [${context}]`;
  const fullMessage = `${timestamp} - ${message}`;

  if (level === 'error') {
    console.error(prefix, COLORS[level], fullMessage, ...data);
  } else if (level === 'warn') {
    console.warn(prefix, COLORS[level], fullMessage, ...data);
  } else {
    console.log(prefix, COLORS[level], fullMessage, ...data);
  }
}

export function createLogger(context: string) {
  return {
    debug: (msg: string, ...data: unknown[]) => log('debug', context, msg, ...data),
    info:  (msg: string, ...data: unknown[]) => log('info',  context, msg, ...data),
    warn:  (msg: string, ...data: unknown[]) => log('warn',  context, msg, ...data),
    error: (msg: string, ...data: unknown[]) => log('error', context, msg, ...data),
  };
}

export const logger = createLogger('App');
