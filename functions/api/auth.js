export async function onRequest(context) {
  const { env } = context;
  const clientId = env.GITHUB_CLIENT_ID;
  const kv = env.CANVAS_PORTAL_KV;

  if (!clientId) {
    return new Response("Error: GITHUB_CLIENT_ID is not configured in Cloudflare Environment Variables.", { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  if (kv) {
    const todayStr = new Date().toISOString().split('T')[0];
    const kvKey = `logins:${todayStr}`;
    const countStr = await kv.get(kvKey);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= 500) {
      return new Response("Error: Daily login limit reached (max 500 logins per day). Please try again tomorrow.", {
        status: 429,
        headers: { 
          'Content-Type': 'text/plain',
          'Retry-After': '86400'
        }
      });
    }
  }

  const state = Math.random().toString(36).substring(2, 15);
  const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=public_repo&state=${state}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`
    }
  });
}
