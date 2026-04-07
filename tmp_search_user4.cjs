const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\ראובן שאנס\\.gemini\\antigravity\\brain';
const output = [];

function find(loc) {
   try {
       if(fs.statSync(loc).isDirectory()) {
          fs.readdirSync(loc).forEach(child => find(path.join(loc, child)));
       } else if (loc.endsWith('overview.txt')) {
          let p = '';
          try {
              p = fs.readFileSync(loc, 'utf16le');
          } catch(e) {
              p = fs.readFileSync(loc, 'utf8');
          }
          const lower = p.toLowerCase();
          // We are looking for something about filters in the documents page.
          if ((lower.includes('filter') || p.includes('פילטר') || p.includes('מסננ')) && 
              (lower.includes('document') || p.includes('מסמכ'))) {
             const lines = p.split('\n');
             lines.forEach((l, i) => {
                if (l.toLowerCase().includes('filter') || l.includes('פילטר') || l.includes('מסננ')) {
                   output.push({
                      file: loc,
                      match: l.trim(),
                      contextBefore: lines[i-1] ? lines[i-1].trim() : '',
                      contextAfter: lines[i+1] ? lines[i+1].trim() : ''
                   });
                }
             });
          }
       }
   } catch (e) {}
}
find(dir);
fs.writeFileSync('C:\\AnitiGravity Projects\\RentMate\\search_results4.json', JSON.stringify(output, null, 2));
