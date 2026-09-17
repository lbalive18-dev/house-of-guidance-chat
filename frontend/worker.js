// BACKEND_URL is configured via Wrangler `vars` (see wrangler.jsonc).
// There is intentionally NO fallback URL: proxying auth traffic to a
// wrong default backend would silently break login/sessions. A missing
// BACKEND_URL fails loudly with HTTP 500 instead.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const BACKEND_URL = env.BACKEND_URL;

    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/sanctum/") ||
      url.pathname.startsWith("/broadcasting/") ||
      url.pathname.startsWith("/storage/")
    ) {
      if (!BACKEND_URL) {
        return new Response(
          "BACKEND_URL is not configured for this Worker.",
          { status: 500, headers: { "Content-Type": "text/plain" } }
        );
      }

      const backendUrl = new URL(
        url.pathname + url.search,
        BACKEND_URL + "/"
      );

      const backendRequest = new Request(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: ["GET", "HEAD"].includes(request.method)
          ? undefined
          : request.body,
        redirect: "manual",
      });

      const response = await fetch(backendRequest);

      const responseHeaders = new Headers(response.headers);
      const cookies = responseHeaders.getSetCookie?.() || [];

      responseHeaders.delete("Set-Cookie");

      for (const cookie of cookies) {
        responseHeaders.append(
          "Set-Cookie",
          cookie.replace(/;\s*Domain=[^;]*/gi, "")
        );
      }

      responseHeaders.set("X-HOG-Worker", "api-proxy");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
