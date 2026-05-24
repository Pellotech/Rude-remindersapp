/**
 * Lightweight structured logger.
 *
 * Emits a single line of JSON to stdout/stderr per call so logs can be searched
 * and filtered in Replit's log viewer (or any future log aggregator) without
 * adding a paid service. Existing free-form console.* calls keep working;
 * use this for events you want to query by name/field later.
 */

type LogData = Record<string, unknown>;

function emit(
  stream: (msg: string) => void,
  level: "INFO" | "WARN" | "ERROR",
  event: string,
  data?: LogData,
) {
  try {
    stream(
      JSON.stringify({
        level,
        event,
        timestamp: new Date().toISOString(),
        ...(data ?? {}),
      }),
    );
  } catch {
    // If serialization fails (e.g. circular ref), fall back to a plain line so
    // we never break the request path because of logging.
    stream(`${level} ${event} <unserializable log data>`);
  }
}

export const log = {
  info: (event: string, data?: LogData) =>
    emit(console.log.bind(console), "INFO", event, data),
  warn: (event: string, data?: LogData) =>
    emit(console.warn.bind(console), "WARN", event, data),
  error: (event: string, data?: LogData) =>
    emit(console.error.bind(console), "ERROR", event, data),
};
