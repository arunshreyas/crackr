'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { QuestionSubject, OptionLabel } from '@prisma/client';
import {
  SubjectCatalog,
  ClientSafeQuestion,
} from '@/lib/server/questions/service';
import {
  startPracticeAction,
  submitAnswerAction,
  completeSessionAction,
  abandonSessionAction,
  getSessionByIdAction,
  getActiveSessionsAction,
} from '@/app/actions/practice';
import {
  PracticeSessionSummary,
  AnswerSubmissionResult,
  ActiveSessionState,
  ActiveSessionAnswerState,
  ActiveSessionSummaryItem,
} from '@/lib/server/practice/service';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Play,
  Trash2,
  Bookmark,
  Calendar,
} from 'lucide-react';
import { MathRenderer } from '@/components/ui/MathRenderer';

interface PracticeContainerProps {
  catalog: SubjectCatalog;
  preferredDifficulty: string | null;
  initialActiveSessions?: ActiveSessionSummaryItem[];
}

type PracticeState = 'CONFIG' | 'ACTIVE' | 'RESULTS';

const PracticeTimer = React.memo(function PracticeTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex items-center gap-1 font-mono text-zinc-300">
      <Clock className="w-3 h-3 text-zinc-500" />
      <span>{`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`}</span>
    </div>
  );
});

