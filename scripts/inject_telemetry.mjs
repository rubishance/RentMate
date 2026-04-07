import fs from 'fs';
import path from 'path';

const functionsDir = path.join(process.cwd(), 'supabase', 'functions');

const excludeDirs = [
    '_shared',
    'generate-protocol-pdf',
    'send-whatsapp-outbound'
];

function injectLogger(filePath, folderName) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Idempotency check
    if (content.includes("import { AnalyticsLogger }")) {
        console.log(`Skipping ${folderName}: Already injected.`);
        return;
    }

    // 1. Inject import statement
    const importStatement = `import { AnalyticsLogger } from '../_shared/logger.ts';\n`;
    content = importStatement + content;

    // 2. Inject instantiation at the start of serve()
    // Match common serve patterns
    const serveRegex = /(serve\(\s*async\s*\(\s*(req|request)\s*(?::\s*Request)?\s*\)\s*=>\s*\{(?:\s*const\s+\w+\s*=\s*'[^']+';)?\s*)/;
    
    // Check if we can safely inject
    const match = content.match(serveRegex);
    if (!match) {
        console.warn(`WARNING: Could not find standard serve() pattern in ${folderName}. Manual inspection required.`);
        return;
    }

    const reqVar = match[2]; // usually 'req' or 'request'
    const injection = `\n  const logger = new AnalyticsLogger('${folderName}', ${reqVar});\n`;
    
    content = content.replace(serveRegex, `$1${injection}`);

    // 3. Optional: Replace top level console.logs
    // We will be slightly conservative to ensure we don't break string literals
    // But replacing console.log(...) -> logger.info(...) is highly beneficial.
    content = content.replace(/console\.log\(/g, 'logger.info(');
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    content = content.replace(/console\.error\(/g, 'logger.error(');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`\u2714 Injected Telemetry into ${folderName}`);
}

function processAll() {
    const entries = fs.readdirSync(functionsDir, { withFileTypes: true });

    let count = 0;
    for (const entry of entries) {
        if (!entry.isDirectory() || excludeDirs.includes(entry.name)) {
            continue;
        }

        const indexPath = path.join(functionsDir, entry.name, 'index.ts');
        if (fs.existsSync(indexPath)) {
            count++;
            injectLogger(indexPath, entry.name);
        }
    }
    
    console.log(`\nMetrics: Processed ${count} functions.`);
}

processAll();
