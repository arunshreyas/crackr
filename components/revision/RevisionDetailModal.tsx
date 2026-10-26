'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RevisionItem, RevisionStatus } from '@/lib/server/revision/types';
import { getRevisionItemDetailAction, markConceptReviewedAction } from '@/app/actions/revision';
import { MathRenderer } from '@/components/ui/MathRenderer';
import { VisualExplanation } from '@/components/notes/VisualExplanation';
import { formatDueIntervalLabel } from '@/lib/server/revision/scheduling';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Clock,
  Sparkles,
  Bookmark,
  Loader2,
  HelpCircle,
  Check,
} from 'lucide-react';
import { OptionLabel, QuestionSubject } from '@prisma/client';

interface RevisionDetailModalProps {
  item: RevisionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewRecorded?: (conceptKey: string, newStatus: RevisionStatus, reviewCount: number, nextDue: string | null) => void;
}

interface QuestionOption {
  id: string;
  label: OptionLabel;
  text: string;
  position: number;
}

interface DetailData {
  conceptKey: string;
  subject: string;
  chapter: string;
  topic: string;
  diagnostics: unknown;
  revisionRecord: {
    status: RevisionStatus;
    reviewCount: number;
    lastReviewedAt: string | null;
    nextReviewDue: string | null;
    isDue: boolean;
    notes: string | null;
    lastFeedback: string | null;
  } | null;
  incorrectQuestions: Array<{
    id: string;
    questionId: string;
    text: string;
    selectedOption: OptionLabel;
    correctOption: OptionLabel;
    isCorrect: boolean;
    timeTakenSeconds: number | null;
    createdAt: string;
    explanation: string | null;
    difficulty: string | null;
    options: QuestionOption[];
  }>;
  savedNotes: Array<{
    id: string;
    questionId: string;
    userNote: string | null;
    tags: string[];
    keyTakeaway: string | null;
    question: {
      id: string;
      text: string;
      subject: QuestionSubject;
      chapter: string;
      topic: string | null;
      year: number | null;
      paperTitle: string | null;
      difficulty: string | null;
      correctOption: OptionLabel;
      explanation: string | null;
      options: QuestionOption[];
    };
  }>;
  availablePracticeCount: number;
}

