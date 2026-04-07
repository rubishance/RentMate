import * as fs from 'fs';

const targetFunction1 = 'supabase/functions/send-whatsapp-outbound/index.ts';
let t1 = fs.readFileSync(targetFunction1, 'utf8');
t1 = t1.replaceAll('headers:getCorsHeaders(req));', 'headers: getCorsHeaders(req) });');

const wrongUserBlock = `if (authError || !user) {
      await logger.logSecurityEvent('401', null, { authError });
      return new Response(JSON.stringify({ error: "Invalid User Token" }), { status: 401, headers: getCorsHeaders(req) });
    }`;
const correctBlock = `
    if (authError || !user) {
      await logger.logSecurityEvent('401', null, { authError });
      return new Response(JSON.stringify({ error: "Invalid User Token" }), { status: 401, headers: getCorsHeaders(req) });
    }

    const allowed = await RateLimiter.check(user?.id || 'anonymous', 'send-whatsapp-outbound', 5);
    if (!allowed) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: getCorsHeaders(req) });
    }
`;

t1 = t1.replace(/const allowed \= await RateLimiter\.check[\s\S]*?if\s*\(authError \|\| \!user\)\s*\{\s*await logger\.logSecurityEvent\('401', null, \{ authError \}\);\s*return new Response\(JSON\.stringify\(\{ error: "Invalid User Token" \}\), \{ status: 401, headers: getCorsHeaders\(req\) \}\);\s*\}/g, correctBlock);

fs.writeFileSync(targetFunction1, t1);

const targetFunction2 = 'supabase/functions/generate-protocol-pdf/index.ts';
let t2 = fs.readFileSync(targetFunction2, 'utf8');
t2 = t2.replaceAll('headers:getCorsHeaders(req));', 'headers: getCorsHeaders(req) });');
fs.writeFileSync(targetFunction2, t2);
