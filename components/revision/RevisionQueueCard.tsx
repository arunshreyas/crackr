'use client';

import React from 'react';
import Link from 'next/link';
import { RevisionItem, RevisionPriorityTier } from '@/lib/server/revision/types';
import { QuestionSubject, RevisionStatus } from '@prisma/client';
import {
  Clock,
  ArrowRight,
  BookOpen,
  AlertCircle,
  Bookmark,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { formatDueIntervalLabel } from '@/lib/server/revision/scheduling';

interface RevisionQueueCardProps {
  item: RevisionItem;
  onOpenReview: (item: RevisionItem) => void;
}

export function RevisionQueueCard({ item, onOpenReview }: RevisionQueueCardProps) {
  const getSubjectBadge = (subject: QuestionSubject) => {
    switch (subject) {
      case 'PHYSICS':
        return 'text-[#FF9D50] bg-[#FF9D50]/10 border-[#FF9D50]/30';
      case 'CHEMISTRY':
        return 'text-[#20C4D0] bg-[#20C4D0]/10 border-[#20C4D0]/30';
      case 'MATHEMATICS':
        return 'text-[#50D97A] bg-[#50D97A]/10 border-[#50D97A]/30';
      default:
        return 'text-zinc-300 bg-white/[0.05] border-white/[0.1]';
    }
  };

  const getPriorityBadge = (tier: RevisionPriorityTier) => {
    switch (tier) {
      case 'CRITICAL':
        return {
          label: 'Critical Priority',
          color: 'text-red-400 bg-red-500/10 border-red-500/25',
          dot: 'bg-red-400',
        };
      case 'HIGH':
        return {
          label: 'High Priority',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
          dot: 'bg-amber-400',
        };
      case 'MEDIUM':
        return {
          label: 'Medium Priority',
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
          dot: 'bg-blue-400',
        };
      case 'SCHEDULED_REVIEW':
        return {
          label: 'Scheduled Review',
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
          dot: 'bg-purple-400',
        };
    }
  };

  const getStatusBadge = (status: RevisionStatus, reviewCount: number) => {
    switch (status) {
      case 'REVIEWED':
        return {
          label: `Reviewed (${reviewCount}x)`,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'NEEDS_PRACTICE':
        return {
          label: 'Needs More Practice',
          color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        };
      case 'NOT_REVIEWED':
      default:
        return {
          label: 'Not Reviewed',
          color: 'text-zinc-400 bg-white/[0.04] border-white/[0.08]',
        };
    }
  };

  const priorityMeta = getPriorityBadge(item.priorityTier);
  const statusMeta = getStatusBadge(item.status, item.reviewCount);
  const dueLabel = formatDueIntervalLabel(item.nextReviewDue);
  const isCritical = item.priorityTier === 'CRITICAL';

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all duration-200 ${
        isCritical
          ? 'bg-red-500/[0.02] border-red-500/25 hover:border-red-500/40'
          : 'bg-[#0C0E14] border-white/[0.08] hover:border-white/[0.16]'
      }`}
    >
      {/* Top Header Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getSubjectBadge(
                item.subject
              )}`}
            >
              {item.subject}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityMeta.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot} ${isCritical ? 'animate-pulse' : ''}`} />
              {priorityMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {item.isDue ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{dueLabel}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-md">
                <Calendar className="w-3 h-3 text-zinc-400" />
                <span>{dueLabel}</span>
              </span>
            )}

            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${statusMeta.color}`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* Concept Title & Chapter */}
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight hover:text-[#FF9D50] transition-colors cursor-pointer" onClick={() => onOpenReview(item)}>
            {item.topic}
          </h3>
          <p className="text-xs text-zinc-400 truncate mt-0.5">{item.chapter}</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2 py-2.5 px-3 rounded-xl bg-black/30 border border-white/[0.04] text-center">
        <div>
          <span className="text-[10px] text-zinc-500 block">Accuracy</span>
          <span
            className={`text-xs font-bold ${
              item.accuracy === null
                ? 'text-zinc-400'
                : item.accuracy < 45
                  ? 'text-red-400'
                  : item.accuracy < 70
                    ? 'text-amber-400'
                    : 'text-emerald-400'
            }`}
          >
            {item.accuracy !== null ? `${item.accuracy}%` : '—'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-500 block">Attempts</span>
          <span className="text-xs font-semibold text-zinc-200">
            {item.totalAttempts > 0 ? `${item.totalAttempts} Qs` : '0'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-500 block">Missed</span>
          <span
            className={`text-xs font-semibold ${
              item.incorrectAttempts > 0 ? 'text-red-400' : 'text-zinc-400'
            }`}
          >
            {item.incorrectAttempts} Qs
          </span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-500 block">Priority</span>
          <span className="text-xs font-mono font-bold text-[#FF9D50]">
            {item.priorityScore}/100
          </span>
        </div>
      </div>

      {/* Explainable Reasons & Diagnostic Tags */}
      <div className="space-y-2">
        {item.diagnosticTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.diagnosticTags.map((tag) => {
              const label =
                tag === 'CONCEPT_GAP'
                  ? 'Conceptual Gap'
                  : tag === 'TIME_TRAP'
                    ? 'Pacing Friction (>110s)'
                    : tag === 'CARELESS_RUSH'
                      ? 'Rushed (<15s)'
                      : 'Difficulty Wall';
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md text-amber-300 bg-amber-500/10 border border-amber-500/20"
                >
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {/* Explainable Prioritisation Insight */}
        {item.priorityReasons.length > 0 && (
          <div className="text-[11px] text-zinc-400 flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF9D50] shrink-0 mt-0.5" />
            <span className="leading-snug">{item.priorityReasons[0]}</span>
          </div>
        )}

        {/* Saved notes or reflection note indicator */}
        <div className="flex items-center gap-3 text-[10px] text-zinc-400 pt-0.5">
          {item.savedNotesCount > 0 && (
            <span className="inline-flex items-center gap-1 text-zinc-300">
              <Bookmark className="w-3 h-3 text-[#FF9D50]" />
              {item.savedNotesCount} saved note{item.savedNotesCount > 1 ? 's' : ''}
            </span>
          )}
          {item.notes && (
            <span className="italic truncate max-w-[240px]">
              Note: &ldquo;{item.notes}&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center gap-2">
        <button
          onClick={() => onOpenReview(item)}
          className="inline-flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-[#FF9D50] text-zinc-200 hover:text-[#080A0E] text-xs font-semibold transition-all border border-white/[0.08] hover:border-[#FF9D50] shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Review Material</span>
        </button>

        <Link
          href={`/practice?subject=${item.subject}&chapter=${encodeURIComponent(
            item.chapter
          )}&topic=${encodeURIComponent(item.topic)}`}
          className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition-all border border-white/[0.06]"
          title="Practise targeted questions on this topic"
        >
          <span>Practise</span>
          <ArrowRight className="w-3 h-3 text-[#FF9D50]" />
        </Link>
      </div>
    </div>
  );
}
