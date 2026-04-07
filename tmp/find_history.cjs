const fs = require('fs');
const path = require('path');

const historyDir = path.join(process.env.APPDATA, 'Code', 'User', 'History');
if (!fs.existsSync(historyDir)) {
  console.log('No history dir found at', historyDir);
  process.exit(0);
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(fullPath));
    } else if (file === 'entries.json') {
      try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (data && data.resource && data.resource.includes('PaymentDetailsModal.tsx')) {
          const files = fs.readdirSync(dir).filter(f => f !== 'entries.json');
          if (files.length > 0) {
            // Sort by modified time descending to get the newest first
            files.sort((a,b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs);
            // Print the most recent backup file
            console.log('Found latest backup:', path.join(dir, files[0]));
            console.log('--CONTENT--');
            console.log(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
            console.log('--END--');
            process.exit(0);
          }
        }
      } catch(e) {
          // ignore
      }
    }
  });
  return results;
}

console.log("Searching history...");
walk(historyDir);
console.log("Not found.");
