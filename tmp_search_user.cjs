const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\ראובן שאנס\\.gemini\\antigravity\\brain';
const output = [];

function find(loc) {
   try {
       if(fs.statSync(loc).isDirectory()) {
          fs.readdirSync(loc).forEach(child => find(path.join(loc, child)));
       } else if (loc.endsWith('.md') || loc.endsWith('.txt')) {
          const p = fs.readFileSync(loc, 'utf8');
          if (p.includes('פילטר') || p.includes('מסננ') || p.includes('מסמכ')) {
             const lines = p.split('\n');
             lines.forEach((l, i) => {
                if (l.includes('פילטר') || l.includes('חיפוש') || l.includes('כפתור')) {
                   output.push({
                      file: loc,
                      match: l,
                      contextBefore: lines[i-1] || '',
                      contextAfter: lines[i+1] || ''
                   });
                }
             });
          }
       }
   } catch (e) {}
}
find(dir);
fs.writeFileSync('C:\\AnitiGravity Projects\\RentMate\\search_results.json', JSON.stringify(output, null, 2));
