function log(level: string, msg: string, meta?: object): void {
  process[level === 'error' ? 'stderr' : 'stdout'].write(
    JSON.stringify({ level, msg, ts: new Date().toISOString(), ...meta }) + '\n',
  );
}

export const logger = {
  info:  (msg: string, meta?: object) => log('info',  msg, meta),
  warn:  (msg: string, meta?: object) => log('warn',  msg, meta),
  error: (msg: string, meta?: object) => log('error', msg, meta),
};
