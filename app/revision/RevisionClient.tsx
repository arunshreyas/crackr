'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { QuestionSubject, RevisionStatus } from '@prisma/client';
import {
  RevisionDashboardPayload,
  RevisionItem,
  RevisionPriorityTier,
} from '@/lib/server/revision/types';
import { RevisionQueueCard } from '@/components/revision/RevisionQueueCard';
import { RevisionProgressCard } from '@/components/revision/RevisionProgressCard';
import { RevisionDetailModal } from '@/components/revision/RevisionDetailModal';
import { EmptyRevisionState } from '@/components/revision/EmptyRevisionState';
import { MathRenderer } from '@/components/ui/MathRenderer';
import {
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Clock,
  ArrowRight,
  Bookmark,
} from 'lucide-react';

interface RevisionClientProps {
  initialData: RevisionDashboardPayload;
}

export function RevisionClient({ initialData }: RevisionClientProps) {
  const [data, setData] = useState<RevisionDashboardPayload>(initialData);
  const [selectedSubject, setSelectedSubject] = useState<QuestionSubject | 'ALL'>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<RevisionPriorityTier | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<RevisionStatus | 'ALL'>('ALL');
  const [isDueOnly, setIsDueOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [activeItem, setActiveItem] = useState<RevisionItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return data.queue.filter((item) => {
      if (selectedSubject !== 'ALL' && item.subject !== selectedSubject) {
        return false;
      }
      if (selectedPriority !== 'ALL' && item.priorityTier !== selectedPriority) {
        return false;
      }
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }
      if (isDueOnly && !item.isDue) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTopic = item.topic.toLowerCase().includes(q);
        const matchesChapter = item.chapter.toLowerCase().includes(q);
        const matchesNote = item.notes?.toLowerCase().includes(q);
        if (!matchesTopic && !matchesChapter && !matchesNote) {
          return false;
        }
      }
      return true;
    });
  }, [data.queue, selectedSubject, selectedPriority, selectedStatus, isDueOnly, searchQuery]);

  const hasActiveFilters =
    selectedSubject !== 'ALL' ||
    selectedPriority !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    isDueOnly ||
    searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setSelectedSubject('ALL');
    setSelectedPriority('ALL');
    setSelectedStatus('ALL');
    setIsDueOnly(false);
    setSearchQuery('');
  };

  const handleOpenReview = (item: RevisionItem) => {
    setActiveItem(item);
    setIsModalOpen(true);
  };

  // Primary action: Start revising the first due concept immediately
  const handleStartRevising = () => {
    const firstDue = data.queue.find((i) => i.isDue) || data.queue[0];
    if (firstDue) {
      handleOpenReview(firstDue);
    }
  };

  // Optimistic update when a review is recorded
  const handleReviewRecorded = (
    conceptKey: string,
    newStatus: RevisionStatus,
    newReviewCount: number,
    newDue: string | null
  ) => {
    setData((prev) => {
      const updatedQueue = prev.queue.map((item) => {
        if (item.conceptKey !== conceptKey) return item;
        const now = new Date();
        const dueDate = newDue ? new Date(newDue) : null;
        const isStillDue = dueDate ? dueDate.getTime() <= now.getTime() : false;

        return {
          ...item,
          status: newStatus,
          reviewCount: newReviewCount,
          lastReviewedAt: now.toISOString(),
          nextReviewDue: newDue,
          isDue: isStillDue,
        };
      });

      // Recalculate progress metrics
      let dueTodayCount = 0;
      let reviewedCount = 0;
      let needsPracticeCount = 0;
      let notReviewedCount = 0;

      for (const it of updatedQueue) {
        if (it.isDue) dueTodayCount++;
        if (it.status === RevisionStatus.REVIEWED) reviewedCount++;
        else if (it.status === RevisionStatus.NEEDS_PRACTICE) needsPracticeCount++;
        else notReviewedCount++;
      }

      return {
        ...prev,
        queue: updatedQueue,
        progress: {
          ...prev.progress,
          dueTodayCount,
          reviewedCount,
          needsPracticeCount,
          notReviewedCount,
        },
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Page Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#FF9D50]/10 border border-[#FF9D50]/20 text-[#FF9D50]">
              <RotateCcw className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Smart Revision
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Personalised spaced repetition and mistake analysis to master weak concepts before JEE
          </p>
        </div>

        {data.hasHistory && data.queue.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartRevising}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Start Revising</span>
            </button>
          </div>
        )}
      </section>

      {/* 2. Revision Progress & Spaced Repetition Overview Card */}
      {data.hasHistory && (
        <RevisionProgressCard
          progress={data.progress}
          isDueOnlyActive={isDueOnly}
          onSelectDueOnly={() => setIsDueOnly((prev) => !prev)}
        />
      )}

      {/* 3. Controls & Filter Bar */}
      {data.hasHistory && (
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Subject Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(['ALL', 'PHYSICS', 'CHEMISTRY', 'MATHEMATICS'] as const).map((subj) => {
                const isActive = selectedSubject === subj;
                const label =
                  subj === 'ALL'
                    ? 'All Subjects'
                    : subj.charAt(0) + subj.slice(1).toLowerCase();

                return (
                  <button
                    key={subj}
                    onClick={() => setSelectedSubject(subj)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topic or chapter..."
                className="w-full bg-[#0C0E14] border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF9D50] focus:ring-1 focus:ring-[#FF9D50] transition-all"
              />
            </div>
          </div>

          {/* Secondary Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400 pt-1">
            <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
              <Filter className="w-3 h-3" />
              <span>Filters:</span>
            </span>

            {/* Due Toggle */}
            <button
              onClick={() => setIsDueOnly((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                isDueOnly
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Due for Review</span>
            </button>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as RevisionPriorityTier | 'ALL')}
              className="bg-[#0C0E14] border border-white/[0.08] rounded-lg px-2.5 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-[#FF9D50]"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="SCHEDULED_REVIEW">Scheduled Checkups</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as RevisionStatus | 'ALL')}
              className="bg-[#0C0E14] border border-white/[0.08] rounded-lg px-2.5 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-[#FF9D50]"
            >
              <option value="ALL">All Review States</option>
              <option value="NOT_REVIEWED">Not Reviewed</option>
              <option value="NEEDS_PRACTICE">Needs More Practice</option>
              <option value="REVIEWED">Reviewed</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-[11px] text-[#FF9D50] hover:underline ml-1 font-medium cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Main Two-Column Layout */}
      {filteredQueue.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Revision Queue (Left, 8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>
                Showing <strong className="text-white">{filteredQueue.length}</strong> concepts in queue
              </span>
              <span className="text-[11px] text-zinc-500">
                Sorted by Prioritisation Score & Due Date
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredQueue.map((item) => (
                <RevisionQueueCard
                  key={item.conceptKey}
                  item={item}
                  onOpenReview={handleOpenReview}
                />
              ))}
            </div>
          </div>

          {/* Quick Context Panels (Right, 4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Missed Questions Quick Panel */}
            {data.recentIncorrectQuestions.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Recently Missed Questions
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {data.recentIncorrectQuestions.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {data.recentIncorrectQuestions.slice(0, 5).map((q) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all space-y-2"
                    >
                      <div className="text-xs text-zinc-300 line-clamp-2">
                        <MathRenderer content={q.text} />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span className="text-red-400 font-mono">
                          Selected {q.selectedOption} · Correct {q.correctOption}
                        </span>
                        <Link
                          href={`/practice?questionId=${q.questionId}`}
                          className="text-[#FF9D50] hover:text-[#FFAA66] font-medium flex items-center gap-1 transition-colors"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Notes Panel */}
            {data.savedNotesSummary.totalNotes > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-[#FF9D50]" />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Saved Revision Notes
                    </h3>
                  </div>
                  <Link
                    href="/notes"
                    className="text-[11px] text-[#FF9D50] hover:underline font-medium"
                  >
                    View all ({data.savedNotesSummary.totalNotes})
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {data.savedNotesSummary.notes.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5 text-xs"
                    >
                      {n.keyTakeaway ? (
                        <p className="text-amber-200/90 text-[11px] leading-snug line-clamp-2">
                          <strong className="text-amber-400">Takeaway: </strong>
                          {n.keyTakeaway}
                        </p>
                      ) : n.userNote ? (
                        <p className="text-zinc-300 text-[11px] italic line-clamp-2">
                          &ldquo;{n.userNote}&rdquo;
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Educational / Spaced Repetition Logic Explainer Card */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <Sparkles className="w-4 h-4 text-[#FF9D50]" />
                <span>How Spaced Revision Works</span>
              </div>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                Crackrr dynamically schedules concepts you have struggled with into spaced retention cycles:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-300">
                <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                  <strong className="text-orange-400 block">Needs Practice</strong>
                  <span>Re-drilled in 24 hours</span>
                </div>
                <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                  <strong className="text-emerald-400 block">Cycle 1</strong>
                  <span>Re-checked in 3 days</span>
                </div>
                <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                  <strong className="text-blue-400 block">Cycle 2</strong>
                  <span>Re-checked in 7 days</span>
                </div>
                <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                  <strong className="text-purple-400 block">Cycle 3+</strong>
                  <span>Maintained 14-30 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyRevisionState
          hasHistory={data.hasHistory}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* 5. Revision Detail & Review Workflow Modal */}
      <RevisionDetailModal
        item={activeItem}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveItem(null);
        }}
        onReviewRecorded={handleReviewRecorded}
      />
    </div>
  );
}
