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
  console.log('Testing Stage 6: Practice Recommendations & Targeted Weak Concept Drills...');
  const { prisma } = await import('../lib/server/db');
  const { getQuestionsForPractice } = await import('../lib/server/questions/service');
  const { getDashboardData } = await import('../lib/services/dashboard');

  try {
    // 1. Test getQuestionsForPractice with topic parameter
    console.log('\n--- 1. Testing getQuestionsForPractice with topic ---');
    const sampleQ = await prisma.question.findFirst({
      where: { topic: { not: null }, type: 'MCQ' },
      select: { subject: true, chapter: true, topic: true },
    });

    if (!sampleQ || !sampleQ.topic) {
      throw new Error('No question with topic found in DB');
    }

    console.log(`Targeting topic: ${sampleQ.subject} > ${sampleQ.chapter} > ${sampleQ.topic}`);
    const targetedQuestions = await getQuestionsForPractice({
      subject: sampleQ.subject,
      chapter: sampleQ.chapter,
      topic: sampleQ.topic,
      count: 5,
    });

    console.log(`Retrieved ${targetedQuestions.length} questions.`);
    if (targetedQuestions.length === 0) {
      throw new Error('Failed to retrieve targeted practice questions');
    }

    // Check that at least some questions match the exact topic
    const matchingTopicCount = targetedQuestions.filter((q) => q.topic === sampleQ.topic).length;
    console.log(`${matchingTopicCount} of ${targetedQuestions.length} questions match topic "${sampleQ.topic}"`);
    if (matchingTopicCount === 0) {
      throw new Error('None of the retrieved questions matched the requested topic');
    }

    // 2. Test fallback behavior with a rare / non-existent topic
    console.log('\n--- 2. Testing graceful fallback with rare/fictional topic ---');
    const fallbackQuestions = await getQuestionsForPractice({
      subject: sampleQ.subject,
      chapter: sampleQ.chapter,
      topic: 'NonExistentTopicForTesting12345',
      count: 3,
    });
    console.log(`Fallback retrieved ${fallbackQuestions.length} questions from chapter "${sampleQ.chapter}".`);
    if (fallbackQuestions.length === 0) {
      throw new Error('Fallback failed to return questions from chapter');
    }

    // 3. Test Dashboard recommendation prioritization
    console.log('\n--- 3. Testing Dashboard recommendation integration ---');
    const user = await prisma.userProfile.findFirst({
      where: { clerkId: { not: '' } },
    });

    if (user) {
      const data = await getDashboardData(user.clerkId);
      if (data) {
        console.log(`Dashboard recommendation for ${user.name}:`);
        console.log(`- actionText: ${data.recommendation.actionText}`);
        console.log(`- targetSubject: ${data.recommendation.targetSubject}`);
        console.log(`- targetChapter: ${data.recommendation.targetChapter}`);
        console.log(`- targetTopic: ${data.recommendation.targetTopic}`);
        console.log(`- isWeakConceptDrill: ${data.recommendation.isWeakConceptDrill}`);
      }
    }

    console.log('\nStage 6 verification PASSED!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
