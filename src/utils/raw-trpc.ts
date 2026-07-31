export async function rawTrpcCall<T>(
  procedure: string,
  options?: {
    input?: Record<string, unknown> | null;
    method?: "GET" | "POST";
  },
): Promise<T> {
  const method = options?.method ?? "GET";
  const envelope = JSON.stringify({ json: options?.input ?? null });
  const url = `/api/trpc/${procedure}${
    method === "GET" ? `?input=${encodeURIComponent(envelope)}` : ""
  }`;
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? envelope : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    const errorData = payload.error?.json ?? payload.error;
    throw new Error(errorData?.message ?? `请求失败（${response.status}）`);
  }
  const data = payload.result?.data;
  if (data == null) throw new Error("服务器没有返回数据");
  return (data.json ?? data) as T;
}
