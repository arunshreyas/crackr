'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EnrichedRevisionNote } from '@/lib/server/notes/service';
import { VisualExplanation } from './VisualExplanation';
import { updateNoteAction, deleteNoteAction } from '@/app/actions/notes';
import {
  X,
  Play,
  Trash2,
  Edit3,
  Check,
  Tag,
  Loader2,
  Calendar,
} from 'lucide-react';

interface NoteDetailModalProps {
  note: EnrichedRevisionNote | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: EnrichedRevisionNote) => void;
  onDeleted?: (noteId: string) => void;
}

export function NoteDetailModal({
  note,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}: NoteDetailModalProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedUserNote, setEditedUserNote] = useState('');
  const [editedTakeaway, setEditedTakeaway] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !note) return null;

  const startEdit = () => {
    setEditedUserNote(note.userNote || '');
    setEditedTakeaway(note.keyTakeaway || '');
    setIsEditingNote(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    const res = await updateNoteAction(note.id, {
      userNote: editedUserNote,
      keyTakeaway: editedTakeaway,
    });
    setSaving(false);

    if (res.success && res.data) {
      if (onUpdated) onUpdated(res.data);
      setIsEditingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this smart note?')) return;
    setDeleting(true);
    const res = await deleteNoteAction(note.id);
    setDeleting(false);

    if (res.success) {
      if (onDeleted) onDeleted(note.id);
      onClose();
    }
  };

  const practiceUrl = `/practice?subject=${note.subject.toLowerCase()}&chapter=${encodeURIComponent(
    note.chapter
  )}&topic=${encodeURIComponent(note.topic || '')}`;

  const formattedDate = new Date(note.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="relative w-full max-w-3xl my-auto rounded-2xl border border-white/[0.1] bg-[#0A0C10] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#0C0E14] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-white">Smart Revision Note</span>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <Calendar className="w-3 h-3" />
              <span>Saved on {formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={practiceUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99]"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Practice Similar</span>
            </Link>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              title="Delete Note"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.06] transition-colors cursor-pointer"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          <VisualExplanation
            question={note.question}
            keyTakeaway={note.keyTakeaway}
            userNote={!isEditingNote ? note.userNote : null}
            conceptDiagnostic={note.conceptDiagnostic}
          />

          {/* User Note Editor Section */}
          <div className="pt-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Personal Reflections & Annotations
              </span>
              {!isEditingNote && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="inline-flex items-center gap-1 text-xs text-[#FF9D50] hover:text-[#FFAA66] cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Note</span>
                </button>
              )}
            </div>

            {isEditingNote ? (
              <div className="space-y-3 rounded-xl border border-white/[0.1] bg-[#0C0E14] p-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">Personal Note</label>
                  <textarea
                    value={editedUserNote}
                    onChange={(e) => setEditedUserNote(e.target.value)}
                    rows={3}
                    placeholder="Write personal formulas, shortcuts, or reminders..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF9D50] transition-colors resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">Key Takeaway</label>
                  <input
                    type="text"
                    value={editedTakeaway}
                    onChange={(e) => setEditedTakeaway(e.target.value)}
                    placeholder="Core takeaway summary"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF9D50] transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingNote(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold transition-all cursor-pointer"
                  >
                    {saving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-white/[0.04] text-zinc-300 border border-white/[0.06]"
                    >
                      <Tag className="w-3 h-3 text-zinc-500" />
                      {tag}
                    </span>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
