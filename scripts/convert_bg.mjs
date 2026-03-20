import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backgroundDir = path.join(__dirname, '../public/Background');

async function processFiles() {
  const files = fs.readdirSync(backgroundDir).filter(f => f.endsWith('.jpg'));
  console.log(`Found ${files.length} JPG files. Converting to WebP...`);
  
  if (files.length === 0) {
    console.log("No JPG files found. They might have been converted already.");
    return;
  }

  let totalSaved = 0;
  let processed = 0;

  for (const file of files) {
    const inputPath = path.join(backgroundDir, file);
    const outputPath = path.join(backgroundDir, file.replace('.jpg', '.webp'));
    
    const inputStats = fs.statSync(inputPath);
    
    await sharp(inputPath)
      .webp({ quality: 80 }) // 80% matches JPG quality but halves size
      .toFile(outputPath);
      
    const outputStats = fs.statSync(outputPath);
    totalSaved += (inputStats.size - outputStats.size);
    processed++;
    
    // Delete the original
    fs.unlinkSync(inputPath);
  }
  
  console.log(`\nDone! Processed ${processed} files.`);
  console.log(`Total space saved: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
}

processFiles().catch(e => {
  console.error(e);
  process.exit(1);
});
