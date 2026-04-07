const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\ראובן שאנס\\.gemini\\antigravity\\brain';
const output = [];

function find(loc) {
   try {
       if(fs.statSync(loc).isDirectory()) {
          fs.readdirSync(loc).forEach(child => find(path.join(loc, child)));
       } else if (loc.endsWith('overview.txt')) {
          const p = fs.readFileSync(loc, 'utf8');
          const lower = p.toLowerCase();
          if (lower.includes('filter') && (lower.includes('document') || lower.includes('button'))) {
             const lines = p.split('\n');
             lines.forEach((l, i) => {
                if (l.toLowerCase().includes('filter')) {
                   output.push({
                      file: loc,
                      match: l.trim()
                   });
                }
             });
          }
       }
   } catch (e) {}
}
find(dir);
fs.writeFileSync('C:\\AnitiGravity Projects\\RentMate\\search_results3.json', JSON.stringify(output, null, 2));
