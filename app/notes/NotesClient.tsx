'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { EnrichedRevisionNote, RevisionNotesSummary } from '@/lib/server/notes/service';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteDetailModal } from '@/components/notes/NoteDetailModal';
import { deleteNoteAction } from '@/app/actions/notes';
import { QuestionSubject } from '@prisma/client';
import {
  Bookmark,
  Search,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

interface NotesClientProps {
  initialNotes: EnrichedRevisionNote[];
  initialSummary: RevisionNotesSummary;
}

type SubjectFilter = 'ALL' | QuestionSubject;

export function NotesClient({ initialNotes, initialSummary }: NotesClientProps) {
  const [notes, setNotes] = useState<EnrichedRevisionNote[]>(initialNotes);
  const [summary, setSummary] = useState<RevisionNotesSummary>(initialSummary);
  const [selectedSubject, setSelectedSubject] = useState<SubjectFilter>('ALL');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [weakOnly, setWeakOnly] = useState(false);
  const [activeNote, setActiveNote] = useState<EnrichedRevisionNote | null>(null);

  // Available chapters based on selected subject
  const availableChapters = useMemo(() => {
    const chaptersSet = new Set<string>();
    notes.forEach((n) => {
      if (selectedSubject === 'ALL' || n.subject === selectedSubject) {
        chaptersSet.add(n.chapter);
      }
    });
    return Array.from(chaptersSet).sort();
  }, [notes, selectedSubject]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // 1. Subject filter
      if (selectedSubject !== 'ALL' && note.subject !== selectedSubject) {
        return false;
      }

      // 2. Chapter filter
      if (selectedChapter !== 'ALL' && note.chapter !== selectedChapter) {
        return false;
      }

      // 3. Weak concepts only
      if (weakOnly) {
        const level = note.conceptDiagnostic?.weaknessLevel;
        if (level !== 'CRITICAL_WEAKNESS' && level !== 'NEEDS_ATTENTION') {
          return false;
        }
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const textMatch = note.question.text.toLowerCase().includes(q);
        const chapterMatch = note.chapter.toLowerCase().includes(q);
        const topicMatch = note.topic?.toLowerCase().includes(q);
        const userNoteMatch = note.userNote?.toLowerCase().includes(q);
        const takeawayMatch = note.keyTakeaway?.toLowerCase().includes(q);
        const tagsMatch = note.tags.some((t) => t.toLowerCase().includes(q));

        if (!textMatch && !chapterMatch && !topicMatch && !userNoteMatch && !takeawayMatch && !tagsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [notes, selectedSubject, selectedChapter, weakOnly, searchQuery]);

  const handleDeleteNote = async (noteId: string) => {
    const confirmed = confirm('Remove this question from your revision notes?');
    if (!confirmed) return;

    // Optimistic removal
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setSummary((prev) => ({
      ...prev,
      totalNotes: Math.max(0, prev.totalNotes - 1),
    }));

    await deleteNoteAction(noteId);
  };

  const handleNoteUpdated = (updated: EnrichedRevisionNote) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setActiveNote(updated);
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Banner & Metrics */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FF9D50]/10 border border-[#FF9D50]/20 flex items-center justify-center text-[#FF9D50]">
                <Bookmark className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Smart Revision Notes
              </h1>
            </div>
            <p className="text-xs text-zinc-400">
              High-yield worked solutions, step derivations, and visual explanations grounded in JEE PYQs.
            </p>
          </div>

          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99] self-start sm:self-auto cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Practice & Save Notes</span>
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/[0.08] bg-[#0C0E14] p-4 space-y-1">
            <span className="text-[11px] font-medium text-zinc-400">Total Notes</span>
            <div className="text-2xl font-semibold text-white font-mono">
              {summary.totalNotes}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              Across {summary.distinctChaptersCount} chapters
            </span>
          </div>

          <div className="rounded-xl border border-[#FF9D50]/20 bg-[#FF9D50]/[0.04] p-4 space-y-1">
            <span className="text-[11px] font-medium text-[#FF9D50]">Physics Notes</span>
            <div className="text-2xl font-semibold text-white font-mono">
              {summary.subjectCounts.PHYSICS}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              Concepts saved
            </span>
          </div>

          <div className="rounded-xl border border-[#20C4D0]/20 bg-[#20C4D0]/[0.04] p-4 space-y-1">
            <span className="text-[11px] font-medium text-[#20C4D0]">Chemistry Notes</span>
            <div className="text-2xl font-semibold text-white font-mono">
              {summary.subjectCounts.CHEMISTRY}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              Concepts saved
            </span>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-red-400">Weak Concepts</span>
              {summary.weakConceptNotesCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              )}
            </div>
            <div className="text-2xl font-semibold text-white font-mono">
              {summary.weakConceptNotesCount}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              High priority review
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Filter Bar */}
      <div className="space-y-3 p-4 rounded-2xl border border-white/[0.08] bg-[#0C0E14]">
        {/* Subject Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {(
              [
                { id: 'ALL', label: 'All Subjects', count: notes.length },
                { id: 'PHYSICS', label: 'Physics', count: summary.subjectCounts.PHYSICS },
                { id: 'CHEMISTRY', label: 'Chemistry', count: summary.subjectCounts.CHEMISTRY },
                { id: 'MATHEMATICS', label: 'Mathematics', count: summary.subjectCounts.MATHEMATICS },
              ] as const
            ).map((tab) => {
              const isSelected = selectedSubject === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(tab.id);
                    setSelectedChapter('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF9D50] text-[#080A0E] font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1.5 text-[10px] font-mono ${
                      isSelected ? 'text-[#080A0E]/80 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Weak Concepts Only Toggle */}
          <button
            type="button"
            onClick={() => setWeakOnly(!weakOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              weakOnly
                ? 'bg-red-500/15 text-red-300 border-red-500/40 shadow-sm'
                : 'bg-white/[0.02] text-zinc-400 border-white/[0.06] hover:bg-white/[0.05] hover:text-white'
            }`}
          >
            <AlertCircle className={`w-3.5 h-3.5 ${weakOnly ? 'text-red-400' : 'text-zinc-500'}`} />
            <span>Weak Concepts Only</span>
            {summary.weakConceptNotesCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-500/20 text-red-300">
                {summary.weakConceptNotesCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Chapter Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.06]">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by formula, question text, chapter, or personal notes..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF9D50] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Chapter Selector */}
          <div>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#080A0E] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#FF9D50] transition-colors"
            >
              <option value="ALL">All Chapters ({availableChapters.length})</option>
              {availableChapters.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Notes Grid / Empty States */}
      {notes.length === 0 ? (
        /* Empty State: No Notes Saved At All */
        <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-10 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#FF9D50]/10 border border-[#FF9D50]/20 flex items-center justify-center text-[#FF9D50] mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">No Smart Notes Saved Yet</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              When practicing questions you struggle with, save them to your revision notes to capture step-by-step visual solutions and key takeaways.
            </p>
          </div>
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Practice Session</span>
          </Link>
        </div>
      ) : filteredNotes.length === 0 ? (
        /* Empty State: Filters Matched Nothing */
        <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-8 text-center space-y-3">
          <p className="text-xs text-zinc-400">
            No smart notes match your current filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedSubject('ALL');
              setSelectedChapter('ALL');
              setSearchQuery('');
              setWeakOnly(false);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#FF9D50] bg-[#FF9D50]/10 border border-[#FF9D50]/20 hover:bg-[#FF9D50]/20 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        /* Notes Grid */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span>
              Showing {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              Click any note for deep visual derivation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpenDetail={(n) => setActiveNote(n)}
                onDelete={handleDeleteNote}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. Deep-Focus Note Detail Modal */}
      <NoteDetailModal
        note={activeNote}
        isOpen={!!activeNote}
        onClose={() => setActiveNote(null)}
        onUpdated={handleNoteUpdated}
        onDeleted={(deletedId) => {
          setNotes((prev) => prev.filter((n) => n.id !== deletedId));
          setSummary((prev) => ({
            ...prev,
            totalNotes: Math.max(0, prev.totalNotes - 1),
          }));
        }}
      />
    </div>
  );
}
