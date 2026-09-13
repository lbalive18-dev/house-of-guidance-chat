const BACKEND_URL = "https://house-of-guidance-chat.onrender.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/sanctum/")
    ) {
      const backendUrl = new URL(url.pathname + url.search, BACKEND_URL);

      const headers = new Headers(request.headers);
      headers.set("Host", new URL(BACKEND_URL).host);

      const backendRequest = new Request(backendUrl, {
        method: request.method,
        headers,
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

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
