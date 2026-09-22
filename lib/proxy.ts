import { ProxyAgent, fetch as undiciFetch } from "undici";

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : null;

/**
 * A `fetch` that routes requests through the configured HTTP proxy when one is
 * set (e.g. a local VPN client), falling back to the global fetch otherwise.
 *
 * Node's built-in `fetch` ignores `HTTP(S)_PROXY` env vars by default, so we
 * thread the proxy through undici's `ProxyAgent` explicitly. The casts bridge
 * undici's slightly different `Request`/`Response` types to the global ones.
 */
export const proxyFetch: typeof fetch = dispatcher
  ? async (input, init) => {
      const response = await undiciFetch(
        input as unknown as Parameters<typeof undiciFetch>[0],
        { ...(init ?? {}), dispatcher } as Parameters<typeof undiciFetch>[1],
      );
      return response as unknown as Response;
    }
  : globalThis.fetch;