function formatLastActive(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export function PracticeContainer({
  catalog,
  preferredDifficulty,
  initialActiveSessions = [],
}: PracticeContainerProps) {
  const searchParams = useSearchParams();

  const urlSubject = searchParams.get('subject')?.toUpperCase();
  const initialSubject: QuestionSubject =
    urlSubject === 'CHEMISTRY' || urlSubject === 'MATHEMATICS' || urlSubject === 'PHYSICS'
      ? (urlSubject as QuestionSubject)
      : 'PHYSICS';

  const urlChapter = searchParams.get('chapter');
  const initialChapter = urlChapter || 'ALL';

  // Active persistent sessions list
  const [activeSessions, setActiveSessions] = useState<ActiveSessionSummaryItem[]>(initialActiveSessions);

  // Screen state
  const [screenState, setScreenState] = useState<PracticeState>('CONFIG');

  // Config parameters
  const [selectedSubject, setSelectedSubject] = useState<QuestionSubject>(initialSubject);
  const [selectedChapter, setSelectedChapter] = useState<string>(initialChapter);
  const initialDifficulty = (() => {
    if (!preferredDifficulty) return 'ALL';
    const u = preferredDifficulty.trim().toUpperCase();
    if (u === 'MODERATE' || u === 'MEDIUM') return 'MEDIUM';
    if (u === 'EASY') return 'EASY';
    if (u === 'HARD') return 'HARD';
    return 'ALL';
  })();

  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(initialDifficulty);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(null);
  const [abandoningSessionId, setAbandoningSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClientSafeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<OptionLabel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerSubmissionResult | null>(null);
  const [sessionAnsweredMap, setSessionAnsweredMap] = useState<Record<string, ActiveSessionAnswerState>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Results state
  const [resultsSummary, setResultsSummary] = useState<PracticeSessionSummary | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const currentQuestion = questions[currentIndex];
  const progressPct = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Keyboard shortcuts during active practice
  useEffect(() => {
    if (screenState !== 'ACTIVE') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key) && !answerResult && !submitting) {
        setSelectedOption(key as OptionLabel);
      } else if (['1', '2', '3', '4'].includes(key) && !answerResult && !submitting) {
        const mapping: Record<string, OptionLabel> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
        setSelectedOption(mapping[key]);
      } else if (e.key === 'Enter') {
        if (!answerResult && selectedOption && !submitting) {
          handleSubmitAnswer();
        } else if (answerResult && !loading) {
          handleNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screenState, selectedOption, answerResult, submitting, loading, currentIndex, questions.length]);

  const availableChapters = catalog[selectedSubject] || [];

  const handleSubjectChange = (subj: QuestionSubject) => {
    setSelectedSubject(subj);
    setSelectedChapter('ALL');
  };

  // Resume a specific active session by ID
  const handleResumeSessionById = async (targetSessionId: string) => {
    setResumingSessionId(targetSessionId);
    setError(null);

    const res = await getSessionByIdAction(targetSessionId);
    setResumingSessionId(null);

    if (res.success && res.data) {
      const sess = res.data;
      const qList = sess.questions;
      const targetIdx = sess.currentQuestionIndex;
      const answeredMap = sess.answeredQuestions || {};

      setSessionId(sess.sessionId);
      setQuestions(qList);
      setCurrentIndex(targetIdx);
      setSessionAnsweredMap(answeredMap);

      const currQ = qList[targetIdx];
      if (currQ && answeredMap[currQ.id]) {
        const existing = answeredMap[currQ.id];
        const earned = existing.isCorrect ? 20 : 0;
        setSelectedOption(existing.selectedOption);
        setAnswerResult({
          isCorrect: existing.isCorrect,
          correctOption: existing.correctOption,
          explanation: existing.explanation,
          topic: currQ.topic || currQ.chapter,
          chapter: currQ.chapter,
          subject: currQ.subject,
          xpEarned: earned,
          newTotalXp: 0,
          newLevel: 1,
          leveledUp: false,
          streak: 1,
        });
      } else {
        setSelectedOption(null);
        setAnswerResult(null);
      }

      const priorDurationMs = (sess.durationSeconds || 0) * 1000;
      setStartTime(Date.now() - priorDurationMs);
      setQuestionStartTime(Date.now());
      setExpandedQuestions({});
      setScreenState('ACTIVE');
    } else {
      setError(res.error || 'Failed to load session details.');
    }
  };

  // Discard / Abandon a specific active session
  const handleAbandonSession = async (sessId: string) => {
    setAbandoningSessionId(sessId);
    setError(null);

    const res = await abandonSessionAction({ sessionId: sessId });
    setAbandoningSessionId(null);

    if (res.success) {
      setActiveSessions((prev) => prev.filter((s) => s.sessionId !== sessId));
      if (sessionId === sessId) {
        setSessionId(null);
        setQuestions([]);
        setSessionAnsweredMap({});
      }
    } else {
      setError(res.error || 'Failed to discard session.');
    }
  };

  // Start New Session Handler
  const handleStartSession = async (customSubject?: QuestionSubject, customChapter?: string) => {
    setLoading(true);
    setError(null);

    const subj = customSubject || selectedSubject;
    const chap = customChapter !== undefined ? customChapter : selectedChapter;

    const res = await startPracticeAction({
      subject: subj,
      chapter: chap,
      difficulty: selectedDifficulty,
      questionCount,
    });

    setLoading(false);

    if (res.success && res.data) {
      setSessionId(res.data.sessionId);
      setQuestions(res.data.questions);
      setCurrentIndex(0);
      setSelectedOption(null);
      setAnswerResult(null);
      setSessionAnsweredMap({});
      setStartTime(Date.now());
      setQuestionStartTime(Date.now());
      setExpandedQuestions({});
      setScreenState('ACTIVE');
    } else {
      setError(res.error || 'Failed to start session. Please try different filters.');
    }
  };

  // Submit Answer Handler
  const handleSubmitAnswer = async () => {
    if (!sessionId || !selectedOption || !currentQuestion || submitting) return;

    setSubmitting(true);
    setError(null);

    const timeTaken = Math.max(1, Math.floor((Date.now() - questionStartTime) / 1000));

    const res = await submitAnswerAction({
      sessionId,
      questionId: currentQuestion.id,
      selectedOption,
      timeTakenSeconds: timeTaken,
    });

    setSubmitting(false);

    if (res.success && res.data) {
      setAnswerResult(res.data);
      setSessionAnsweredMap((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          selectedOption,
          isCorrect: res.data!.isCorrect,
          correctOption: res.data!.correctOption,
          explanation: res.data!.explanation,
          timeTakenSeconds: timeTaken,
        },
      }));
    } else {
      setError(res.error || 'Failed to submit answer.');
    }
  };

  // Next Question / Complete Session Handler
  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);

      const nextQ = questions[nextIdx];
      const existing = nextQ ? sessionAnsweredMap[nextQ.id] : null;

      if (existing) {
        const earned = existing.isCorrect ? 20 : 0;
        setSelectedOption(existing.selectedOption);
        setAnswerResult({
          isCorrect: existing.isCorrect,
          correctOption: existing.correctOption,
          explanation: existing.explanation,
          topic: nextQ.topic || nextQ.chapter,
          chapter: nextQ.chapter,
          subject: nextQ.subject,
          xpEarned: earned,
          newTotalXp: 0,
          newLevel: 1,
          leveledUp: false,
          streak: 1,
        });
      } else {
        setSelectedOption(null);
        setAnswerResult(null);
      }

      setQuestionStartTime(Date.now());
    } else {
      if (!sessionId) return;
      setLoading(true);

      const totalDuration = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
      const res = await completeSessionAction({
        sessionId,
        durationSeconds: totalDuration,
      });

      setLoading(false);

      if (res.success && res.data) {
        setActiveSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        setResultsSummary(res.data);
        setScreenState('RESULTS');
      } else {
        setError(res.error || 'Failed to finalize practice results.');
      }
    }
  };

  // Exit practice and return to config with updated sessions list
  const handleExitPractice = async () => {
    setScreenState('CONFIG');
    // Refresh sessions list
    const res = await getActiveSessionsAction();
    if (res.success && res.data) {
      setActiveSessions(res.data);
    }
  };

  const handleJumpToQuestion = (targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= questions.length || targetIdx === currentIndex) return;

    setCurrentIndex(targetIdx);
    const targetQ = questions[targetIdx];
    const existing = targetQ ? sessionAnsweredMap[targetQ.id] : null;

    if (existing) {
      const earned = existing.isCorrect ? 20 : 0;
      setSelectedOption(existing.selectedOption);
      setAnswerResult({
        isCorrect: existing.isCorrect,
        correctOption: existing.correctOption,
        explanation: existing.explanation,
        topic: targetQ.topic || targetQ.chapter,
        chapter: targetQ.chapter,
        subject: targetQ.subject,
        xpEarned: earned,
        newTotalXp: 0,
        newLevel: 1,
        leveledUp: false,
        streak: 1,
      });
    } else {
      setSelectedOption(null);
      setAnswerResult(null);
    }
    setQuestionStartTime(Date.now());
  };

  const toggleQuestionExpanded = (id: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const generateDynamicSummary = (summary: PracticeSessionSummary) => {
    const { totalQuestions, correctAnswers, accuracy, topicDiagnostics } = summary;
    const statements: string[] = [];

    statements.push(`${correctAnswers} correct out of ${totalQuestions} questions.`);

    if (accuracy === 100) {
      statements.push('Flawless performance across all questions.');
    } else {
      if (topicDiagnostics.strongTopics.length > 0) {
        statements.push(`You're strongest in ${topicDiagnostics.strongTopics[0].topic}.`);
      } else if (topicDiagnostics.weakTopics.length > 0) {
        const topPerformer = [...topicDiagnostics.weakTopics].sort((a, b) => b.accuracy - a.accuracy)[0];
        if (topPerformer && topPerformer.accuracy >= 50) {
          statements.push(`Solid grasp on ${topPerformer.topic}.`);
        }
      }

      if (topicDiagnostics.weakTopics.length > 0) {
        const needsWork = [...topicDiagnostics.weakTopics].sort((a, b) => a.accuracy - b.accuracy)[0];
        statements.push(`${needsWork.topic} needs more practice.`);
      }
    }

    return statements.join(' ');
  };

  // ==========================================================================
  // 1. CONFIGURATION VIEW & MULTI-SESSION LIST
  // ==========================================================================
  if (screenState === 'CONFIG') {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-0 space-y-8">
        {/* Navigation & Title */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Practice Workstation
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pick a subject or resume any of your in-progress practice sessions.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-300 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ALL IN-PROGRESS SESSIONS (Multi-Session Resume Card List) */}
        {activeSessions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#50D97A] animate-pulse" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  In-Progress Practice Sessions ({activeSessions.length})
                </h2>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                Saved in cloud · Resume anytime
              </span>
            </div>

            <div className="space-y-3">
              {activeSessions.map((sess) => {
                const isPhysics = sess.subject === 'PHYSICS';
                const isChem = sess.subject === 'CHEMISTRY';
                const isMath = sess.subject === 'MATHEMATICS';

                const subjectColor = isPhysics
                  ? 'text-[#FF9D50] border-[#FF9D50]/30 bg-[#FF9D50]/10'
                  : isChem
                  ? 'text-[#20C4D0] border-[#20C4D0]/30 bg-[#20C4D0]/10'
                  : isMath
                  ? 'text-[#50D97A] border-[#50D97A]/30 bg-[#50D97A]/10'
                  : 'text-zinc-300 border-white/[0.1] bg-white/[0.04]';

                const barColor = isPhysics
                  ? 'bg-[#FF9D50]'
                  : isChem
                  ? 'bg-[#20C4D0]'
                  : isMath
                  ? 'bg-[#50D97A]'
                  : 'bg-zinc-400';

                const progressPercent = Math.max(
                  5,
                  Math.round((sess.answeredCount / sess.totalQuestions) * 100)
                );
                const remaining = Math.max(0, sess.totalQuestions - sess.answeredCount);
                const isResumingThis = resumingSessionId === sess.sessionId;
                const isAbandoningThis = abandoningSessionId === sess.sessionId;

                return (
                  <div
                    key={sess.sessionId}
                    className="rounded-xl border border-white/[0.08] bg-[#0C0E14] p-4 sm:p-5 shadow-lg space-y-3.5 hover:border-white/[0.14] transition-all relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${subjectColor}`}
                          >
                            {sess.subject
                              ? sess.subject.charAt(0) + sess.subject.slice(1).toLowerCase()
                              : 'JEE Practice'}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {formatLastActive(sess.lastActivityAt)}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-white truncate pt-0.5">
                          {sess.chapter || 'Mixed Practice'}
                        </h3>

                        <p className="text-xs text-zinc-400">
                          {sess.answeredCount} of {sess.totalQuestions} answered ·{' '}
                          <strong className="text-zinc-200">
                            {remaining === 0 ? 'Ready to complete' : `${remaining} questions left`}
                          </strong>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono text-zinc-400 block">
                          Q{sess.currentQuestionIndex + 1} of {sess.totalQuestions}
                        </span>
                        <span className="text-[10px] text-zinc-500 mt-0.5 block">
                          {sess.difficulty || 'Mixed'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`${barColor} h-full transition-all duration-300 rounded-full`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <button
                        type="button"
                        disabled={isResumingThis || isAbandoningThis}
                        onClick={() => handleResumeSessionById(sess.sessionId)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-bold transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      >
                        {isResumingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Resume</span>
                            <ArrowRight className="w-3 h-3" />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isResumingThis || isAbandoningThis}
                        onClick={() => {
                          if (confirm(`Discard this ${sess.subject || 'practice'} session?`)) {
                            handleAbandonSession(sess.sessionId);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 hover:text-rose-400 border border-white/[0.06] hover:border-rose-500/30 text-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Discard</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Configuration Form for New Session */}
        <div className="space-y-6 pt-2">
          {activeSessions.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Start a New Session
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
          )}

          {/* 1. Subject */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Subject</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'PHYSICS', name: 'Physics', bg: 'bg-[#FF9D50]', text: 'text-[#080A0E]', hoverBorder: 'hover:border-[#FF9D50]/40' },
                  { key: 'CHEMISTRY', name: 'Chemistry', bg: 'bg-[#20C4D0]', text: 'text-[#080A0E]', hoverBorder: 'hover:border-[#20C4D0]/40' },
                  { key: 'MATHEMATICS', name: 'Mathematics', bg: 'bg-[#50D97A]', text: 'text-[#080A0E]', hoverBorder: 'hover:border-[#50D97A]/40' },
                ] as const
              ).map((s) => {
                const isSelected = selectedSubject === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => handleSubjectChange(s.key)}
                    className={`py-2.5 px-3 text-left rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? `${s.bg} ${s.text} font-semibold shadow-sm`
                        : `bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] border border-white/[0.06] ${s.hoverBorder}`
                    }`}
                  >
                    <span className="block">{s.name}</span>
                    <span className={`text-[10px] mt-0.5 block ${isSelected ? 'text-[#080A0E]/75 font-medium' : 'text-zinc-500'}`}>
                      {catalog[s.key]?.length || 0} chapters
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Chapter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Chapter</label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0C0E14] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#FF9D50] transition-colors"
            >
              <option value="ALL">All Chapters (Mixed Practice)</option>
              {availableChapters.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.questionCount} Qs)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Question Count & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">Questions</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      questionCount === count
                        ? 'bg-[#FF9D50] text-[#080A0E] font-semibold'
                        : 'bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] border border-white/[0.06]'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">Difficulty</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedDifficulty === diff
                        ? 'bg-[#FF9D50] text-[#080A0E] font-semibold'
                        : 'bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] border border-white/[0.06]'
                    }`}
                  >
                    {diff === 'ALL' ? 'Mixed' : diff.charAt(0) + diff.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {questionCount} questions · {selectedSubject.charAt(0) + selectedSubject.slice(1).toLowerCase()}
            </span>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleStartSession()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <span>Start Practice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 2. ACTIVE PRACTICE ENGINE VIEW
  // ==========================================================================
  if (screenState === 'ACTIVE' && currentQuestion) {
    const answeredCount = Object.keys(sessionAnsweredMap).length;

    return (
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-0 space-y-6">
        {/* Compact Header */}
        <div className="flex items-center justify-between text-xs pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold ${
                currentQuestion.subject === 'PHYSICS'
                  ? 'text-[#FF9D50]'
                  : currentQuestion.subject === 'CHEMISTRY'
                  ? 'text-[#20C4D0]'
                  : 'text-[#50D97A]'
              }`}
            >
              {currentQuestion.subject.charAt(0) + currentQuestion.subject.slice(1).toLowerCase()}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 truncate max-w-[240px]">
              {currentQuestion.chapter}
            </span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <span className="font-mono">
              Q{currentIndex + 1} of {questions.length} ({answeredCount} answered)
            </span>
            <PracticeTimer startTime={startTime} />
            <button
              type="button"
              onClick={handleExitPractice}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-medium"
            >
              Exit & Save
            </button>
          </div>
        </div>

        {/* Question Pill Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          {questions.map((q, idx) => {
            const isAnswered = !!sessionAnsweredMap[q.id];
            const isCorrect = sessionAnsweredMap[q.id]?.isCorrect;
            const isCurrent = idx === currentIndex;

            let pillClass = 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:border-white/[0.15]';
            if (isCurrent) {
              pillClass = 'bg-[#FF9D50] text-[#080A0E] font-bold border-[#FF9D50] shadow-sm';
            } else if (isAnswered && isCorrect) {
              pillClass = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
            } else if (isAnswered && !isCorrect) {
              pillClass = 'bg-red-500/10 text-red-300 border-red-500/30';
            }

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => handleJumpToQuestion(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-mono border flex items-center justify-center shrink-0 transition-all cursor-pointer ${pillClass}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full h-0.5 bg-white/[0.06]">
          <div
            className={`h-full transition-all duration-200 ${
              currentQuestion.subject === 'PHYSICS'
                ? 'bg-[#FF9D50]'
                : currentQuestion.subject === 'CHEMISTRY'
                ? 'bg-[#20C4D0]'
                : 'bg-[#50D97A]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {error && (
          <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-300 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Question Statement */}
        <div className="space-y-6 pt-2">
          {currentQuestion.paperTitle && (
            <span className="text-[11px] font-mono text-zinc-500">
              {currentQuestion.paperTitle}
            </span>
          )}

          <div className="text-base text-zinc-100 leading-relaxed">
            <MathRenderer content={currentQuestion.text} />
          </div>

          {/* Options List */}
          <div className="space-y-2.5 pt-2">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOption === opt.label;
              const isSubmitted = answerResult !== null;
              const isCorrectAnswer = answerResult?.correctOption === opt.label;
              const isWrongSelected = isSubmitted && isSelected && !answerResult?.isCorrect;

              const isPhysics = currentQuestion.subject === 'PHYSICS';
              const isChem = currentQuestion.subject === 'CHEMISTRY';
              const activeBorderClass = isPhysics
                ? 'bg-[#FF9D50]/10 border-[#FF9D50]'
                : isChem
                ? 'bg-[#20C4D0]/10 border-[#20C4D0]'
                : 'bg-[#50D97A]/10 border-[#50D97A]';
              const activeBadgeClass = isPhysics
                ? 'bg-[#FF9D50] text-[#080A0E]'
                : isChem
                ? 'bg-[#20C4D0] text-[#080A0E]'
                : 'bg-[#50D97A] text-[#080A0E]';

              let buttonClass = 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/[0.15]';

              if (isSelected && !isSubmitted) {
                buttonClass = `${activeBorderClass} text-white`;
              } else if (isCorrectAnswer) {
                buttonClass = 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-medium';
              } else if (isWrongSelected) {
                buttonClass = 'bg-red-500/10 border-red-500/50 text-red-300';
              } else if (isSubmitted) {
                buttonClass = 'bg-transparent border-white/[0.03] text-zinc-600';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => setSelectedOption(opt.label)}
                  className={`w-full p-3.5 rounded-lg border text-left flex items-start gap-3 transition-colors cursor-pointer ${buttonClass}`}
                >
                  <span
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono shrink-0 ${
                      isSelected && !isSubmitted
                        ? `${activeBadgeClass} font-bold`
                        : isCorrectAnswer
                        ? 'bg-emerald-500 text-black font-bold'
                        : isWrongSelected
                        ? 'bg-red-500 text-white font-bold'
                        : 'bg-white/[0.04] text-zinc-500'
                    }`}
                  >
                    {opt.label}
                  </span>

                  <div className="text-sm pt-0.5 leading-relaxed flex-1">
                    <MathRenderer content={opt.text} inline />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Immediate Server Validation Feedback */}
          {answerResult && (
            <div
              className={`p-4 rounded-lg border text-xs space-y-3 transition-all duration-200 ${
                answerResult.isCorrect
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/5 border-red-500/20 text-red-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  {answerResult.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Correct</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>
                        Incorrect · Correct answer is{' '}
                        <strong className="text-white font-bold">Option {answerResult.correctOption}</strong>
                      </span>
                    </>
                  )}
                </div>

                <span
                  className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                    answerResult.xpEarned > 0
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                      : answerResult.xpEarned < 0
                      ? 'text-red-400 bg-red-500/10 border border-red-500/20 font-semibold'
                      : 'text-zinc-400 bg-white/[0.04]'
                  }`}
                >
                  {answerResult.xpEarned > 0
                    ? `+${answerResult.xpEarned}`
                    : answerResult.xpEarned}{' '}
                  XP
                </span>
              </div>

              {answerResult.explanation && (
                <div className="pt-2 border-t border-white/[0.06] text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500 block mb-1">Explanation:</span>
                  <MathRenderer content={answerResult.explanation} />
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {answerResult ? (
                'Press Enter to continue'
              ) : selectedOption ? (
                `Option ${selectedOption} selected · Press Enter to submit`
              ) : (
                'Select an option (Keys 1-4 or A-D)'
              )}
            </span>

            {answerResult ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleNextQuestion}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Finalizing...</span>
                  </>
                ) : (
                  <>
                    <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'Complete Session'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedOption || submitting}
                onClick={handleSubmitAnswer}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99] disabled:opacity-40 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Submit Answer</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 3. RESULTS VIEW
  // ==========================================================================
  if (screenState === 'RESULTS' && resultsSummary) {
    const summaryText = generateDynamicSummary(resultsSummary);
    const durationMin = Math.floor(resultsSummary.durationSeconds / 60);
    const durationSec = resultsSummary.durationSeconds % 60;
    const durationDisplay = durationMin > 0 ? `${durationMin}m ${durationSec}s` : `${durationSec}s`;

    return (
      <div className="max-w-2xl mx-auto py-10 px-4 sm:px-0 space-y-10">
        {/* Section 1: Intentional Minimalist Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Session complete</span>
            <span className="text-xs text-zinc-400 font-mono">
              {resultsSummary.subject} · {resultsSummary.chapter}
            </span>
          </div>

          {/* Primary Dominant Visual Element: Score */}
          <div className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-semibold tracking-tight text-white">
              {resultsSummary.correctAnswers}
            </span>
            <span className="text-2xl sm:text-3xl font-normal text-zinc-500">
              / {resultsSummary.totalQuestions}
            </span>
          </div>

          {/* Inline Metadata Row */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <span className={resultsSummary.accuracy >= 70 ? 'text-emerald-400' : 'text-zinc-300'}>
              {resultsSummary.accuracy}% accuracy
            </span>
            <span>·</span>
            <span className={resultsSummary.xpEarned >= 0 ? 'text-[#FF9D50]' : 'text-red-400'}>
              {resultsSummary.xpEarned >= 0 ? `+${resultsSummary.xpEarned}` : resultsSummary.xpEarned} XP
            </span>
            <span>·</span>
            <span>{durationDisplay}</span>
          </div>
        </div>

        {/* Section 2: Data-Driven Performance Summary */}
        <div className="pt-2 border-t border-white/[0.06]">
          <p className="text-sm text-zinc-300 leading-relaxed font-normal">
            {summaryText}
          </p>
        </div>

        {/* Section 3: Topic Diagnostics List */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Topic Breakdown
          </h2>

          <div className="divide-y divide-white/[0.04] border-t border-b border-white/[0.06]">
            {[
              ...resultsSummary.topicDiagnostics.weakTopics,
              ...resultsSummary.topicDiagnostics.strongTopics,
            ].map((t) => (
              <div
                key={t.topic}
                className="py-3 flex items-center justify-between gap-4 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-medium text-zinc-200 truncate">{t.topic}</div>
                  <div className="text-zinc-500 text-[11px] truncate mt-0.5">{t.chapter}</div>
                </div>

                <div className="flex items-center gap-4 shrink-0 font-mono text-right">
                  <span className="text-zinc-400">
                    {t.correct} / {t.total}
                  </span>
                  <span
                    className={`w-12 font-medium ${
                      t.accuracy >= 70
                        ? 'text-emerald-400'
                        : t.accuracy >= 50
                        ? 'text-[#FF9D50]'
                        : 'text-red-400'
                    }`}
                  >
                    {t.accuracy}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Detailed Questions Review */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Question Review
          </h2>

          <div className="space-y-3">
            {resultsSummary.questionsBreakdown.map((q, idx) => {
              const isExpanded = !!expandedQuestions[q.questionId];

              return (
                <div
                  key={q.questionId}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleQuestionExpanded(q.questionId)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-zinc-500 shrink-0">
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      {q.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span className="text-zinc-300 truncate font-normal">
                        {q.topic || q.chapter}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 font-mono text-zinc-400">
                      <span>
                        Selected <strong className="text-white">{q.selectedOption}</strong>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-white/[0.04] space-y-3 text-xs">
                      <div className="text-zinc-200 leading-relaxed pt-2">
                        <MathRenderer content={q.text} />
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono pt-1">
                        <span className={q.isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                          Your answer: Option {q.selectedOption}
                        </span>
                        {!q.isCorrect && (
                          <span className="text-emerald-400">
                            Correct: Option {q.correctOption}
                          </span>
                        )}
                      </div>

                      {q.explanation && (
                        <div className="pt-2 border-t border-white/[0.04] text-zinc-400 leading-relaxed">
                          <span className="text-zinc-500 block mb-1">Explanation:</span>
                          <MathRenderer content={q.explanation} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Primary Action Row */}
        <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            ← Return to Dashboard
          </Link>

          <button
            type="button"
            onClick={async () => {
              setScreenState('CONFIG');
              setResultsSummary(null);
              const res = await getActiveSessionsAction();
              if (res.success && res.data) {
                setActiveSessions(res.data);
              }
            }}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Another Session</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
