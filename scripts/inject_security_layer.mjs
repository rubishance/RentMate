import fs from 'fs';
import path from 'path';

const functionsDir = path.join(process.cwd(), 'supabase', 'functions');

const TARGETS = {
  chat: 'chat-support',
  whatsapp: 'send-whatsapp-outbound',
  pdf: 'generate-protocol-pdf'
};

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
    fs.writeFileSync(file, content, 'utf8');
}

function updateDependencies(content) {
    return content.replace(/https:\/\/esm\.sh\/@supabase\/supabase-js@2\.\d+\.\d+/g, 'https://esm.sh/@supabase/supabase-js@2.39.3');
}

function processChat() {
    const p = path.join(functionsDir, TARGETS.chat, 'index.ts');
    let content = read(p);
    content = updateDependencies(content);

    // Inject imports
    if (!content.includes('RateLimiter')) {
        content = content.replace(
            `import { AnalyticsLogger } from '../_shared/logger.ts';`,
            `import { AnalyticsLogger } from '../_shared/logger.ts';\nimport { RateLimiter } from '../_shared/rate_limit.ts';\nimport { validatePayload, ChatSupportSchema } from '../_shared/validation.ts';`
        );
    }

    // Inject Validation & Rate Limiter
    const validateTarget = `const userContent = messages[messages.length - 1]?.content || '';`;
    const validateInject = `
        const validation = validatePayload(ChatSupportSchema, {
            message: userContent,
            conversationId,
            language: body.language
        });
        
        if (!validation.success) {
             logger.error("Validation failed", validation.error);
             return new Response(JSON.stringify({ error: validation.error }), {
                 status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
             });
        }
`;
    // Rate limit inject targeting auth check
    const rateLimitTargetStr = `const startTime = Date.now();`;
    const rateLimitInject = `
        // Check Rate Limits: 10 per minute
        const authHeaderLim = req.headers.get('Authorization');
        if (authHeaderLim) {
            const token = authHeaderLim.replace('Bearer ', '');
            const sbAuthLim = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
            const { data: { user }, error: authError } = await sbAuthLim.auth.getUser(token);
            if (user && !authError) {
                const allowed = await RateLimiter.check(user.id, 'chat-support', 10);
                if (!allowed) {
                    await logger.logSecurityEvent('429', user.id, { reason: 'Rate limit exceeded for chat-support' });
                    return new Response(JSON.stringify({ error: "Too Many Requests. Please wait a minute." }), {
                        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }
        }
`;

    if (content.includes(validateTarget) && !content.includes('ChatSupportSchema')) {
        content = content.replace(validateTarget, validateTarget + validateInject);
    }

    if (content.includes(rateLimitTargetStr) && !content.includes('RateLimiter.check')) {
        content = content.replace(rateLimitTargetStr, rateLimitTargetStr + rateLimitInject);
    }
    write(p, content);
    console.log(`Updated chat-support`);
}

function processWhatsapp() {
    const p = path.join(functionsDir, TARGETS.whatsapp, 'index.ts');
    let content = read(p);
    content = updateDependencies(content);

    if (!content.includes('RateLimiter')) {
        content = content.replace(
            `import { AnalyticsLogger } from '../_shared/logger.ts';`,
            `import { AnalyticsLogger } from '../_shared/logger.ts';\nimport { RateLimiter } from '../_shared/rate_limit.ts';\nimport { validatePayload, WhatsappOutboundSchema } from '../_shared/validation.ts';`
        );
    }

    const validateTarget = `const { toMobile, textBody, conversationId, replyToMessageId, media } = await req.json();`;
    const validateInject = `
        const validation = validatePayload(WhatsappOutboundSchema, { toMobile, textBody, conversationId, replyToMessageId, media });
        if (!validation.success) {
            return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: corsHeaders });
        }
`;

    const rateTarget = `if (authError || !user) {`;
    const rateInject = `
    const allowed = await RateLimiter.check(user.id, 'send-whatsapp-outbound', 5);
    if (!allowed) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: corsHeaders });
    }
`;

    if (content.includes(validateTarget) && !content.includes('WhatsappOutboundSchema')) {
        content = content.replace(validateTarget, validateTarget + validateInject);
    }

    if (content.includes(rateTarget) && !content.includes('RateLimiter.check')) {
        content = content.replace(rateTarget, rateInject + rateTarget); // Right before the authError check block or after, actually after user is defined.
        // Let's adjust target:
    }
    // better replace
    const exactRateTarget = `if (authError || !user) {\n      await logger.logSecurityEvent('401', null, { authError });\n      return new Response(JSON.stringify({ error: "Invalid User Token" }), { status: 401, headers: corsHeaders });\n    }`;

    if (content.includes(exactRateTarget) && !content.includes("RateLimiter.check")) {
        content = content.replace(exactRateTarget, exactRateTarget + `\n\n    const allowed = await RateLimiter.check(user.id, 'send-whatsapp-outbound', 5);\n    if (!allowed) return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: corsHeaders });`);
    }

    write(p, content);
    console.log(`Updated send-whatsapp-outbound`);
}

