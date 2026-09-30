/**
 * ============================================================================
 * CRACKR JEE MAIN MCQ INGESTION PIPELINE
 * ============================================================================
 * 
 * DISCLAIMER & COPYRIGHT NOTICE:
 * The source dataset is derived from reverse-engineered exam question data
 * hosted in 'HostServer001/jee_mains_pyqs_data_base'. Commercial usage rights
 * must be independently verified before public/commercial deployment.
 * 
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { loadSourceQuestions } from './source/extractor';
import { validateQuestion } from './validate/rules';
import { normalizeQuestion } from './normalize/question';
import { computeContentHash, DeduplicationRegistry } from './deduplicate/hash';
import { batchGenerateEmbeddings } from './embed/generator';
import { writeQuestionsToPostgres } from './postgres/writer';
import { writeVectorsToPostgres } from './vector/writer';
import { saveIngestionReport, printConsoleSummary } from './report/reporter';
import {
  NormalizedQuestion,
  RejectedQuestionRecord,
  IngestionStatistics,
  RejectionReason,
} from './types';

import * as fs from 'fs';
import * as path from 'path';

// Load .env file if environment variables not pre-loaded
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

// Initialize Prisma client with pg driver adapter
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL is required in environment.');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const startTime = new Date();
  console.log('====================================================');
  console.log('   STARTING CRACKR JEE MCQ INGESTION PIPELINE      ');
  console.log('====================================================\n');

  const rejectionBreakdown: Record<RejectionReason, number> = {
    MISSING_QUESTION_ID: 0,
    NOT_MCQ: 0,
    MISSING_QUESTION_TEXT: 0,
    INVALID_OPTION_COUNT: 0,
    EMPTY_OPTION_TEXT: 0,
    IMAGE_QUESTION: 0,
    IMAGE_OPTION: 0,
    MISSING_ANSWER: 0,
    INVALID_ANSWER: 0,
    UNRECOGNIZED_SUBJECT: 0,
    DUPLICATE_CONTENT: 0,
    EMBEDDING_FAILURE: 0,
    DATABASE_ERROR: 0,
  };

  const rejectedLog: RejectedQuestionRecord[] = [];
  const dedup = new DeduplicationRegistry();
  const validQuestions: NormalizedQuestion[] = [];

  // 1. Load source dataset
  const rawQuestions = await loadSourceQuestions();
  const totalSource = rawQuestions.length;
  let mcqsDetected = 0;

  console.log(`\n[Pipeline] Processing ${totalSource} source questions through validation layer...`);

  // 2. Validate, Normalize & Deduplicate
  for (const raw of rawQuestions) {
    const qType = (raw.type || '').trim().toLowerCase();
    if (qType === 'mcq') {
      mcqsDetected++;
    }

    const validation = validateQuestion(raw);

    if (!validation.isValid) {
      const reason = validation.reason || 'NOT_MCQ';
      rejectionBreakdown[reason] = (rejectionBreakdown[reason] || 0) + 1;
      rejectedLog.push({
        externalId: raw.question_id || 'UNKNOWN',
        reason,
        subject: raw.subject,
        chapter: raw.chapter,
        topic: raw.topic,
        year: raw.year,
        diagnostic: validation.diagnostic,
      });
      continue;
    }

    // Deduplication check
    const contentHash = computeContentHash(raw);
    if (dedup.isDuplicate(raw.question_id, contentHash)) {
      rejectionBreakdown.DUPLICATE_CONTENT++;
      rejectedLog.push({
        externalId: raw.question_id,
        reason: 'DUPLICATE_CONTENT',
        subject: raw.subject,
        chapter: raw.chapter,
        topic: raw.topic,
        year: raw.year,
        diagnostic: `Duplicate content hash (${contentHash.slice(0, 12)}...)`,
      });
      continue;
    }

    const normalized = normalizeQuestion(raw, contentHash);
    validQuestions.push(normalized);
  }

  console.log(`[Pipeline] Validated ${validQuestions.length} clean MCQs (Rejected ${rejectedLog.length}).`);

  // 3. Persist Questions to PostgreSQL
  console.log(`\n[Postgres] Ingesting ${validQuestions.length} questions and options into PostgreSQL...`);
  const pgResult = await writeQuestionsToPostgres(
    prisma,
    validQuestions,
    250,
    (processed, total) => {
      process.stdout.write(`\r[Postgres] Ingested ${processed} / ${total} questions...`);
    }
  );
  console.log(`\n[Postgres] Completed. Successfully saved: ${pgResult.successCount}, Failed: ${pgResult.failedIds.length}`);

  // 4. Generate Embeddings
  console.log(`\n[Embeddings] Generating vector embeddings for ${validQuestions.length} questions...`);
  const embeddingsMap = await batchGenerateEmbeddings(validQuestions, 250);
  console.log(`[Embeddings] Generated ${embeddingsMap.size} embeddings.`);

  // 5. Persist Vectors to PostgreSQL (QuestionVector)
  console.log(`\n[Vector] Writing vectors and metadata to QuestionVector table...`);
  const vectorResult = await writeVectorsToPostgres(
    prisma,
    validQuestions,
    embeddingsMap,
    250,
    (processed, total) => {
      process.stdout.write(`\r[Vector] Ingested ${processed} / ${total} vectors...`);
    }
  );
  console.log(`\n[Vector] Completed. Successfully saved: ${vectorResult.successCount}, Failed: ${vectorResult.failedIds.length}`);

  // 6. Generate Ingestion Report
  const endTime = new Date();
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

  const stats: IngestionStatistics = {
    sourceQuestionsCount: totalSource,
    mcqsDetectedCount: mcqsDetected,
    importedCount: pgResult.successCount,
    rejectedCount: rejectedLog.length,
    rejectionBreakdown,
    postgresRecordsCount: pgResult.successCount,
    vectorRecordsCount: vectorResult.successCount,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationSeconds,
  };

  saveIngestionReport(stats, rejectedLog);
  printConsoleSummary(stats);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('[Fatal Error] Ingestion failed:', err);
  process.exit(1);
});
