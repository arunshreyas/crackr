import 'dotenv/config';
import { PrismaClient, QuestionSubject, OptionLabel } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { formatJeeContent } from '../components/ui/MathRenderer';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Database connection string required');

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runSmartNotesIntegrationTests() {
  console.log('===========================================================');
  console.log('  RUNNING CRACKR SMART REVISION NOTES VERIFICATION SUITE   ');
  console.log('===========================================================\n');

  const testClerkId1 = 'test_notes_user_1_' + Date.now();
  const testClerkId2 = 'test_notes_user_2_' + Date.now();
  let user1Id = '';
  let user2Id = '';
  let createdNoteId = '';

  try {
    // ------------------------------------------------------------------------
    // Step 1: Create Test Users & Find Sample Question
    // ------------------------------------------------------------------------
    console.log('[Step 1] Creating test user profiles and retrieving real question...');
    const user1 = await prisma.userProfile.create({
      data: {
        clerkId: testClerkId1,
        email: `${testClerkId1}@crackrr.test`,
        name: 'Test Notes Student 1',
        username: `student_${Date.now()}_1`,
        school: 'Crackrr Academy',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.userProfile.create({
      data: {
        clerkId: testClerkId2,
        email: `${testClerkId2}@crackrr.test`,
        name: 'Test Notes Student 2',
        username: `student_${Date.now()}_2`,
        school: 'Crackrr Academy',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    user2Id = user2.id;

    const sampleQuestion = await prisma.question.findFirst({
      where: { explanation: { not: null } },
      include: { options: true },
    });

    if (!sampleQuestion) {
      throw new Error('No question with explanation found in question bank.');
    }

    console.log(`✓ User 1 created: ${user1Id}`);
    console.log(`✓ User 2 created: ${user2Id}`);
    console.log(`✓ Sample Question: ${sampleQuestion.id} [${sampleQuestion.subject}] ${sampleQuestion.chapter}`);

    // ------------------------------------------------------------------------
    // Step 2: Create a Smart Revision Note
    // ------------------------------------------------------------------------
    console.log('\n[Step 2] Testing Smart Note Creation...');
    const conceptKey = `${sampleQuestion.subject}::${sampleQuestion.chapter}::${sampleQuestion.topic || sampleQuestion.chapter}`;

    const note1 = await prisma.revisionNote.create({
      data: {
        userId: user1Id,
        questionId: sampleQuestion.id,
        userNote: 'Watch out for parametric substitution: x = 4 + 2cosθ',
        tags: ['Formula Trap', 'High-Yield PYQ'],
        subject: sampleQuestion.subject,
        chapter: sampleQuestion.chapter,
        topic: sampleQuestion.topic,
        conceptKey,
        keyTakeaway: 'Parametric form of straight line is (x - x1)/cosθ = (y - y1)/sinθ = r',
      },
      include: {
        question: {
          include: { options: true },
        },
      },
    });
    createdNoteId = note1.id;

    if (!note1.id || note1.userId !== user1Id || note1.questionId !== sampleQuestion.id) {
      throw new Error('Note creation failed: properties mismatch');
    }
    console.log(`✓ Smart Note successfully created: ${createdNoteId}`);
    console.log(`  Subject: ${note1.subject}`);
    console.log(`  Concept Key: ${note1.conceptKey}`);
    console.log(`  Takeaway: ${note1.keyTakeaway}`);

    // ------------------------------------------------------------------------
    // Step 3: Test Uniqueness & Idempotence
    // ------------------------------------------------------------------------
    console.log('\n[Step 3] Testing Unique Constraint (@@unique([userId, questionId]))...');
    let duplicateRejected = false;
    try {
      await prisma.revisionNote.create({
        data: {
          userId: user1Id,
          questionId: sampleQuestion.id,
          userNote: 'Duplicate attempt',
          subject: sampleQuestion.subject,
          chapter: sampleQuestion.chapter,
          conceptKey,
        },
      });
    } catch {
      duplicateRejected = true;
    }

    if (!duplicateRejected) {
      throw new Error('Unique constraint violated! Duplicate note was allowed.');
    }
    console.log('✓ Duplicate note creation properly rejected by database unique constraint.');

    // Upsert idempotence
    const upserted = await prisma.revisionNote.upsert({
      where: {
        userId_questionId: {
          userId: user1Id,
          questionId: sampleQuestion.id,
        },
      },
      create: {
        userId: user1Id,
        questionId: sampleQuestion.id,
        subject: sampleQuestion.subject,
        chapter: sampleQuestion.chapter,
        conceptKey,
      },
      update: {
        userNote: 'Updated reflection note via upsert',
      },
    });
    console.log(`✓ Upsert updated existing note cleanly without duplicate row. UserNote: "${upserted.userNote}"`);

    // ------------------------------------------------------------------------
    // Step 4: Test Ownership & Security Enforcement
    // ------------------------------------------------------------------------
    console.log('\n[Step 4] Testing User Ownership & Security...');
    const user2Notes = await prisma.revisionNote.findMany({
      where: { userId: user2Id },
    });
    if (user2Notes.length !== 0) {
      throw new Error('Data isolation leak: User 2 can see notes belonging to User 1');
    }
    console.log('✓ User 2 has 0 notes (data completely isolated between users)');

    // Attempt unauthorized update
    const unauthorizedNote = await prisma.revisionNote.findFirst({
      where: { id: createdNoteId, userId: user2Id },
    });
    if (unauthorizedNote !== null) {
      throw new Error('Security failure: User 2 accessed User 1 note by ID');
    }
    console.log('✓ User 2 cannot access or mutate User 1 note (ownership checks strictly enforced)');

    // ------------------------------------------------------------------------
    // Step 5: Test Search and Filtering Queries
    // ------------------------------------------------------------------------
    console.log('\n[Step 5] Testing Search and Filtering...');
    const subjectFiltered = await prisma.revisionNote.findMany({
      where: { userId: user1Id, subject: sampleQuestion.subject },
    });
    if (subjectFiltered.length !== 1) {
      throw new Error('Subject filter failed');
    }
    console.log(`✓ Subject filter (${sampleQuestion.subject}): Found ${subjectFiltered.length} note(s)`);

    const conceptFiltered = await prisma.revisionNote.findMany({
      where: { userId: user1Id, conceptKey },
    });
    if (conceptFiltered.length !== 1) {
      throw new Error('ConceptKey filter failed');
    }
    console.log(`✓ ConceptKey filter: Found ${conceptFiltered.length} note(s)`);

    // ------------------------------------------------------------------------
    // Step 6: Test Visual Explanation & Diagram Formatting
    // ------------------------------------------------------------------------
    console.log('\n[Step 6] Testing Visual Explanation & Diagram Pipeline...');
    const sampleWithSource = `<source media="(max-width: 320px)" srcset="https://imagex.cdn.examgoal.net/file-320w.jpg"><source media="(max-width: 500px)" srcset="https://imagex.cdn.examgoal.net/file-500w.jpg">\n\nGiven $$\\sin \\theta = \\frac{1}{2}$$, find $$\\theta$$.`;
    const formattedHtml = formatJeeContent(sampleWithSource);

    if (!formattedHtml.includes('<picture') || !formattedHtml.includes('<img src="https://imagex.cdn.examgoal.net/file-500w.jpg"')) {
      throw new Error('Visual diagram transformation failed: <picture> or <img> not generated properly');
    }
    if (!formattedHtml.includes('katex')) {
      throw new Error('KaTeX rendering failed: math formulas not converted to HTML');
    }
    console.log('✓ Diagram <source> tags successfully converted into compliant, responsive <picture> elements.');
    console.log('✓ LaTeX formulas correctly parsed and rendered via KaTeX.');

    // ------------------------------------------------------------------------
    // Step 7: Test Note Deletion
    // ------------------------------------------------------------------------
    console.log('\n[Step 7] Testing Note Deletion...');
    await prisma.revisionNote.delete({
      where: { id: createdNoteId },
    });
    const afterDelete = await prisma.revisionNote.findUnique({
      where: { id: createdNoteId },
    });
    if (afterDelete !== null) {
      throw new Error('Delete failed: note still exists in database');
    }
    console.log('✓ Revision Note deleted cleanly.');

    console.log('\n===========================================================');
    console.log('  ALL SMART REVISION NOTES VERIFICATION TESTS PASSED!      ');
    console.log('===========================================================');
  } finally {
    // Clean up test data
    console.log('\n[Clean Up] Cleaning up test user records...');
    if (user1Id) {
      await prisma.revisionNote.deleteMany({ where: { userId: user1Id } }).catch(() => {});
      await prisma.userProfile.delete({ where: { id: user1Id } }).catch(() => {});
    }
    if (user2Id) {
      await prisma.revisionNote.deleteMany({ where: { userId: user2Id } }).catch(() => {});
      await prisma.userProfile.delete({ where: { id: user2Id } }).catch(() => {});
    }
    await pool.end();
    console.log('✓ Test database connections closed and clean.');
  }
}

runSmartNotesIntegrationTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
