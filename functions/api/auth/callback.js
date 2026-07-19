export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
  const savedState = cookies["oauth_state"];

  if (!code) {
    return new Response("Error: Authorization code is missing.", { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  if (state && savedState && state !== savedState) {
    return new Response("Error: State verification failed. Potential CSRF attack detected.", { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response("Error: Server is missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET configuration.", { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Echo-Music-Lossless-Portal"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(`GitHub OAuth Error: ${tokenData.error_description || tokenData.error}`, { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return new Response("Error: Access token not returned by GitHub.", { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const kv = env.CANVAS_PORTAL_KV;
    if (kv) {
      const todayStr = new Date().toISOString().split('T')[0];
      const kvKey = `logins:${todayStr}`;
      const countStr = await kv.get(kvKey);
      const count = countStr ? parseInt(countStr, 10) : 0;
      await kv.put(kvKey, (count + 1).toString(), { expirationTtl: 129600 });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: `/contribute.html#access_token=${accessToken}`,
        'Set-Cookie': 'oauth_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
      }
    });
  } catch (error) {
    return new Response(`Error exchanging token: ${error.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
