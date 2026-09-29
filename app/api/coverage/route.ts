import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Standard syllabus curriculum map
const DEFAULT_SYLLABUS = {
  Physics: [
    { id: 'phy-1', name: 'Work, Energy & Power', domain: 'Mechanics', totalQuestions: 40, weight: 12 },
    { id: 'phy-2', name: 'Rotational Dynamics', domain: 'Mechanics', totalQuestions: 45, weight: 14 },
    { id: 'phy-3', name: 'Electrostatics & Capacitance', domain: 'Electrodynamics', totalQuestions: 50, weight: 15 },
    { id: 'phy-4', name: 'Current Electricity & Magnetism', domain: 'Electrodynamics', totalQuestions: 45, weight: 14 },
    { id: 'phy-5', name: 'Thermodynamics & Kinetic Theory', domain: 'Thermal Physics', totalQuestions: 35, weight: 10 },
    { id: 'phy-6', name: 'Wave Optics & Ray Optics', domain: 'Optics', totalQuestions: 35, weight: 12 },
    { id: 'phy-7', name: 'Modern Physics & Nuclear', domain: 'Modern Physics', totalQuestions: 30, weight: 13 },
  ],
  Chemistry: [
    { id: 'chem-1', name: 'Chemical Bonding & Molecular Structure', domain: 'Inorganic', totalQuestions: 40, weight: 12 },
    { id: 'chem-2', name: 'Thermodynamics & Equilibrium', domain: 'Physical', totalQuestions: 50, weight: 15 },
    { id: 'chem-3', name: 'Organic Reaction Mechanisms', domain: 'Organic', totalQuestions: 60, weight: 18 },
    { id: 'chem-4', name: 'Coordination Compounds & d-Block', domain: 'Inorganic', totalQuestions: 35, weight: 12 },
    { id: 'chem-5', name: 'Electrochemistry & Kinetics', domain: 'Physical', totalQuestions: 45, weight: 14 },
    { id: 'chem-6', name: 'Aldehydes, Ketones & Amines', domain: 'Organic', totalQuestions: 45, weight: 14 },
  ],
  Mathematics: [
    { id: 'math-1', name: 'Definite Integration & Differential Eq', domain: 'Calculus', totalQuestions: 55, weight: 18 },
    { id: 'math-2', name: 'Vectors & 3D Geometry', domain: 'Geometry', totalQuestions: 45, weight: 15 },
    { id: 'math-3', name: 'Matrices & Determinants', domain: 'Algebra', totalQuestions: 35, weight: 10 },
    { id: 'math-4', name: 'Complex Numbers & Quadratics', domain: 'Algebra', totalQuestions: 40, weight: 12 },
    { id: 'math-5', name: 'Probability & Combinatorics', domain: 'Discrete Math', totalQuestions: 40, weight: 12 },
    { id: 'math-6', name: 'Conic Sections', domain: 'Coordinate Geometry', totalQuestions: 45, weight: 15 },
  ],
  Biology: [
    { id: 'bio-1', name: 'Human Physiology', domain: 'Zoology', totalQuestions: 60, weight: 20 },
    { id: 'bio-2', name: 'Genetics & Evolution', domain: 'Genetics', totalQuestions: 55, weight: 20 },
    { id: 'bio-3', name: 'Cell Structure & Function', domain: 'Cytology', totalQuestions: 40, weight: 15 },
    { id: 'bio-4', name: 'Plant Physiology', domain: 'Botany', totalQuestions: 45, weight: 15 },
    { id: 'bio-5', name: 'Ecology & Environment', domain: 'Ecology', totalQuestions: 40, weight: 15 },
  ],
};

