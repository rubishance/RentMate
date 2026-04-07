import fs from 'fs';
import path from 'path';

// Get all Edge Functions
const functionsDir = path.join(process.cwd(), 'supabase', 'functions');

if (!fs.existsSync(functionsDir)) {
    console.error('Supabase functions directory not found.');
    process.exit(1);
}

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== '_shared')
    .map(dirent => dirent.name);

const functions = getDirectories(functionsDir);

let updatedCount = 0;

functions.forEach(funcName => {
    const indexPath = path.join(functionsDir, funcName, 'index.ts');
    
    if (fs.existsSync(indexPath)) {
        let code = fs.readFileSync(indexPath, 'utf-8');
        let modified = false;

        // 1. Add import for CORS if missing
        if (!code.includes('getCorsHeaders')) {
            // Find the last import
            const importRegex = /^import .* from .*$/gm;
            let lastImportMatch;
            let match;
            while ((match = importRegex.exec(code)) !== null) {
                lastImportMatch = match;
            }

            const corsImport = `import { getCorsHeaders, handleCorsPreflight, validateOrigin } from '../_shared/cors.ts';\n`;
            
            if (lastImportMatch) {
                const insertPos = lastImportMatch.index + lastImportMatch[0].length + 1;
                code = code.slice(0, insertPos) + corsImport + code.slice(insertPos);
            } else {
                code = corsImport + code;
            }
            modified = true;
        }

        // 2. Inject Preflight and Validation at the start of Deno.serve
        if (!code.includes('handleCorsPreflight(req)')) {
            const serveRegex = /(Deno\.serve\((?:async )?\(req: Request\) => \{|Deno\.serve\((?:async )?\(req\) => \{)/;
            const serveMatch = code.match(serveRegex);
            
            if (serveMatch) {
                const corsLogic = `\n  // Security: CORS Preflight & Origin validation
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  
  if (!validateOrigin(req)) {
      return new Response(JSON.stringify({ error: 'CORS policy violation: Origin not allowed' }), { status: 403, headers: getCorsHeaders(req) });
  }\n`;
                const insertPos = serveMatch.index + serveMatch[0].length;
                code = code.slice(0, insertPos) + corsLogic + code.slice(insertPos);
                modified = true;
            }
        }

        // 3. Replace static headers with getCorsHeaders(req) -> This part requires regex to match headers objects
        // We will replace hardcoded origin strings
        const oldOriginRegex1 = /(['"])Access-Control-Allow-Origin\1\s*:\s*['"]\*['"]/g;
        const oldOriginRegex2 = /(['"])Access-Control-Allow-Origin\1\s*:\s*ALLOWED_ORIGIN/g;
        const oldOriginRegex3 = /"Access-Control-Allow-Origin"\s*:\s*"\*"/g;

        if (oldOriginRegex1.test(code) || oldOriginRegex2.test(code) || oldOriginRegex3.test(code)) {
            // Replace simple objects if possible, but the best way is to spread `...getCorsHeaders(req)` 
            // Warning: to do this safely we just replace the exact origin key-value pairs with spreading if we can.
            // Actually it's safer to just let `headers: { ...getCorsHeaders(req), 'Content-Type': '...' }`
            // Let's replace the common static definitions.
            
            // Replacing 'Access-Control-Allow-Origin': '*' with ...getCorsHeaders(req)
            code = code.replace(/(['"])Access-Control-Allow-Origin\1\s*:\s*['"]\*['"]/g, '...getCorsHeaders(req)');
            code = code.replace(/(['"])Access-Control-Allow-Origin\1\s*:\s*ALLOWED_ORIGIN/g, '...getCorsHeaders(req)');
            
            // Cleanup any duplicate "...getCorsHeaders(req)" inside the same object or trailing commas
            modified = true;
        }

        // 4. Remove 'Access-Control-Allow-Headers' and 'Access-Control-Allow-Methods' if we use the spread
        code = code.replace(/(['"])Access-Control-Allow-Headers\1\s*:\s*['"][^'"]*['"],?/g, '');
        code = code.replace(/(['"])Access-Control-Allow-Methods\1\s*:\s*['"][^'"]*['"],?/g, '');

        if (modified) {
            fs.writeFileSync(indexPath, code, 'utf-8');
            updatedCount++;
            console.log(`Updated CORS policy in ${funcName}`);
        }
    }
});

console.log(`\n✅ CORS injection complete. Updated ${updatedCount} functions.`);
