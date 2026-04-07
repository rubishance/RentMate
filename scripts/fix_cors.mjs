import fs from 'fs';
import path from 'path';

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

        // Fix global corsHeaders referencing 'req'
        const regex1 = /const\s+corsHeaders\s*=\s*\{\s*\.\.\.getCorsHeaders\(req\),?\s*\};?/g;
        if (regex1.test(code)) {
            code = code.replace(regex1, '');
            modified = true;
        }
        
        // Also fix `corsHeaders` object if it contains just other keys but still has `...getCorsHeaders(req)`
        const regex2 = /\.\.\.getCorsHeaders\(req\),?/g;
        // Wait, if it has it inside the global, it's bad.
        // Let's just find anything outside `serve` or `Deno.serve`..
        // Better yet, just remove any top-level corsHeaders definition completely if it uses req.
        const topLevelCors = /const\s+corsHeaders\s*=\s*\{[\s\S]*?\};/;
        const match = code.match(topLevelCors);
        if (match && match[0].includes('getCorsHeaders(req)')) {
            code = code.replace(topLevelCors, '');
            modified = true;
        }

        // Now replace references to corsHeaders inside Responses with getCorsHeaders(req)
        if (code.includes('corsHeaders')) {
            code = code.replace(/\.\.\.corsHeaders/g, '...getCorsHeaders(req)');
            code = code.replace(/\{?\s*corsHeaders\s*\}?/g, 'getCorsHeaders(req)'); // Handle straight passing
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(indexPath, code, 'utf-8');
            updatedCount++;
            console.log(`Fixed CORS references in ${funcName}`);
        }
    }
});

console.log(`\n✅ CORS AST fixes applied to ${updatedCount} functions.`);
