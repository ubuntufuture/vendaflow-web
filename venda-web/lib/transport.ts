import { WebFault } from "./security";

// Bound headers AND body; an abort signal alone is not a completion deadline.
export async function boundedFetch(
  request: Request,
  timeoutMs = 6000,
  fetcher: typeof fetch = fetch,
  maxBytes = 1024 * 1024,
): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new WebFault(504));
      controller.abort();
    }, timeoutMs);
  });
  const operation = async () => {
    const input = new Request(request, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, controller.signal]),
    });
    const response = await fetcher(input);
    if (!response.body) return response;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw new WebFault(503);
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const headers = new Headers(response.headers);
    headers.delete("Content-Encoding");
    headers.delete("Content-Length");
    return new Response(bytes, { status: response.status, statusText: response.statusText, headers });
  };
  try {
    return await Promise.race([operation(), deadline]);
  } catch (error) {
    if (error instanceof WebFault) throw error;
    throw new WebFault(controller.signal.aborted || (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) ? 504 : 503);
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}