export async function GET() {
  try {
    const user = await currentUser();

    let profile = null;
    if (user) {
      profile = await prisma.userProfile.findUnique({
        where: { clerkId: user.id },
      });
    }

    const answered = profile?.questionsAnswered ?? 38;
    const correct = profile?.questionsCorrect ?? 32;
    const dailyGoal = profile?.dailyGoal ?? 25;
    const xp = profile?.xp ?? 1240;
    const currentStreak = profile?.currentStreak ?? 7;
    const stream = profile?.stream ?? 'PCM';

    const accuracy = answered > 0 ? Number(((correct / answered) * 100).toFixed(1)) : 0;

    // Determine relevant subjects based on stream
    const isBio = stream === 'PCB' || stream === 'PCMB';
    const isMath = stream === 'PCM' || stream === 'PCMC' || stream === 'PCMB';

    const subjectBreakdown = [
      {
        subject: 'Physics',
        coveragePercent: Math.min(100, Math.round((answered * 0.4) + 55)),
        masteryPercent: Math.min(100, Math.round(accuracy * 0.95)),
        totalQuestionsAvailable: 280,
        chapters: DEFAULT_SYLLABUS.Physics.map((ch, idx) => ({
          ...ch,
          status: idx < 3 ? 'completed' : idx === 3 ? 'in-progress' : 'queued',
          progressPercent: idx < 3 ? 100 : idx === 3 ? 45 : 0,
        })),
      },
      {
        subject: 'Chemistry',
        coveragePercent: Math.min(100, Math.round((answered * 0.35) + 48)),
        masteryPercent: Math.min(100, Math.round(accuracy * 0.92)),
        totalQuestionsAvailable: 275,
        chapters: DEFAULT_SYLLABUS.Chemistry.map((ch, idx) => ({
          ...ch,
          status: idx < 2 ? 'completed' : idx === 2 ? 'in-progress' : 'queued',
          progressPercent: idx < 2 ? 100 : idx === 2 ? 60 : 0,
        })),
      },
    ];

    if (isMath) {
      subjectBreakdown.push({
        subject: 'Mathematics',
        coveragePercent: Math.min(100, Math.round((answered * 0.45) + 65)),
        masteryPercent: Math.min(100, Math.round(accuracy * 1.02)),
        totalQuestionsAvailable: 260,
        chapters: DEFAULT_SYLLABUS.Mathematics.map((ch, idx) => ({
          ...ch,
          status: idx < 4 ? 'completed' : idx === 4 ? 'in-progress' : 'queued',
          progressPercent: idx < 4 ? 100 : idx === 4 ? 30 : 0,
        })),
      });
    }

    if (isBio) {
      subjectBreakdown.push({
        subject: 'Biology',
        coveragePercent: Math.min(100, Math.round((answered * 0.42) + 60)),
        masteryPercent: Math.min(100, Math.round(accuracy * 0.98)),
        totalQuestionsAvailable: 240,
        chapters: DEFAULT_SYLLABUS.Biology.map((ch, idx) => ({
          ...ch,
          status: idx < 3 ? 'completed' : idx === 3 ? 'in-progress' : 'queued',
          progressPercent: idx < 3 ? 100 : idx === 3 ? 50 : 0,
        })),
      });
    }

    // Overall calculation
    const overallCoveragePercent = Math.round(
      subjectBreakdown.reduce((sum, s) => sum + s.coveragePercent, 0) / subjectBreakdown.length
    );

    const overallMasteryPercent = Math.round(
      subjectBreakdown.reduce((sum, s) => sum + s.masteryPercent, 0) / subjectBreakdown.length
    );

    return NextResponse.json({
      success: true,
      profile: {
        id: profile?.id ?? null,
        name: profile?.name ?? (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Alex'),
        username: profile?.username ?? (user?.username || 'alex_2026'),
        grade: profile?.grade ?? 'Class 12',
        stream,
        exam: 'JEE Main',
        dailyGoal,
        xp,
        level: Math.max(1, Math.floor(xp / 500) + 1),
        currentStreak,
        longestStreak: profile?.longestStreak ?? 7,
      },
      coverage: {
        overallCoveragePercent,
        overallMasteryPercent,
        questionsAnswered: answered,
        questionsCorrect: correct,
        accuracyPercent: accuracy,
        dailyGoalProgress: {
          target: dailyGoal,
          completedToday: Math.min(dailyGoal, answered % dailyGoal || 14),
          percent: Math.round(((Math.min(dailyGoal, answered % dailyGoal || 14)) / dailyGoal) * 100),
        },
        subjects: subjectBreakdown,
        activeDrill: {
          id: 'phy-1',
          subject: 'Physics',
          topic: 'Work, Energy & Power',
          domain: 'Mechanics',
          questionsTotal: 10,
          questionsCompleted: 3,
          timeRemainingMin: 12,
        },
      },
    });
  } catch (error) {
    console.error('Error in /api/coverage GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compute coverage metrics' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { isCorrect = true, xpEarned = 25 } = body;

    const profile = await prisma.userProfile.findUnique({
      where: { clerkId: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found. Complete onboarding first.' },
        { status: 404 }
      );
    }

    const newAnswered = profile.questionsAnswered + 1;
    const newCorrect = isCorrect ? profile.questionsCorrect + 1 : profile.questionsCorrect;
    const newXp = profile.xp + (Number(xpEarned) || 25);
    const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);

    const updated = await prisma.userProfile.update({
      where: { clerkId: user.id },
      data: {
        questionsAnswered: newAnswered,
        questionsCorrect: newCorrect,
        xp: newXp,
        level: newLevel,
        lastPracticeAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      updated: {
        questionsAnswered: updated.questionsAnswered,
        questionsCorrect: updated.questionsCorrect,
        xp: updated.xp,
        level: updated.level,
        accuracy: Number(((updated.questionsCorrect / updated.questionsAnswered) * 100).toFixed(1)),
      },
    });
  } catch (error) {
    console.error('Error in /api/coverage POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record practice result' },
      { status: 500 }
    );
  }
}