export function RevisionDetailModal({
  item,
  isOpen,
  onClose,
  onReviewRecorded,
}: RevisionDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'THEORY' | 'MISSED' | 'NOTES'>('THEORY');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [userReflection, setUserReflection] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Fetch full details when opened
  useEffect(() => {
    if (!isOpen || !item) {
      return;
    }

    let isMounted = true;
    const conceptKey = item.conceptKey;
    const initialNotes = item.notes || '';

    async function loadDetail() {
      // Async dispatch avoids synchronous cascading re-render in effect body
      setLoading(true);
      setUserReflection(initialNotes);
      setActionSuccessMessage(null);

      try {
        const res = await getRevisionItemDetailAction(conceptKey);
        if (isMounted && res.success && res.data) {
          setDetailData(res.data as unknown as DetailData);
          if (res.data.incorrectQuestions.length > 0 && res.data.savedNotes.length === 0) {
            setActiveTab('MISSED');
          } else {
            setActiveTab('THEORY');
          }
        }
      } catch (err) {
        console.error('Failed to load revision item detail', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const handleMarkReview = async (status: RevisionStatus) => {
    setSubmitting(true);
    setActionSuccessMessage(null);

    try {
      const res = await markConceptReviewedAction({
        conceptKey: item.conceptKey,
        status,
        notes: userReflection,
        feedback: status === RevisionStatus.REVIEWED ? 'REVIEWED' : 'NEEDS_PRACTICE',
      });

      if (res.success && res.data) {
        const msg =
          status === RevisionStatus.REVIEWED
            ? 'Marked as reviewed! Next spaced checkup scheduled.'
            : 'Marked as needing more practice. Scheduled for tomorrow.';
        setActionSuccessMessage(msg);

        if (onReviewRecorded) {
          onReviewRecorded(
            item.conceptKey,
            status,
            res.data.reviewCount,
            res.data.nextReviewDue
          );
        }

        // Auto close after brief confirmation
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to update revision status', err);
    } finally {
      setSubmitting(false);
    }
  };

  const practiceUrl = `/practice?subject=${item.subject}&chapter=${encodeURIComponent(
    item.chapter
  )}&topic=${encodeURIComponent(item.topic)}`;

  const dueLabel = formatDueIntervalLabel(item.nextReviewDue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="relative w-full max-w-3xl my-auto rounded-2xl border border-white/[0.1] bg-[#0A0C10] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revision-modal-title"
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#0C0E14] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#FF9D50] bg-[#FF9D50]/10 border border-[#FF9D50]/25 px-2 py-0.5 rounded-md">
              {item.subject}
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {dueLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={practiceUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-bold tracking-wide transition-all shadow-sm active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practise Topic</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Concept Header & Priority Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 id="revision-modal-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {item.topic}
              </h2>
              <span className="text-xs font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                Priority: <strong className="text-[#FF9D50]">{item.priorityScore}/100</strong>
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Chapter: <span className="text-zinc-200 font-medium">{item.chapter}</span>
            </p>
          </div>

          {/* Diagnostics Quick Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-xs">
            <div>
              <span className="text-[10px] text-zinc-500 block">Accuracy</span>
              <span className={`font-bold ${item.accuracy !== null && item.accuracy < 45 ? 'text-red-400' : 'text-zinc-200'}`}>
                {item.accuracy !== null ? `${item.accuracy}%` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Total Attempts</span>
              <span className="font-semibold text-zinc-200">{item.totalAttempts} questions</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Missed</span>
              <span className="font-semibold text-red-400">{item.incorrectAttempts} incorrect</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Review Cycle</span>
              <span className="font-semibold text-zinc-200">#{item.reviewCount} completed</span>
            </div>
          </div>

          {/* Explainable Reasons Strip */}
          {item.priorityReasons.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 text-xs text-amber-200/90 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Why this concept is prioritised:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-300 pl-1">
                {item.priorityReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
            <button
              onClick={() => setActiveTab('THEORY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'THEORY'
                  ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              Core Theory & Explanations
            </button>

            <button
              onClick={() => setActiveTab('MISSED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'MISSED'
                  ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <span>Missed Questions</span>
              {detailData && detailData.incorrectQuestions.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 font-mono">
                  {detailData.incorrectQuestions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('NOTES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'NOTES'
                  ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <span>Saved Notes</span>
              {detailData && detailData.savedNotes.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FF9D50]/20 text-[#FF9D50] font-mono">
                  {detailData.savedNotes.length}
                </span>
              )}
            </button>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF9D50]" />
              <span className="text-xs">Loading detailed concept material...</span>
            </div>
          )}

          {/* Tab 1: Theory & Core Explanations */}
          {!loading && activeTab === 'THEORY' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FF9D50]">
                  <BookOpen className="w-4 h-4" />
                  <span>Recommended Study Strategy</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {item.recommendedAction}
                </p>
              </div>

              {/* Visual Explanations from saved notes or sample question */}
              {detailData && detailData.savedNotes.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Visual Explanations & Worked Steps:
                  </h4>
                  {detailData.savedNotes.map((n) => (
                    <div key={n.id} className="p-4 rounded-xl border border-white/[0.08] bg-[#0C0E14] space-y-3">
                      <VisualExplanation
                        question={n.question}
                        keyTakeaway={n.keyTakeaway}
                        userNote={n.userNote}
                        compact={true}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-white/[0.06] bg-black/20 text-center space-y-2">
                  <HelpCircle className="w-6 h-6 text-zinc-500 mx-auto" />
                  <p className="text-xs text-zinc-400">
                    No custom visual notes saved for this concept yet.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Inspect your missed questions in the next tab or solve a drill to bookmark high-yield visual steps.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Missed Questions & Error Diagnostics */}
          {!loading && activeTab === 'MISSED' && (
            <div className="space-y-4">
              {detailData && detailData.incorrectQuestions.length > 0 ? (
                detailData.incorrectQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-white/[0.08] bg-[#0C0E14] space-y-3.5"
                  >
                    {/* Question Header */}
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-semibold text-white">Question #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        {q.timeTakenSeconds && (
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            {q.timeTakenSeconds}s
                          </span>
                        )}
                        <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">
                          Missed
                        </span>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="text-xs sm:text-sm text-zinc-200">
                      <MathRenderer content={q.text} />
                    </div>

                    {/* Options Breakdown */}
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt) => {
                          const isUserPicked = opt.label === q.selectedOption;
                          const isCorrect = opt.label === q.correctOption;

                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                  : isUserPicked
                                    ? 'bg-red-500/10 border-red-500/30 text-red-200'
                                    : 'bg-white/[0.02] border-white/[0.04] text-zinc-400'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold font-mono">{opt.label}.</span>
                                <MathRenderer content={opt.text} />
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                  Correct
                                </span>
                              )}
                              {isUserPicked && !isCorrect && (
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                                  Your Choice
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Worked Solution & Explanation */}
                    {q.explanation && (
                      <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs space-y-1.5">
                        <span className="font-semibold text-zinc-300 block">Worked Solution:</span>
                        <div className="text-zinc-400 leading-relaxed">
                          <MathRenderer content={q.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-xl border border-white/[0.06] bg-black/20 text-center space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                  <p className="text-xs text-zinc-300 font-medium">
                    No recent incorrect questions recorded for this concept!
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    This item is scheduled due to spaced repetition interval or weak baseline calibration.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Saved Notes */}
          {!loading && activeTab === 'NOTES' && (
            <div className="space-y-3">
              {detailData && detailData.savedNotes.length > 0 ? (
                detailData.savedNotes.map((note) => (
                  <div key={note.id} className="p-4 rounded-xl border border-white/[0.08] bg-[#0C0E14] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="font-semibold text-white">Smart Revision Note</span>
                      <Bookmark className="w-3.5 h-3.5 text-[#FF9D50]" />
                    </div>

                    {note.keyTakeaway && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                        <strong className="text-amber-400">Key Takeaway: </strong>
                        {note.keyTakeaway}
                      </div>
                    )}

                    {note.userNote && (
                      <p className="text-zinc-300 italic">
                        &ldquo;{note.userNote}&rdquo;
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-xl border border-white/[0.06] bg-black/20 text-center space-y-2">
                  <Bookmark className="w-6 h-6 text-zinc-500 mx-auto" />
                  <p className="text-xs text-zinc-400">
                    No notes saved for this concept yet.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    You can bookmark difficult questions as Smart Notes during practice sessions.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* User Reflection Note Input */}
          <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
            <label htmlFor="reflection-input" className="text-xs font-semibold text-zinc-300">
              Personal Revision Note / Key Formula (Saved with Review):
            </label>
            <textarea
              id="reflection-input"
              rows={2}
              value={userReflection}
              onChange={(e) => setUserReflection(e.target.value)}
              placeholder="e.g. Remember to check dimensions and signs; formula is..."
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF9D50] focus:ring-1 focus:ring-[#FF9D50] transition-all resize-none"
            />
          </div>
        </div>

        {/* Action Status Notification */}
        {actionSuccessMessage && (
          <div className="px-5 py-2.5 bg-emerald-500/15 border-t border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Fixed Footer Bar */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#0C0E14] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-zinc-500 hidden sm:block">
            Reviewing updates your spaced retention queue.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleMarkReview(RevisionStatus.NEEDS_PRACTICE)}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Needs More Practice</span>
            </button>

            <button
              type="button"
              onClick={() => handleMarkReview(RevisionStatus.REVIEWED)}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#50D97A] hover:bg-[#60EA8A] text-[#080A0E] text-xs font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 fill-current text-[#080A0E]" />
              )}
              <span>Mark as Reviewed</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
