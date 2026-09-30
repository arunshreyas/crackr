'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  BookOpen,
  ArrowLeft,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Target,
  Layers,
  Flame,
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

  // Screen state
  const [screenState, setScreenState] = useState<PracticeState>('CONFIG');

  // Config parameters
  const [selectedSubject, setSelectedSubject] = useState<QuestionSubject>('PHYSICS');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');
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

  // Available chapters for selected subject
  const availableChapters = catalog[selectedSubject] || [];

  // Reset chapter selection when subject changes
  const handleSubjectChange = (subj: QuestionSubject) => {
    setSelectedSubject(subj);
    setSelectedChapter('ALL');
  };

  // Start Session Handler
  const handleStartSession = async () => {
    setLoading(true);
    setError(null);

    const res = await startPracticeAction({
      subject: selectedSubject,
      chapter: selectedChapter,
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
      // Last question reached -> Complete Session
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

  const currentQuestion = questions[currentIndex];
  const progressPct = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Format timer
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // ==========================================================================
  // 1. CONFIGURATION VIEW
  // ==========================================================================
  if (screenState === 'CONFIG') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Start Practice Session
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Select your subject and topic to begin practicing authentic JEE questions.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Configuration Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-6 sm:p-8 space-y-8">
          {/* Subject Selector */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
              1. Choose Subject
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: 'PHYSICS', name: 'Physics', color: '#20C4D0' },
                  { key: 'CHEMISTRY', name: 'Chemistry', color: '#FF9D50' },
                  { key: 'MATHEMATICS', name: 'Mathematics', color: '#578EF5' },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSubjectChange(s.key)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedSubject === s.key
                      ? 'border-[#FF9D50] bg-[#FF9D50]/10 shadow-sm'
                      : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <span
                    className="text-xs font-bold block"
                    style={{ color: selectedSubject === s.key ? '#FF9D50' : s.color }}
                  >
                    {s.name}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    {catalog[s.key]?.length || 0} chapters
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Chapter Selector */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
              2. Choose Chapter
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#FF9D50] transition-colors"
            >
              <option value="ALL" className="bg-[#0C0E14] text-white">
                All Chapters (Mixed Practice)
              </option>
              {availableChapters.map((c) => (
                <option key={c.name} value={c.name} className="bg-[#0C0E14] text-white">
                  {c.name} ({c.questionCount} questions)
                </option>
              ))}
            </select>
          </div>

          {/* Question Count & Difficulty Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Question Count */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                3. Questions Count
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      questionCount === count
                        ? 'border-[#FF9D50] bg-[#FF9D50] text-[#080A0E]'
                        : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:text-white'
                    }`}
                  >
                    {count} Qs
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                4. Difficulty
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      selectedDifficulty === diff
                        ? 'border-[#FF9D50] bg-[#FF9D50] text-[#080A0E]'
                        : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:text-white'
                    }`}
                  >
                    {diff === 'ALL' ? 'Mixed' : diff.charAt(0) + diff.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Target: <span className="text-white font-medium">{questionCount} questions</span> •{' '}
              <span className="text-white font-medium">{selectedSubject}</span>
            </span>

            <button
              type="button"
              disabled={loading}
              onClick={handleStartSession}
              className="px-6 py-3 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-sm font-bold tracking-wide transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Session →'}
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Session Status Header */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FF9D50] uppercase tracking-wide">
                {currentQuestion.subject}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-300 font-medium">
                {currentQuestion.chapter}
              </span>
            </div>
            <div className="text-xs text-zinc-400">
              Question {currentIndex + 1} of {questions.length}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{timeFormatted}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to exit? Incomplete progress will be lost.')) {
                  setScreenState('CONFIG');
                }
              }}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-[#FF9D50] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Question Statement Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-300 font-bold hover:underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="space-y-3">
            {currentQuestion.paperTitle && (
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] inline-block">
                {currentQuestion.paperTitle}
              </span>
            )}

            {/* Question Text */}
            <div className="text-base sm:text-lg font-normal text-zinc-100 leading-relaxed">
              <MathRenderer content={currentQuestion.text} />
            </div>
          </div>

          {/* Options Grid */}
          <div className="space-y-3 pt-2">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOption === opt.label;
              const isSubmitted = answerResult !== null;
              const isCorrectAnswer = answerResult?.correctOption === opt.label;
              const isWrongSelected = isSubmitted && isSelected && !answerResult?.isCorrect;

              let optionStyle =
                'border-white/[0.08] bg-white/[0.02] text-zinc-200 hover:border-white/[0.2]';

              if (isSelected && !isSubmitted) {
                optionStyle = 'border-[#FF9D50] bg-[#FF9D50]/10 text-white shadow-sm';
              } else if (isCorrectAnswer) {
                optionStyle = 'border-[#50D97A] bg-[#50D97A]/10 text-[#50D97A] font-semibold';
              } else if (isWrongSelected) {
                optionStyle = 'border-red-500/60 bg-red-500/10 text-red-300';
              } else if (isSubmitted) {
                optionStyle = 'border-white/[0.04] bg-white/[0.01] text-zinc-500 opacity-60';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => setSelectedOption(opt.label)}
                  className={`w-full p-4 rounded-xl border text-left flex items-start gap-4 transition-all ${optionStyle}`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isSelected && !isSubmitted
                        ? 'bg-[#FF9D50] text-[#080A0E]'
                        : isCorrectAnswer
                        ? 'bg-[#50D97A] text-black'
                        : isWrongSelected
                        ? 'bg-red-500 text-white'
                        : 'bg-white/[0.04] text-zinc-400'
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

          {/* Feedback & Explanation (After Submission) */}
          {answerResult && (
            <div
              className={`p-5 rounded-xl border space-y-4 animate-in fade-in duration-300 ${
                answerResult.isCorrect
                  ? 'border-[#50D97A]/30 bg-[#50D97A]/10 text-[#50D97A]'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {answerResult.isCorrect ? (
                    <div className="p-1 rounded-full bg-[#50D97A]/20">
                      <CheckCircle2 className="w-5 h-5 text-[#50D97A]" />
                    </div>
                  ) : (
                    <div className="p-1 rounded-full bg-red-500/20">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-bold block">
                      {answerResult.isCorrect ? 'Correct Answer!' : 'Incorrect'}
                    </span>
                    {!answerResult.isCorrect && (
                      <span className="text-xs text-red-300/80">
                        Correct option: <strong className="text-white font-bold">Option {answerResult.correctOption}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#FFF9D8] px-2.5 py-1 rounded-md bg-white/[0.08]">
                    +{answerResult.xpEarned} XP
                  </span>
                </div>
              </div>

              {/* Instant Weak Topic Identification */}
              {!answerResult.isCorrect && (
                <div className="p-3.5 rounded-lg bg-black/40 border border-red-500/20 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-white">
                        Topic to Revise:
                      </span>
                      <span className="text-xs font-bold text-red-300 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">
                        {answerResult.topic || currentQuestion.topic || currentQuestion.chapter}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Identified as a concept requiring review. Recorded in your chapter diagnostics.
                    </p>
                  </div>
                </div>
              )}

              {answerResult.explanation && (
                <div className="pt-3 border-t border-white/[0.08] text-xs text-zinc-200 leading-relaxed space-y-1">
                  <span className="font-semibold block text-white text-xs">Explanation & Key Takeaway:</span>
                  <MathRenderer content={answerResult.explanation} />
                </div>
              )}
            </div>
          )}

          {/* Footer Action */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {answerResult ? (
                <span>Feedback recorded</span>
              ) : selectedOption ? (
                <span>Option {selectedOption} selected</span>
              ) : (
                <span>Select an option to continue</span>
              )}
            </span>

            {answerResult ? (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-6 py-3 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md active:scale-[0.99]"
              >
                {currentIndex < questions.length - 1 ? 'Next Question →' : 'View Results →'}
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedOption || submitting}
                onClick={handleSubmitAnswer}
                className="px-6 py-3 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md active:scale-[0.99] disabled:opacity-40"
              >
                {submitting ? 'Checking...' : 'Submit Answer'}
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
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Results Banner */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#FF9D50]/10 border border-[#FF9D50]/30 flex items-center justify-center mx-auto text-[#FF9D50]">
            <Sparkles className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Session Completed!
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              {resultsSummary.subject} • {resultsSummary.chapter}
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/[0.08]">
            <div className="rounded-xl bg-white/[0.02] p-3 text-center">
              <span className="text-[11px] text-zinc-400 block">Score</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {resultsSummary.correctAnswers} / {resultsSummary.totalQuestions}
              </span>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3 text-center">
              <span className="text-[11px] text-zinc-400 block">Accuracy</span>
              <span className="text-base font-bold text-[#50D97A] mt-0.5 block">
                {resultsSummary.accuracy}%
              </span>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3 text-center">
              <span className="text-[11px] text-zinc-400 block">XP Earned</span>
              <span className="text-base font-bold text-[#FFF9D8] mt-0.5 block">
                +{resultsSummary.xpEarned} XP
              </span>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3 text-center">
              <span className="text-[11px] text-zinc-400 block">Duration</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {Math.round(resultsSummary.durationSeconds / 60)}m
              </span>
            </div>
          </div>
        </div>

        {/* Newly Unlocked Achievements */}
        {resultsSummary.newAchievements && resultsSummary.newAchievements.length > 0 && (
          <div className="rounded-2xl border border-[#FFF9D8]/30 bg-[#FFF9D8]/10 p-5 space-y-3">
            <span className="text-xs font-bold text-[#FFF9D8] uppercase tracking-wider block">
              🏆 Achievement Unlocked!
            </span>
            <div className="space-y-2">
              {resultsSummary.newAchievements.map((ach) => (
                <div
                  key={ach.code}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/[0.08]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ach.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-white block">{ach.title}</span>
                      <span className="text-[11px] text-zinc-400 block">{ach.description}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#FFF9D8]">+{ach.xpReward} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic Diagnostics & Concept Mastery */}
        {resultsSummary.topicDiagnostics && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#FF9D50]" />
                  Topic Diagnostics & Diagnostic Takeaways
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time concept evaluation from this practice session
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weak Topics */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Topics Needing Revision ({resultsSummary.topicDiagnostics.weakTopics.length})</span>
                </div>

                {resultsSummary.topicDiagnostics.weakTopics.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-zinc-400 text-center">
                    No weak concepts detected! Flawless session.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resultsSummary.topicDiagnostics.weakTopics.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {item.topic}
                            </span>
                            <span className="text-[11px] text-zinc-400 block">
                              {item.chapter}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 shrink-0">
                            {item.correct}/{item.total} ({item.accuracy}%)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChapter(item.chapter);
                            setScreenState('CONFIG');
                          }}
                          className="w-full py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>Target Practice {item.chapter}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Strong Topics */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#50D97A]">
                  <CheckCircle2 className="w-4 h-4 text-[#50D97A]" />
                  <span>Mastered Concepts ({resultsSummary.topicDiagnostics.strongTopics.length})</span>
                </div>

                {resultsSummary.topicDiagnostics.strongTopics.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-zinc-400 text-center">
                    Keep practicing to master new topics.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resultsSummary.topicDiagnostics.strongTopics.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#50D97A]/5 border border-[#50D97A]/20 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {item.topic}
                          </span>
                          <span className="text-[11px] text-zinc-400 block">
                            {item.chapter}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#50D97A]/20 text-[#50D97A] shrink-0">
                          100% Mastered ({item.total}/{item.total})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Question Review Section */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Question Review ({resultsSummary.questionsBreakdown.length})
          </h2>

          <div className="space-y-3">
            {resultsSummary.questionsBreakdown.map((q, idx) => (
              <div
                key={q.questionId}
                className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.06] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-400">
                      Question {idx + 1}
                    </span>
                    {(q.topic || q.chapter) && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06] font-mono">
                        {q.topic || q.chapter}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      q.isCorrect
                        ? 'text-[#50D97A] bg-[#50D97A]/10'
                        : 'text-red-400 bg-red-500/10'
                    }`}
                  >
                    {q.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                  </span>
                </div>

                <div className="text-xs text-zinc-200 leading-relaxed">
                  <MathRenderer content={q.text} />
                </div>

                <div className="text-[11px] text-zinc-400 pt-1">
                  Your Answer:{' '}
                  <span className={q.isCorrect ? 'text-[#50D97A] font-bold' : 'text-red-400 font-bold'}>
                    Option {q.selectedOption}
                  </span>
                  {!q.isCorrect && (
                    <span className="ml-3 text-zinc-300">
                      Correct Answer:{' '}
                      <span className="text-[#50D97A] font-bold">Option {q.correctOption}</span>
                    </span>
                  )}
                </div>

                {q.explanation && (
                  <div className="pt-2 text-[11px] text-zinc-400 border-t border-white/[0.04]">
                    <MathRenderer content={q.explanation} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setScreenState('CONFIG')}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Practice Again</span>
          </button>

          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-bold transition-colors"
          >
            <span>Back to Dashboard →</span>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
