/**
 * Embedding Pipeline for Workflow Knowledge Base
 *
 * Processes markdown files from knowledge_base/workflow/ and generates
 * OpenAI embeddings for semantic similarity search via pgvector.
 *
 * Usage:
 *   tsx scripts/embed-workflow-kb.ts
 *
 * Environment Variables:
 *   - OPENAI_API_KEY: OpenAI API key for embeddings
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (admin)
 *   - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *
 * @task Phase 3, Task 3.3 - Embedding Pipeline (Tier 1 - Detection)
 * @task Phase 4, Task 4.2 - Retrieval Integration (Tier 2 - Guidance)
 * @reference __references__/workflow/documentation/workflow_infrastructure/workflow_task/phase_03/task_3-3_embedding_pipeline.md
 * @reference __references__/workflow/documentation/workflow_infrastructure/workflow_task/phase_04/task_4-2_retrieval_integration.md
 *
 * Total files: 41 (26 Phase 3 + 15 Phase 4)
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: join(__dirname, '../.env.local') });

// ===================================================================
// Configuration
// ===================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing required environment variables');
  console.error('Required:');
  console.error('  - OPENAI_API_KEY');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002',
  timeout: 30000,  // 30 second timeout
  maxRetries: 3
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false
  }
});

// ===================================================================
// Types
// ===================================================================

interface KnowledgeChunk {
  chunk_type: 'phase_definition' | 'transition' | 'artifact';
  phase: string | null;
  title: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

// ===================================================================
// File Processing
// ===================================================================

/**
 * Process a single markdown file and extract metadata + content
 */
function processMarkdownFile(filePath: string): Omit<KnowledgeChunk, 'embedding'> {
  const fileContent = readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(fileContent);

  // Extract chunk type from directory structure
  const pathParts = filePath.split('/');
  const dirName = pathParts[pathParts.length - 2];

  let chunk_type: KnowledgeChunk['chunk_type'];
  if (dirName === 'phase_definitions') {
    chunk_type = 'phase_definition';
  } else if (dirName === 'transitions' || dirName === 'guidance_transitions') {
    chunk_type = 'transition';
  } else if (dirName === 'artifacts' || dirName === 'guidance_artifacts') {
    chunk_type = 'artifact';
  } else {
    throw new Error(`Unknown directory: ${dirName}`);
  }

  // Extract title from first heading or filename
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const fileName = pathParts[pathParts.length - 1].replace('.md', '');
  const title = titleMatch ? titleMatch[1] : fileName;

  // Extract phase from frontmatter or filename
  // For phase_definitions: phase comes from frontmatter or filename
  // For transitions: from_phase from frontmatter
  // For artifacts: null (phase-agnostic)
  let phase: string | null = null;

  if (chunk_type === 'phase_definition') {
    phase = frontmatter.phase || fileName.replace(/^\d+_/, '');
  } else if (chunk_type === 'transition') {
    phase = frontmatter.from_phase || null;
  }

  return {
    chunk_type,
    phase,
    title,
    content: content.trim(),
    metadata: {
      ...frontmatter,
      source_file: pathParts.slice(-2).join('/') // e.g., "phase_definitions/exploring.md"
    }
  };
}

/**
 * Get all markdown files from knowledge base directory
 */
async function getAllMarkdownFiles(baseDir: string): Promise<string[]> {
  const files: string[] = [];

  const subdirs = [
    'phase_definitions',
    'transitions',
    'artifacts',
    'guidance_transitions',  // Phase 4 - Tier 2 guidance
    'guidance_artifacts'     // Phase 4 - Tier 2 guidance
  ];

  for (const subdir of subdirs) {
    const dirPath = join(baseDir, subdir);
    const dirFiles = readdirSync(dirPath)
      .filter(file => file.endsWith('.md'))
      .map(file => join(dirPath, file));

    files.push(...dirFiles);
  }

  return files;
}

// ===================================================================
// Embedding Generation
// ===================================================================

/**
 * Generate embedding for text using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embedding = await embeddings.embedQuery(text);

    // Validate dimensions
    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      throw new Error(`Invalid embedding dimensions: ${embedding?.length}. Expected 1536.`);
    }

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// ===================================================================
// Database Operations
// ===================================================================

/**
 * Clear all existing data from workflow_knowledge table
 */
