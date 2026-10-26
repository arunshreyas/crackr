'use client';

import React from 'react';
import { EnrichedRevisionNote } from '@/lib/server/notes/service';
import { MathRenderer } from '@/components/ui/MathRenderer';
import {
  ArrowRight,
  Lightbulb,
  Trash2,
} from 'lucide-react';
import { QuestionSubject } from '@prisma/client';

interface NoteCardProps {
  note: EnrichedRevisionNote;
  onOpenDetail: (note: EnrichedRevisionNote) => void;
  onDelete?: (noteId: string) => void;
}

export function NoteCard({ note, onOpenDetail, onDelete }: NoteCardProps) {
  const getSubjectColor = (subj: QuestionSubject) => {
    switch (subj) {
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

  const formattedDate = new Date(note.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const isWeak =
    note.conceptDiagnostic?.weaknessLevel === 'CRITICAL_WEAKNESS' ||
    note.conceptDiagnostic?.weaknessLevel === 'NEEDS_ATTENTION';

  return (
    <div className="group relative rounded-2xl border border-white/[0.08] bg-[#0C0E14] hover:bg-[#0E1118] hover:border-white/[0.14] transition-all p-5 flex flex-col justify-between space-y-4">
      {/* Top Metadata Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getSubjectColor(
                note.subject
              )}`}
            >
              {note.subject}
            </span>
            {isWeak && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Weak Concept
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            <span>{formattedDate}</span>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note.id);
                }}
                title="Delete note"
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded transition-opacity cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-white tracking-tight truncate">
            {note.chapter}
          </h3>
          {note.topic && (
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              {note.topic}
            </p>
          )}
        </div>
      </div>

      {/* Question Excerpt */}
      <div className="text-xs text-zinc-300 leading-relaxed line-clamp-3 overflow-hidden">
        <MathRenderer content={note.question.text} />
      </div>

      {/* Key Takeaway Pill */}
      {note.keyTakeaway && (
        <div className="p-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] flex items-start gap-2 text-[11px]">
          <Lightbulb className="w-3.5 h-3.5 text-[#FF9D50] shrink-0 mt-0.5" />
          <p className="text-zinc-300 line-clamp-2 leading-relaxed">
            {note.keyTakeaway}
          </p>
        </div>
      )}

      {/* User Note Snippet or Tags */}
      {note.userNote && (
        <div className="text-[11px] text-zinc-400 italic line-clamp-2 border-l-2 border-[#FF9D50]/50 pl-2">
          &ldquo;{note.userNote}&rdquo;
        </div>
      )}

      {/* Footer Tags & Study Button */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {note.tags && note.tags.length > 0 ? (
            note.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400 truncate border border-white/[0.06]"
              >
                {t}
              </span>
            ))
          ) : (
            <span className="text-[10px] font-mono text-zinc-500">
              Option {note.question.correctOption} Correct
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenDetail(note)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF9D50] group-hover:text-[#FFAA66] transition-colors cursor-pointer shrink-0"
        >
          <span>Visual Breakdown</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
