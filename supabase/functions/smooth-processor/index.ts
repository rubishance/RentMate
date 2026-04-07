// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withEdgeMiddleware } from '../_shared/middleware.ts';
interface reqPayload {
  name: string;
}

console.info('server started');

Deno.serve(withEdgeMiddleware('smooth-processor', async (req: Request, logger) => {
  const { name }: reqPayload = await req.json();
  const data = {
    message: `Hello ${name}!`,
  };

  return new Response(
    JSON.stringify(data),
    { headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }}
  );
}));