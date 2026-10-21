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

async function main() {
  console.log('Testing Stage 5: Dashboard UI & Data Integration...');
  const { prisma } = await import('../lib/server/db');
  const { getDashboardData } = await import('../lib/services/dashboard');

  try {
    // Find a user with clerkId
    const user = await prisma.userProfile.findFirst({
      where: { clerkId: { not: '' } },
    });

    if (!user) {
      console.log('No user found to test dashboard data.');
      return;
    }

    console.log(`Testing with user: ${user.name} (${user.clerkId})`);
    const data = await getDashboardData(user.clerkId);

    if (!data) {
      throw new Error('getDashboardData returned null');
    }

    if (!data.conceptDiagnostics) {
      throw new Error('data.conceptDiagnostics is missing!');
    }

    console.log('Dashboard data fetched successfully:');
    console.log(`- Health Score: ${data.conceptDiagnostics.overallHealthScore}%`);
    console.log(`- Total Concepts Attempted: ${data.conceptDiagnostics.totalConceptsAttempted}`);
    console.log(`- Critical Concepts Count: ${data.conceptDiagnostics.criticalCount}`);
    console.log(`- Needs Attention Count: ${data.conceptDiagnostics.needsAttentionCount}`);
    console.log(`- Top Weak Concepts Count: ${data.conceptDiagnostics.topWeakConcepts.length}`);

    if (data.conceptDiagnostics.topWeakConcepts.length > 0) {
      const top = data.conceptDiagnostics.topWeakConcepts[0];
      console.log(`- Sample Top Weak Concept: ${top.subject} > ${top.topic} (${top.weaknessLevel}, acc: ${top.accuracy}%)`);
      console.log(`- Action: ${top.recommendedAction}`);
    }

    console.log('Stage 5 verification PASSED!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
