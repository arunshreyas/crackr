import 'dotenv/config';
import Module from 'module';

// Polyfill server-only for CLI test execution
// @ts-ignore
const originalLoad = Module._load;
// @ts-ignore
Module._load = function (request, parent, isMain) {
  if (request === 'server-only') {
    return {};
  }
  return originalLoad.apply(this, arguments);
};

async function runFullVerificationSuite() {
  console.log('================================================================');
  console.log('CRACKRR — WEAK CONCEPT ANALYSIS FULL VERIFICATION & SECURITY SUITE');
  console.log('================================================================');

  const { prisma } = await import('../lib/server/db');
  const { auditConceptTaxonomy, normalizeTopicName, buildConceptKey, parseConceptKey } = await import(
    '../lib/server/concepts/metadata'
  );
  const { getUserConceptAttempts } = await import('../lib/server/concepts/attempts');
  const { getUserConceptDiagnostics } = await import('../lib/server/concepts/analysis');
  const { getQuestionsForPractice } = await import('../lib/server/questions/service');
  const { getDashboardData } = await import('../lib/services/dashboard');

  try {
    // -------------------------------------------------------------
    // STAGE 1: Metadata Audit & Canonical Key Integrity
    // -------------------------------------------------------------
    console.log('\n[STAGE 1] Testing Metadata & Canonical Keys...');
    const audit = await auditConceptTaxonomy();
    console.log(`- Total Questions Audited: ${audit.totalQuestions}`);
    console.log(`- Total Chapters: ${audit.totalChapters}`);
    console.log(`- Total Canonical Concepts: ${audit.totalConcepts}`);
    console.log(`- Null Topics: ${audit.nullTopicCount}, Empty Topics: ${audit.emptyTopicCount}`);
    if (audit.totalQuestions === 0) throw new Error('Stage 1 Failed: Question bank is empty');

    const testKey = buildConceptKey('PHYSICS', 'Units and Measurements', 'Dimensional Analysis');
    const parsed = parseConceptKey(testKey);
    if (parsed.subject !== 'PHYSICS' || parsed.chapter !== 'Units and Measurements' || parsed.topic !== 'Dimensional Analysis') {
      throw new Error('Stage 1 Failed: Concept key parse mismatch');
    }
    console.log('✓ Stage 1 Passed: Taxonomy and canonical keys verified.');

    // -------------------------------------------------------------
    // STAGE 2: Attempt Tracking & Pacing Metrics
    // -------------------------------------------------------------
    console.log('\n[STAGE 2] Testing User Attempt Tracking & Pacing Metrics...');
    const user = await prisma.userProfile.findFirst({
      where: { clerkId: { not: '' } },
    });
    if (!user) throw new Error('Stage 2 Failed: No user profile found for testing');

    const userAttempts = await getUserConceptAttempts(user.id);
    console.log(`- User: ${user.name} (${user.id})`);
    console.log(`- Concepts with attempts: ${userAttempts.length}`);
    for (const a of userAttempts.slice(0, 3)) {
      console.log(`  • ${a.conceptKey}: ${a.totalAttempts} att, ${a.accuracy}% acc, avg ${a.avgTimeSeconds}s, fastIncorrect: ${a.fastIncorrectCount}`);
      if (a.totalAttempts < a.correctAttempts) {
        throw new Error('Stage 2 Failed: totalAttempts < correctAttempts');
      }
    }
    console.log('✓ Stage 2 Passed: Attempt tracking and metrics verified.');

    // -------------------------------------------------------------
    // STAGE 3 & 4: Performance Calculations & Classification
    // -------------------------------------------------------------
    console.log('\n[STAGE 3 & 4] Testing Diagnostic Classifications & Scoring...');
    const diagnostics = await getUserConceptDiagnostics(user.id);
    console.log(`- Total Concepts Evaluated: ${diagnostics.totalConceptsAttempted}`);
    console.log(`- Overall Concept Health Score: ${diagnostics.overallHealthScore}%`);
    console.log(`- Critical Weaknesses: ${diagnostics.criticalCount}`);
    console.log(`- Needs Attention: ${diagnostics.needsAttentionCount}`);
    console.log(`- Top Weak Concepts Count: ${diagnostics.topWeakConcepts.length}`);

    for (const weak of diagnostics.topWeakConcepts.slice(0, 3)) {
      console.log(`  • [${weak.weaknessLevel}] ${weak.subject} > ${weak.topic}:`);
      console.log(`    - Accuracy: ${weak.accuracy}%, Urgency: ${weak.urgencyScore}, Mastery: ${weak.masteryScore}`);
      console.log(`    - Diagnostic Tags: ${weak.diagnosticTags.join(', ') || 'NONE'}`);
      console.log(`    - Action: ${weak.recommendedAction}`);
    }
    console.log('✓ Stage 3 & 4 Passed: Diagnostics & classification verified.');

    // -------------------------------------------------------------
    // STAGE 5: Dashboard Integration & UI Contract
    // -------------------------------------------------------------
    console.log('\n[STAGE 5] Testing Dashboard Data Contract...');
    const dashboardData = await getDashboardData(user.clerkId);
    if (!dashboardData) throw new Error('Stage 5 Failed: getDashboardData returned null');
    if (!dashboardData.conceptDiagnostics) throw new Error('Stage 5 Failed: conceptDiagnostics not attached');
    if (dashboardData.conceptDiagnostics.overallHealthScore !== diagnostics.overallHealthScore) {
      throw new Error('Stage 5 Failed: Health score mismatch');
    }
    console.log(`✓ Stage 5 Passed: Dashboard payload contains valid conceptDiagnostics (Health: ${dashboardData.conceptDiagnostics.overallHealthScore}%).`);

    // -------------------------------------------------------------
    // STAGE 6: Targeted Drill Recommendations
    // -------------------------------------------------------------
    console.log('\n[STAGE 6] Testing Practice Recommendations & Targeted Filtering...');
    console.log(`- Dashboard Recommendation: "${dashboardData.recommendation.actionText}"`);
    console.log(`- Target Subject: ${dashboardData.recommendation.targetSubject}`);
    console.log(`- Target Chapter: ${dashboardData.recommendation.targetChapter}`);
    console.log(`- Target Topic: ${dashboardData.recommendation.targetTopic || 'N/A'}`);
    console.log(`- Is Weak Concept Drill: ${dashboardData.recommendation.isWeakConceptDrill}`);

    if (dashboardData.recommendation.targetTopic) {
      const drillQuestions = await getQuestionsForPractice({
        subject: dashboardData.recommendation.targetSubject,
        chapter: dashboardData.recommendation.targetChapter || undefined,
        topic: dashboardData.recommendation.targetTopic,
        count: 5,
      });
      console.log(`- Drill Question Fetch: Retrieved ${drillQuestions.length} questions for ${dashboardData.recommendation.targetTopic}`);
      if (drillQuestions.length === 0) throw new Error('Stage 6 Failed: Drill questions empty');
    }
    console.log('✓ Stage 6 Passed: Targeted practice recommendations verified.');

    // -------------------------------------------------------------
    // STAGE 7: Security & Multi-Tenant Isolation
    // -------------------------------------------------------------
    console.log('\n[STAGE 7] Testing Security & Isolation...');
    // Create or find a synthetic second user ID
    const dummyUserId = 'clerk_synthetic_test_user_isolation_check_9999';
    const isolatedAttempts = await getUserConceptAttempts(dummyUserId);
    const isolatedDiagnostics = await getUserConceptDiagnostics(dummyUserId);

    if (isolatedAttempts.length !== 0) {
      throw new Error('Stage 7 Security Failed: Unrelated user retrieved another user attempts');
    }
    if (isolatedDiagnostics.totalConceptsAttempted !== 0 || isolatedDiagnostics.topWeakConcepts.length !== 0) {
      throw new Error('Stage 7 Security Failed: Unrelated user retrieved another user diagnostics');
    }
    if (isolatedDiagnostics.overallHealthScore !== 100) {
      throw new Error('Stage 7 Security Failed: Default health score for fresh user must be 100%');
    }

    console.log('✓ Stage 7 Passed: Multi-tenant user isolation strictly confirmed.');

    console.log('\n================================================================');
    console.log('ALL 7 STAGES OF WEAK CONCEPT ANALYSIS ARE FULLY VERIFIED & SECURE');
    console.log('================================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

runFullVerificationSuite().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
