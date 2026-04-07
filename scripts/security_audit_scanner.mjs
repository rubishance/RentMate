import fs from 'fs';
import path from 'path';

const FUNCTIONS_DIR = path.join(process.cwd(), 'supabase', 'functions');

const DEPENDENCY_REGEX = /from\s+['"](https?:\/\/esm\.sh\/[^'"]+|npm:[^'"]+)['"]/g;
const IMPORT_REGEX = /import\s+.*?\s+from\s+['"](https?:\/\/esm\.sh\/[^'"]+|npm:[^'"]+)['"]/g;
const QUERY_REGEX = /\.query\s*\(/g;
const RPC_REGEX = /\.rpc\s*\(/g;

async function scan() {
    console.log("=== \x1b[36mRentMate Security Audit Scanner\x1b[0m ===");
    const deps = new Set();
    const findings = [];

    const dirs = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    for (const dir of dirs) {
        const entryPath = path.join(FUNCTIONS_DIR, dir, 'index.ts');
        if (!fs.existsSync(entryPath)) continue;

        const content = fs.readFileSync(entryPath, 'utf8');

        // Extract Dependencies
        let match;
        while ((match = IMPORT_REGEX.exec(content)) !== null) {
            deps.add(match[1]);
        }
        
        // Secondary regex check for 'from' syntax that might be on a newline
        while ((match = DEPENDENCY_REGEX.exec(content)) !== null) {
            deps.add(match[1]);
        }

        // Check for Raw Queries (SQLi Risk)
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(QUERY_REGEX)) {
                findings.push(`[SQLi RISK] \x1b[33m${dir}/index.ts:${i+1}\x1b[0m - Found .query(): ${lines[i].trim()}`);
            }
            if (lines[i].match(RPC_REGEX)) {
                 // RPC is generally safe if using ORM params, but good for auditing
                 findings.push(`[RPC CALL]  \x1b[32m${dir}/index.ts:${i+1}\x1b[0m - Found .rpc(): ${lines[i].trim()}`);
            }
        }
    }

    console.log("\n--- EXTERNAL DEPENDENCIES (SBOM) ---");
    Array.from(deps).sort().forEach(d => console.log(`- ${d}`));

    console.log("\n--- SECURITY FINDINGS ---");
    if (findings.length === 0) {
        console.log("\x1b[32mNo risky patterns found!\x1b[0m");
    } else {
        findings.forEach(f => console.log(f));
    }
}

scan().catch(console.error);
