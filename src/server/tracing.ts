import { SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("silver-salt-capital");

export async function traced<T>(name: string, attributes: Record<string, string | number | boolean | null | undefined>, fn: () => Promise<T>): Promise<T> {
  const span = tracer.startSpan(name);
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) span.setAttribute(key, value);
  }
  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    span.end();
  }
}
