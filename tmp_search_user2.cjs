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
          if (p.includes('מסמכים') || p.includes('מסננים') || p.includes('פילטר')) {
             const lines = p.split('\n');
             lines.forEach((l, i) => {
                if (l.includes('מסננ') || l.includes('פילטר') || l.includes('מסמכ')) {
                   output.push({
                      file: loc,
                      match: l.trim(),
                      // contextBefore: lines[i-1] || '',
                      // contextAfter: lines[i+1] || ''
                   });
                }
             });
          }
       }
   } catch (e) {}
}
find(dir);
fs.writeFileSync('C:\\AnitiGravity Projects\\RentMate\\search_results2.json', JSON.stringify(output, null, 2));
