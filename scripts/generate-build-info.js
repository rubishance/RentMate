import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');
const versionFile = path.join(publicDir, 'version.json');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

let versionInfo = {
    version: 'unknown',
    shortVersion: 'unknown',
    branch: 'unknown',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
};

try {
    // Try to get git info
    const revision = execSync('git rev-parse HEAD').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

    versionInfo = {
        ...versionInfo,
        version: revision,
        shortVersion: revision.substring(0, 7),
        branch
    };
} catch (e) {
    console.warn('Failed to retrieve git info:', e.message);
}

fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));

console.log(`✅ Generated version.json: ${versionInfo.shortVersion} (${versionInfo.timestamp})`);
