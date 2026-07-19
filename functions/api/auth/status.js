export async function onRequest(context) {
  const { env } = context;
  const kv = env.CANVAS_PORTAL_KV;

  const todayStr = new Date().toISOString().split('T')[0];
  const kvKey = `logins:${todayStr}`;

  let count = 0;
  if (kv) {
    const countStr = await kv.get(kvKey);
    count = countStr ? parseInt(countStr, 10) : 0;
  }

  return new Response(JSON.stringify({
    count: count,
    limit: 500,
    limitReached: count >= 500
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    }
  });
}
