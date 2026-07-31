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
    signal: AbortSignal.timeout(45_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status >= 500
        ? "服务正在启动或部署，请稍后再试"
        : `服务器返回了无法识别的响应（${response.status}）`,
    );
  }
  const payload = await response.json();
  if (!response.ok || payload.error) {
    const errorData = payload.error?.json ?? payload.error;
    const message = typeof errorData === "string" ? errorData : errorData?.message;
    throw new Error(message ?? `请求失败（${response.status}）`);
  }
  const data = payload.result?.data;
  if (data == null) throw new Error("服务器没有返回数据");
  return (data.json ?? data) as T;
}
