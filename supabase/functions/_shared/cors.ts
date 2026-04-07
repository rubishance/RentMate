export const ALLOWED_ORIGINS = [
    'https://rentmate.co.il',
    'https://staging.rentmate.co.il',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

export function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || '';
    
    // Check if the requesting origin is in our whitelist
    const isAllowed = ALLOWED_ORIGINS.includes(origin);
    const allowOrigin = isAllowed ? origin : 'https://rentmate.co.il';
    
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'self' https://staging.rentmate.co.il https://rentmate.co.il;"
    };
}

export function handleCorsPreflight(req: Request) {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(req) });
    }
    return null;
}

export function validateOrigin(req: Request): boolean {
    const origin = req.headers.get('Origin');
    // If there is no origin (e.g. server-to-server call), we might block or allow depending on requirements. 
    // In Edge functions called by standard browsers, Origin is always present.
    // However, if we block requests with no Origin, internal Cron/Resend/System calls might fail if they don't spoof Origin.
    // For strict browser isolation, we check if Origin exists + is in whitelist
    if (!origin) {
        // If an Edge function does not provide an origin, we'll allow it assuming it's a backend cron (like security-alerter)
        // or a server-to-server call. But if we want it STRICT, we can require an Origin. 
        // For now, if origin is provided, we strictly validate it.
        return true; 
    }
    return ALLOWED_ORIGINS.includes(origin);
}
