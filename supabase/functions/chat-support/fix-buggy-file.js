const fs = require('fs');

const FILE_PATH = "c:\\AnitiGravity Projects\\RentMate\\supabase\\functions\\chat-support\\index.ts";
const lines = fs.readFileSync(FILE_PATH, 'utf8').split('\n');

const cleaned = [];
let skip = false;

// Delete lines from 614 to 810 (inclusive, 0-indexed: 613 it's 613-809)
for (let i = 0; i < lines.length; i++) {
    if (i === 613) {     // Note: i=613 is line 614 because arrays are 0-indexed.
        // We substitute the chunk with "}"
        cleaned.push("}");
        continue;
    }
    if (i > 613 && i <= 809) {
        continue; // skip
    }
    cleaned.push(lines[i]);
}

fs.writeFileSync(FILE_PATH, cleaned.join('\n'), 'utf8');
console.log('Fixed file.');