async function clearExistingData() {
  console.log('Clearing existing workflow_knowledge data...');

  // Delete all rows (service role has permission)
  const { error } = await supabase
    .from('workflow_knowledge')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');  // Delete all

  if (error) {
    throw new Error(`Failed to clear data: ${error.message}`);
  }

  console.log('✓ Existing data cleared');
}

/**
 * Insert a single knowledge chunk into database
 */
async function insertChunk(chunk: KnowledgeChunk) {
  const { error } = await supabase
    .from('workflow_knowledge')
    .insert({
      chunk_type: chunk.chunk_type,
      phase: chunk.phase,
      title: chunk.title,
      content: chunk.content,
      embedding: chunk.embedding,
      metadata: chunk.metadata
    });

  if (error) {
    throw new Error(`Failed to insert chunk "${chunk.title}": ${error.message}`);
  }
}

// ===================================================================
// Main Pipeline
// ===================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Workflow Knowledge Base Embedding Pipeline');
  console.log('='.repeat(60));

  const KB_BASE_DIR = join(__dirname, '../knowledge_base/workflow');

  try {
    // Step 1: Get all markdown files
    console.log('\n[1/5] Scanning knowledge base files...');
    const files = await getAllMarkdownFiles(KB_BASE_DIR);
    console.log(`✓ Found ${files.length} markdown files`);

    if (files.length !== 41) {  // 26 Phase 3 + 15 Phase 4
      console.warn(`⚠ Expected 41 files, found ${files.length}`);
    }

    // Step 2: Clear existing data
    console.log('\n[2/5] Clearing existing embeddings...');
    await clearExistingData();

    // Step 3: Process each file
    console.log('\n[3/5] Processing markdown files...');
    const chunks: Omit<KnowledgeChunk, 'embedding'>[] = [];

    for (const file of files) {
      try {
        const chunk = processMarkdownFile(file);
        chunks.push(chunk);
        console.log(`  ✓ Processed: ${chunk.title}`);
      } catch (error) {
        console.error(`  ✗ Failed to process ${file}:`, error);
        throw error;
      }
    }

    // Step 4: Generate embeddings
    console.log('\n[4/5] Generating embeddings...');
    console.log('  (This may take 1-2 minutes for 26 files)');

    let totalTokens = 0;
    const embeddedChunks: KnowledgeChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        // Embed the full content
        const embedding = await generateEmbedding(chunk.content);

        embeddedChunks.push({
          ...chunk,
          embedding
        });

        // Estimate tokens (rough: 4 chars per token)
        const estimatedTokens = Math.ceil(chunk.content.length / 4);
        totalTokens += estimatedTokens;

        console.log(`  [${i + 1}/${chunks.length}] ✓ ${chunk.title} (~${estimatedTokens} tokens)`);

        // Rate limiting: OpenAI allows 3000 RPM for ada-002
        // Add small delay to be safe
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`  ✗ Failed to embed ${chunk.title}:`, error);
        throw error;
      }
    }

    console.log(`  Total estimated tokens: ${totalTokens}`);
    console.log(`  Estimated cost: $${(totalTokens / 1000 * 0.0001).toFixed(4)}`);

    // Step 5: Insert into database
    console.log('\n[5/5] Inserting into database...');

    for (let i = 0; i < embeddedChunks.length; i++) {
      const chunk = embeddedChunks[i];

      try {
        await insertChunk(chunk);
        console.log(`  [${i + 1}/${embeddedChunks.length}] ✓ Inserted: ${chunk.title}`);
      } catch (error) {
        console.error(`  ✗ Failed to insert ${chunk.title}:`, error);
        throw error;
      }
    }

    // Verification
    console.log('\n' + '='.repeat(60));
    console.log('Verification');
    console.log('='.repeat(60));

    const { count, error: countError } = await supabase
      .from('workflow_knowledge')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Verification failed: ${countError.message}`);
    }

    console.log(`✓ Database contains ${count} rows`);

    if (count !== 41) {  // 26 Phase 3 + 15 Phase 4
      console.warn(`⚠ Expected 41 rows, found ${count}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Embedding pipeline completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('PIPELINE FAILED');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

// Run pipeline
main();
