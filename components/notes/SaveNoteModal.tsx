'use client';

import React, { useState } from 'react';
import { saveNoteAction } from '@/app/actions/notes';
import {
  Bookmark,
  X,
  Loader2,
  Tag,
  FileText,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';

interface SaveNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  subjectName?: string;
  chapterName?: string;
  topicName?: string | null;
  initialUserNote?: string;
  initialTags?: string[];
  initialTakeaway?: string;
  onSaved?: (savedNote: any) => void;
}

const PRESET_TAGS = [
  'Formula Trap',
  'Calculation Error',
  'Conceptual Gap',
  'Time Trap',
  'Revisit Before Mock',
  'High-Yield PYQ',
];

export function SaveNoteModal({
  isOpen,
  onClose,
  questionId,
  subjectName,
  chapterName,
  topicName,
  initialUserNote = '',
  initialTags = [],
  initialTakeaway = '',
  onSaved,
}: SaveNoteModalProps) {
  const [userNote, setUserNote] = useState(initialUserNote);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [keyTakeaway, setKeyTakeaway] = useState(initialTakeaway);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await saveNoteAction({
      questionId,
      userNote,
      tags,
      keyTakeaway: keyTakeaway.trim() || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to save note');
      return;
    }

    setSuccess(true);
    if (onSaved) onSaved(res.data);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#0C0E14] p-6 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF9D50]/10 border border-[#FF9D50]/20 flex items-center justify-center text-[#FF9D50]">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Save to Smart Revision Notes
              </h2>
              <p className="text-[11px] text-zinc-400">
                {subjectName} · {chapterName}
                {topicName && <span className="text-zinc-500"> · {topicName}</span>}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Personal Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>Personal Reflection & Memory Hook (Optional)</span>
            </label>
            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="e.g. Remember to check domain condition π < α - β < 3π; don't rush squaring."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF9D50] transition-colors resize-none"
            />
          </div>

          {/* Quick Preset Tags */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-500" />
              <span>Diagnostic Tags</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF9D50]/15 text-[#FF9D50] border-[#FF9D50]/40 font-medium'
                        : 'bg-white/[0.02] text-zinc-400 border-white/[0.06] hover:bg-white/[0.05] hover:text-zinc-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Takeaway */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-zinc-500" />
              <span>Core Takeaway / Formula Rule</span>
            </label>
            <input
              type="text"
              value={keyTakeaway}
              onChange={(e) => setKeyTakeaway(e.target.value)}
              placeholder="Leave blank for automatic smart takeaway extraction"
              className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF9D50] transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Note</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
