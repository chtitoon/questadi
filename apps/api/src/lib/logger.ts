function log(level: string, msg: string, meta?: object): void {
  const line = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...meta });
  if (level === 'error') console.error(line);
  else console.log(line);
}

export const logger = {
  info:  (msg: string, meta?: object) => log('info',  msg, meta),
  warn:  (msg: string, meta?: object) => log('warn',  msg, meta),
  error: (msg: string, meta?: object) => log('error', msg, meta),
};

export async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t = performance.now();
  const result = await fn();
  return [result, Math.round(performance.now() - t)];
}