function processPDF() {
    const p = path.join(functionsDir, TARGETS.pdf, 'index.ts');
    let content = read(p);
    content = updateDependencies(content);
    
    if (!content.includes('RateLimiter')) {
        content = content.replace(
            `import { AnalyticsLogger } from '../_shared/logger.ts';`,
            `import { AnalyticsLogger } from '../_shared/logger.ts';\nimport { RateLimiter } from '../_shared/rate_limit.ts';\nimport { validatePayload, ProtocolPdfSchema } from '../_shared/validation.ts';`
        );
    }

    const authTarget = `if (authError || !user) {\n            await logger.logSecurityEvent('401', null, { authError });\n            return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired token" }), { status: 401, headers: corsHeaders });\n        }`;

    if (content.includes(authTarget) && !content.includes("RateLimiter.check")) {
        content = content.replace(authTarget, authTarget + `\n\n        const allowed = await RateLimiter.check(user.id, 'generate-protocol-pdf', 3);\n        if (!allowed) return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: corsHeaders });`);
    }

    const validateTarget = `const body = bodyText ? JSON.parse(bodyText) : {};`;
    const validateInject = `
        const validation = validatePayload(ProtocolPdfSchema, body);
        if (!validation.success) {
            return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: corsHeaders });
        }
`;

    if (content.includes(validateTarget) && !content.includes('ProtocolPdfSchema')) {
        content = content.replace(validateTarget, validateTarget + validateInject);
    }

    write(p, content);
    console.log(`Updated generate-protocol-pdf`);
}

function processOthers() {
    const entries = fs.readdirSync(functionsDir, { withFileTypes: true });
    let count = 0;
    const excludes = ['_shared', TARGETS.chat, TARGETS.whatsapp, TARGETS.pdf];
    
    for (const entry of entries) {
        if (!entry.isDirectory() || excludes.includes(entry.name)) continue;
        const p = path.join(functionsDir, entry.name, 'index.ts');
        if (!fs.existsSync(p)) continue;
        
        let content = read(p);
        let changed = false;
        
        // 1. Dependencies
        const oldDeps = content.match(/https:\/\/esm\.sh\/@supabase\/supabase-js@2\.\d+\.\d+/g);
        if (oldDeps) {
             content = updateDependencies(content);
             changed = true;
        }

        // 2. Global Rate Limiter
        if (!content.includes('RateLimiter.check(')) {
             const authCheckRegex = /if\s*\(authError\s*\|\|\s*!user\)\s*\{[^}]+\}/;
             const match = content.match(authCheckRegex);
             if (match) {
                 if (!content.includes("import { RateLimiter }")) {
                      const importAdd = `import { RateLimiter } from '../_shared/rate_limit.ts';\n`;
                      content = importAdd + content;
                 }
                 const inject = `\n    const allowed = await RateLimiter.check(user.id, '${entry.name}', 30);\n    if (!allowed) return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429, headers: corsHeaders });\n`;
                 content = content.replace(match[0], match[0] + inject);
                 changed = true;
             }
        }
        
        if (changed) {
            write(p, content);
            count++;
        }
    }
    console.log(`Updated ${count} other functions.`);
}

console.log("Starting Security Hardening AST Script...");
processChat();
processWhatsapp();
processPDF();
processOthers();
console.log("Completed Security Architecture updates.");
