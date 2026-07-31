import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient();
const tolerantSuperjson = {
  serialize(value: unknown) {
    return superjson.serialize(value);
  },
  deserialize(value: unknown) {
    if (
      value &&
      typeof value === "object" &&
      "json" in value
    ) {
      try {
        return superjson.deserialize(
          value as Parameters<typeof superjson.deserialize>[0],
        );
      } catch {
        return (value as { json: unknown }).json;
      }
    }
    return value;
  },
};
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: tolerantSuperjson,
      fetch(input, init) {
        const timeoutSignal = AbortSignal.timeout(20_000);
        const signal = init?.signal
          ? AbortSignal.any([init.signal, timeoutSignal])
          : timeoutSignal;
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          signal,
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
