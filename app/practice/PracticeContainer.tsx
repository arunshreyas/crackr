'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { QuestionSubject, OptionLabel } from '@prisma/client';
import {
  SubjectCatalog,
  ClientSafeQuestion,
} from '@/lib/server/questions/service';
import {
  startPracticeAction,
  submitAnswerAction,
  completeSessionAction,
} from '@/app/actions/practice';
import {
  PracticeSessionSummary,
  AnswerSubmissionResult,
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
} from 'lucide-react';
import { MathRenderer } from '@/components/ui/MathRenderer';

interface PracticeContainerProps {
  catalog: SubjectCatalog;
  preferredDifficulty: string | null;
}

type PracticeState = 'CONFIG' | 'ACTIVE' | 'RESULTS';

export function PracticeContainer({
  catalog,
  preferredDifficulty,
}: PracticeContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlSubject = searchParams.get('subject')?.toUpperCase();
  const initialSubject: QuestionSubject =
    urlSubject === 'CHEMISTRY' || urlSubject === 'MATHEMATICS' || urlSubject === 'PHYSICS'
      ? (urlSubject as QuestionSubject)
      : 'PHYSICS';

  const urlChapter = searchParams.get('chapter');
  const initialChapter = urlChapter || 'ALL';

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
  const [error, setError] = useState<string | null>(null);

  // Active Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClientSafeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<OptionLabel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerSubmissionResult | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Results state
  const [resultsSummary, setResultsSummary] = useState<PracticeSessionSummary | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (screenState === 'ACTIVE') {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [screenState, startTime]);

  // Keyboard shortcuts during active practice
  useEffect(() => {
    if (screenState !== 'ACTIVE') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when focusing inputs
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
  }, [screenState, selectedOption, answerResult, submitting, loading]);

  // Available chapters for selected subject
  const availableChapters = catalog[selectedSubject] || [];

  const handleSubjectChange = (subj: QuestionSubject) => {
    setSelectedSubject(subj);
    setSelectedChapter('ALL');
  };

  // Start Session Handler
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
      setStartTime(Date.now());
      setQuestionStartTime(Date.now());
      setElapsedSeconds(0);
      setExpandedQuestions({});
      setScreenState('ACTIVE');
    } else {
      setError(res.error || 'Failed to start session. Please try different filters.');
    }
  };

  // Submit Answer Handler (Authoritative server validation)
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
    } else {
      setError(res.error || 'Failed to submit answer.');
    }
  };

  // Next Question / Complete Session Handler
  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setAnswerResult(null);
      setQuestionStartTime(Date.now());
    } else {
      // Final Question -> Complete Session Transition
      if (!sessionId) return;
      setLoading(true);

      const totalDuration = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
      const res = await completeSessionAction({
        sessionId,
        durationSeconds: totalDuration,
      });

      setLoading(false);

      if (res.success && res.data) {
        setResultsSummary(res.data);
        setScreenState('RESULTS');
      } else {
        setError(res.error || 'Failed to finalize practice results.');
      }
    }
  };

  const toggleQuestionExpanded = (id: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const currentQuestion = questions[currentIndex];
  const progressPct = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Format timer
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // Generate dynamic data-driven session takeaway summary
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
  // 1. CONFIGURATION VIEW
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
            Practice
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure an adaptive practice session from official JEE papers.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Configuration Form */}
        <div className="space-y-6">
          {/* 1. Subject */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Subject</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'PHYSICS', name: 'Physics' },
                  { key: 'CHEMISTRY', name: 'Chemistry' },
                  { key: 'MATHEMATICS', name: 'Mathematics' },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSubjectChange(s.key)}
                  className={`py-2.5 px-3 text-left rounded-lg text-xs font-medium transition-all ${
                    selectedSubject === s.key
                      ? 'bg-[#2373F4] text-white font-semibold'
                      : 'bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] border border-white/[0.06]'
                  }`}
                >
                  <span className="block">{s.name}</span>
                  <span className={`text-[10px] mt-0.5 block ${selectedSubject === s.key ? 'text-white/80' : 'text-zinc-500'}`}>
                    {catalog[s.key]?.length || 0} chapters
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Chapter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Chapter</label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0C0E14] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#2373F4] transition-colors"
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
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      questionCount === count
                        ? 'bg-[#2373F4] text-white font-semibold'
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
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedDifficulty === diff
                        ? 'bg-[#2373F4] text-white font-semibold'
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
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#2373F4] hover:bg-[#1E64D8] text-white text-xs font-medium transition-colors disabled:opacity-50"
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
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-0 space-y-6">
        {/* Compact Header */}
        <div className="flex items-center justify-between text-xs pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">
              {currentQuestion.subject.charAt(0) + currentQuestion.subject.slice(1).toLowerCase()}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 truncate max-w-[240px]">
              {currentQuestion.chapter}
            </span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <span className="font-mono">
              Q{currentIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-1 font-mono text-zinc-300">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>{timeFormatted}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('Exit current practice session?')) {
                  setScreenState('CONFIG');
                }
              }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full h-0.5 bg-white/[0.06]">
          <div
            className="h-full bg-[#2373F4] transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {error && (
          <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-300 hover:underline"
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

              let buttonClass = 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/[0.15]';

              if (isSelected && !isSubmitted) {
                buttonClass = 'bg-[#2373F4]/10 border-[#2373F4] text-white';
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
                  className={`w-full p-3.5 rounded-lg border text-left flex items-start gap-3 transition-colors ${buttonClass}`}
                >
                  <span
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono shrink-0 ${
                      isSelected && !isSubmitted
                        ? 'bg-[#2373F4] text-white font-semibold'
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

                <span className="font-mono text-[11px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded">
                  +{answerResult.xpEarned} XP
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
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#2373F4] hover:bg-[#1E64D8] text-white text-xs font-medium transition-colors"
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
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#2373F4] hover:bg-[#1E64D8] text-white text-xs font-medium transition-colors disabled:opacity-40"
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
  // 3. RESULTS VIEW (Academic / Linear-style Polish)
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
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-300">+{resultsSummary.xpEarned} XP</span>
            <span className="text-zinc-600">·</span>
            <span>{durationDisplay}</span>
          </div>

          {/* Data-Driven Summary Statement */}
          <p className="text-xs text-zinc-400 leading-relaxed pt-1">
            {summaryText}
          </p>
        </div>

        {/* Section 2: Achievement Banner (Only if earned) */}
        {resultsSummary.newAchievements && resultsSummary.newAchievements.length > 0 && (
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-2">
            <span className="text-[11px] font-medium text-zinc-400">Unlocked Achievement</span>
            {resultsSummary.newAchievements.map((ach) => (
              <div key={ach.code} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{ach.icon}</span>
                  <div>
                    <span className="text-white font-medium">{ach.title}</span>
                    <span className="text-zinc-500 ml-2 text-[11px]">{ach.description}</span>
                  </div>
                </div>
                <span className="text-zinc-300 font-mono text-[11px]">+{ach.xpReward} XP</span>
              </div>
            ))}
          </div>
        )}

        {/* Section 3: Topic Diagnostics List */}
        {resultsSummary.topicDiagnostics && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
              <h2 className="text-xs font-medium text-zinc-400">Topic diagnostics</h2>
              <span className="text-[11px] text-zinc-500 font-mono">
                {resultsSummary.topicDiagnostics.weakTopics.length + resultsSummary.topicDiagnostics.strongTopics.length} topics evaluated
              </span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {/* Weak Topics Needing Work */}
              {resultsSummary.topicDiagnostics.weakTopics.map((item, idx) => (
                <div
                  key={`weak-${idx}`}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-xs font-medium text-zinc-200 block truncate">
                      {item.topic}
                    </span>
                    <span className="text-[11px] text-zinc-500 block truncate">
                      {item.chapter}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-mono text-zinc-400">
                      {item.correct}/{item.total} · <span className="text-red-400">{item.accuracy}%</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleStartSession(selectedSubject, item.chapter)}
                      className="px-2.5 py-1 text-[11px] font-medium text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded transition-colors"
                    >
                      Practice
                    </button>
                  </div>
                </div>
              ))}

              {/* Strong / Mastered Topics */}
              {resultsSummary.topicDiagnostics.strongTopics.map((item, idx) => (
                <div
                  key={`strong-${idx}`}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-xs font-medium text-zinc-200 block truncate">
                      {item.topic}
                    </span>
                    <span className="text-[11px] text-zinc-500 block truncate">
                      {item.chapter}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-mono text-zinc-400">
                      {item.correct}/{item.total} · <span className="text-emerald-400">100%</span>
                    </span>

                    <span className="text-[11px] font-medium text-emerald-400 px-2 py-0.5">
                      Mastered
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Question Review Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <h2 className="text-xs font-medium text-zinc-400">
              Question review ({resultsSummary.questionsBreakdown.length})
            </h2>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {resultsSummary.questionsBreakdown.map((q, idx) => {
              const isExpanded = !!expandedQuestions[q.questionId];

              return (
                <div key={q.questionId} className="py-3.5 space-y-2">
                  {/* Summary Bar */}
                  <div
                    onClick={() => toggleQuestionExpanded(q.questionId)}
                    className="flex items-center justify-between gap-3 cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                          q.isCorrect ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                        }`}
                      >
                        {q.isCorrect ? '✓' : '✗'}
                      </span>
                      <span className="text-xs text-zinc-300 font-mono">Q{idx + 1}</span>
                      <span className="text-xs text-zinc-400 truncate max-w-[300px] sm:max-w-[400px]">
                        {q.topic || q.chapter}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-500 text-xs">
                      <span className="font-mono text-[11px]">
                        Ans: {q.selectedOption} {q.isCorrect ? '' : `(Correct: ${q.correctOption})`}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 group-hover:text-zinc-300 transition-colors" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 group-hover:text-zinc-300 transition-colors" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="pt-2 pl-6 space-y-3 text-xs">
                      <div className="text-zinc-200 leading-relaxed">
                        <MathRenderer content={q.text} />
                      </div>

                      <div className="text-zinc-400 text-[11px] font-mono flex items-center gap-3">
                        <span>
                          Your answer: <strong className={q.isCorrect ? 'text-emerald-400' : 'text-red-400'}>Option {q.selectedOption}</strong>
                        </span>
                        {!q.isCorrect && (
                          <span>
                            Correct: <strong className="text-emerald-400">Option {q.correctOption}</strong>
                          </span>
                        )}
                      </div>

                      {q.explanation && (
                        <div className="p-3 rounded bg-white/[0.02] border border-white/[0.04] text-zinc-300 text-xs leading-relaxed space-y-1">
                          <span className="text-zinc-500 text-[11px] block">Explanation:</span>
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

        {/* Section 5: Intentional Actions */}
        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setScreenState('CONFIG')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-zinc-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice again</span>
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#2373F4] hover:bg-[#1E64D8] text-white text-xs font-medium transition-colors"
          >
            <span>Back to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
