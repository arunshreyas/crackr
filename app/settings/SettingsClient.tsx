'use client';

import React, { useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { updateSettingsAction, deleteAccountAction } from '@/app/actions/settings';
import { Stream } from '@prisma/client';
import {
  Settings as SettingsIcon,
  Target,
  GraduationCap,
  Sliders,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Save,
  Flame,
  Trash2,
} from 'lucide-react';

interface SettingsProfile {
  name: string;
  username: string;
  email: string;
  school: string;
  grade: string;
  stream: Stream;
  dailyGoal: number;
  preferredDifficulty: string | null;
}

interface SettingsClientProps {
  initialProfile: SettingsProfile;
}

export function SettingsClient({ initialProfile }: SettingsClientProps) {
  const { signOut } = useClerk();
  const router = useRouter();

  const [name, setName] = useState(initialProfile.name);
  const [school, setSchool] = useState(initialProfile.school);
  const [grade, setGrade] = useState(initialProfile.grade);
  const [stream, setStream] = useState<Stream>(initialProfile.stream);
  const [dailyGoal, setDailyGoal] = useState<number>(initialProfile.dailyGoal);
  const [preferredDifficulty, setPreferredDifficulty] = useState<string>(
    initialProfile.preferredDifficulty || 'ALL'
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const goalOptions = [
    { count: 10, label: '10 Qs', desc: 'Casual (~20 mins/day)' },
    { count: 25, label: '25 Qs', desc: 'Consistent (~45 mins/day)' },
    { count: 50, label: '50 Qs', desc: 'Serious (~1.5 hrs/day)' },
    { count: 75, label: '75 Qs', desc: 'Intensive (~2.5 hrs/day)' },
    { count: 100, label: '100 Qs', desc: 'Cracker Rank (~3+ hrs/day)' },
  ];

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setErrorMessage(null);

    const res = await deleteAccountAction(deleteConfirmation);
    if (res.success) {
      await signOut({ redirectUrl: '/' });
    } else {
      setDeleting(false);
      setErrorMessage(res.error || 'Failed to delete account.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const res = await updateSettingsAction({
      name,
      school,
      grade,
      stream,
      dailyGoal,
      preferredDifficulty,
    });

    setSaving(false);

    if (res.success) {
      setSuccessMessage('Settings updated successfully!');
      router.refresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || 'Failed to update settings.');
    }
  };

  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex selection:bg-[#FF9D50]/30 selection:text-[#FFF9D8]">
      {/* App Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        {/* Header */}
        <header className="border-b border-white/[0.08] bg-[#0C0E14]/70 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#FF9D50]" />
              Settings & Preferences
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Customize your daily goals, target difficulty, and academic profile
            </p>
          </div>
        </header>

        {/* Body Form */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
          {/* Feedback messages */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-[#50D97A]/10 border border-[#50D97A]/30 text-[#50D97A] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-8">
            {/* 1. Daily Goal Configuration */}
            <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 sm:p-7 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#FF9D50]/10 text-[#FF9D50]">
                  <Target className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-white">Daily Practice Target</h2>
                  <p className="text-xs text-zinc-400">
                    How many JEE questions do you aim to solve every single day?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {goalOptions.map((opt) => {
                  const isSelected = dailyGoal === opt.count;
                  return (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => setDailyGoal(opt.count)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-[#FF9D50]/10 border-[#FF9D50] text-[#FFF9D8]'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base text-white">{opt.label}</span>
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#FF9D50]" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Practice Difficulty Preference */}
            <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 sm:p-7 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#20C4D0]/10 text-[#20C4D0]">
                  <Sliders className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-white">Preferred Question Difficulty</h2>
                  <p className="text-xs text-zinc-400">
                    Sets the default difficulty filter for new practice sessions
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 'ALL', label: 'All Difficulties' },
                  { value: 'EASY', label: 'Easy' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HARD', label: 'Hard' },
                ].map((diff) => {
                  const isSelected = preferredDifficulty === diff.value;
                  return (
                    <button
                      key={diff.value}
                      type="button"
                      onClick={() => setPreferredDifficulty(diff.value)}
                      className={`py-3 px-4 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#20C4D0]/10 border-[#20C4D0] text-[#20C4D0]'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.15]'
                      }`}
                    >
                      {diff.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3. Academic Profile */}
            <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 sm:p-7 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#50D97A]/10 text-[#50D97A]">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-white">Student Details</h2>
                  <p className="text-xs text-zinc-400">
                    Your personal and academic identity on Crackrr
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-[#FF9D50]"
                  />
                </div>

                {/* School / Institution */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">School / Coaching Institution</label>
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    required
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-[#FF9D50]"
                  />
                </div>

                {/* Grade */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Grade / Year</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full bg-[#0C0E14] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF9D50]"
                  >
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                    <option value="Repeater / Dropper">Repeater / Dropper</option>
                  </select>
                </div>

                {/* Stream */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Stream</label>
                  <select
                    value={stream}
                    onChange={(e) => setStream(e.target.value as Stream)}
                    className="w-full bg-[#0C0E14] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF9D50]"
                  >
                    <option value="PCM">PCM (Physics, Chemistry, Maths)</option>
                    <option value="PCMC">PCMC (Physics, Chem, Maths, Comp)</option>
                    <option value="PCB">PCB (Physics, Chemistry, Bio)</option>
                    <option value="PCMB">PCMB (Physics, Chem, Maths, Bio)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 4. Account Details & Sign Out */}
            <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 sm:p-7 space-y-4">
              <h2 className="text-base font-semibold text-white">Account Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-zinc-400">Email Address</span>
                  <p className="font-semibold text-white mt-0.5">{initialProfile.email}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-zinc-400">Username</span>
                  <p className="font-semibold text-white mt-0.5">@{initialProfile.username}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => signOut({ redirectUrl: '/' })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-semibold transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] disabled:opacity-50 text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99]"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving changes...' : 'Save Settings'}</span>
                </button>
              </div>
            </section>

            {/* 5. Danger Zone / Account Deletion */}
            <section className="bg-[#0C0E14] border border-rose-500/20 rounded-2xl p-6 sm:p-7 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-rose-400 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Danger Zone
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Permanently delete your Crackrr account, study sessions, question answer history, XP, and rank progress. This action cannot be undone.
                </p>
              </div>

              {showDeleteConfirm ? (
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/30 space-y-3">
                  <p className="text-xs text-rose-300 font-medium">
                    To confirm deletion, please type <strong className="text-white">&quot;DELETE MY ACCOUNT&quot;</strong> below:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="w-full bg-[#080A0E] border border-rose-500/40 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={deleting || deleteConfirmation.trim().toLowerCase() !== 'delete my account'}
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-semibold transition-all"
                    >
                      {deleting ? 'Deleting account...' : 'Permanently Delete Account'}
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmation('');
                      }}
                      className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 text-xs font-medium transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                </div>
              )}
            </section>
          </form>
        </main>
      </div>
    </div>
  );
}
