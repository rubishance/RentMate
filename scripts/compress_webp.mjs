import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backgroundDir = path.join(__dirname, '../public/Background');

async function processFiles() {
  const files = fs.readdirSync(backgroundDir).filter(f => f.endsWith('.webp') && !f.includes('_temp'));
  console.log(`Found ${files.length} WebP files. Re-compressing...`);
  
  let totalSaved = 0;
  let processed = 0;

  for (const file of files) {
    const inputPath = path.join(backgroundDir, file);
    const tempPath = path.join(backgroundDir, file.replace('.webp', '_temp.webp'));
    
    const inputStats = fs.statSync(inputPath);
    const inputBuffer = fs.readFileSync(inputPath);
    // Aggressive compression suitable for blurred/cinematic backgrounds
    await sharp(inputBuffer)
      .webp({ quality: 30, effort: 6 }) 
      .toFile(tempPath);
      
    const outputStats = fs.statSync(tempPath);
    totalSaved += (inputStats.size - outputStats.size);
    processed++;
    
    // Overwrite the original
    fs.unlinkSync(inputPath);
    fs.renameSync(tempPath, inputPath);
  }
  
  console.log(`\nDone! Re-compressed ${processed} files.`);
  console.log(`Total space saved in this pass: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
}

processFiles().catch(e => {
  console.error(e);
  process.exit(1);
});
