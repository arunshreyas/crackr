import * as fs from 'fs';
import * as path from 'path';
import { IngestionStatistics, RejectedQuestionRecord } from '../types';

export function saveIngestionReport(
  stats: IngestionStatistics,
  rejectedLog: RejectedQuestionRecord[],
  outputDir: string = path.resolve(process.cwd(), 'data')
): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, 'ingestion-report.json');
  const rejectedPath = path.join(outputDir, 'rejected-questions.json');

  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2), 'utf-8');
  fs.writeFileSync(rejectedPath, JSON.stringify(rejectedLog, null, 2), 'utf-8');

  console.log(`[Report] Ingestion report written to ${reportPath}`);
  console.log(`[Report] Rejected questions log written to ${rejectedPath}`);
}

export function printConsoleSummary(stats: IngestionStatistics): void {
  console.log('\n====================================');
  console.log('    CRACKR JEE INGESTION COMPLETE   ');
  console.log('====================================\n');
  console.log(`Source questions:       ${stats.sourceQuestionsCount.toLocaleString()}`);
  console.log(`MCQs detected:          ${stats.mcqsDetectedCount.toLocaleString()}`);
  console.log(`Imported:               ${stats.importedCount.toLocaleString()}`);
  console.log(`Rejected:               ${stats.rejectedCount.toLocaleString()}`);
  console.log('\nRejected breakdown:');

  for (const [reason, count] of Object.entries(stats.rejectionBreakdown)) {
    if (count > 0) {
      console.log(`  - ${reason.padEnd(26)}: ${count.toLocaleString()}`);
    }
  }

  console.log('\nDatabase sync:');
  console.log(`  PostgreSQL records:    ${stats.postgresRecordsCount.toLocaleString()}`);
  console.log(`  Vector records:        ${stats.vectorRecordsCount.toLocaleString()}`);
  console.log(`  Duration:              ${stats.durationSeconds.toFixed(1)}s`);
  console.log('\n====================================\n');
}
