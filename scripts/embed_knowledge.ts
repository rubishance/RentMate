import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error("Missing required environment variables. Ensure VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY are set in your .env file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ARTICLES_DIR = join(process.cwd(), "src", "content", "articles");

function chunkText(text: string, maxChunkSize = 800): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const p of paragraphs) {
    if ((currentChunk.length + p.length) > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += (currentChunk.length > 0 ? "\n\n" : "") + p;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk.trim());
  return chunks;
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text.replace(/\n/g, ' '),
      model: "text-embedding-3-small",
    }),
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.data[0].embedding;
}

async function run() {
  console.log("🚀 Starting knowledge embedding process...");
  
  // 1. Delete old embeddings to avoid duplicates (naive replace approach)
  console.log("🗑️ Clearing old knowledge database...");
  await supabase.from("knowledge_documents").delete().neq('id', -1);
  
  // 2. Gather all markdown files
  const filesToProcess: { fullPath: string; filename: string }[] = [];
  
  function scanDir(dir: string) {
    if (!statSync(dir).isDirectory()) return;
    const files = readdirSync(dir);
    for (const file of files) {
      const fullPath = join(dir, file);
      if (statSync(fullPath).isDirectory()) {
         scanDir(fullPath);
      } else if (file.endsWith(".md")) {
         filesToProcess.push({ fullPath, filename: file });
      }
    }
  }

  scanDir(ARTICLES_DIR);
  console.log(`📂 Found ${filesToProcess.length} markdown articles to embed.`);

  let totalChunks = 0;

  for (const { fullPath, filename } of filesToProcess) {
    console.log(`📄 Processing ${filename}...`);
    const content = readFileSync(fullPath, "utf-8");
    const lang = content.match(/[\u0590-\u05FF]/) ? "he" : "en"; // detect hebrew text
    const chunks = chunkText(content);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk.length < 20) continue; // skip very small chunks
      
      try {
        const embedding = await getEmbedding(chunk);
        const { error } = await supabase.from("knowledge_documents").insert({
          content: chunk,
          metadata: {
             source: filename,
             language: lang,
             chunk_index: i
          },
          embedding: embedding
        });
        
        if (error) {
            console.error(`❌ DB Error on ${filename} chunk ${i}:`, error.message);
        } else {
            totalChunks++;
        }
      } catch (e: any) {
        console.error(`❌ Embedding API Error on ${filename} chunk ${i}:`, e.message);
      }
    }
  }
  
  console.log(`✅ Successfully embedded ${totalChunks} text chunks to the database!`);
}

run().catch(console.error);
