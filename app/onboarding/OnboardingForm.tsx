'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitOnboarding } from '@/app/actions/onboarding';
import { Stream } from '@prisma/client';

interface OnboardingFormProps {
  initialEmail: string;
  initialName: string;
  suggestedUsername: string;
}

export function OnboardingForm({
  initialEmail,
  initialName,
  suggestedUsername,
}: OnboardingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(initialName || '');
  const [username, setUsername] = useState(suggestedUsername || '');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('Class 12');
  const [stream, setStream] = useState<Stream>(Stream.PCM);
  const [dailyGoal, setDailyGoal] = useState<number>(25);
  const [preferredDifficulty, setPreferredDifficulty] = useState('Moderate');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!username.trim() || username.length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (!school.trim()) {
        setError('Please enter your school or institute.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await submitOnboarding({
        name,
        username,
        school,
        grade,
        stream,
        dailyGoal,
        preferredDifficulty,
      });

      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error || 'Failed to save profile. Please check your inputs.');
      }
    });
  };

  const gradeOptions = [
    { label: 'Class 11', desc: 'Target 2027' },
    { label: 'Class 12', desc: 'Target 2026' },
    { label: 'Dropper / Repeater', desc: 'Target 2026' },
    { label: 'Early Prep', desc: 'Foundation' },
  ];

  const streamOptions: Array<{ id: Stream; name: string; desc: string }> = [
    { id: Stream.PCM, name: 'PCM', desc: 'Physics, Chemistry, Math' },
    { id: Stream.PCMC, name: 'PCMC', desc: 'PCM + Computer Science' },
    { id: Stream.PCB, name: 'PCB', desc: 'Physics, Chemistry, Biology' },
    { id: Stream.PCMB, name: 'PCMB', desc: 'Physics, Chemistry, Math, Biology' },
  ];


  const dailyGoalOptions = [
    { count: 10, label: '10 questions', desc: 'Light pace (~15 min)' },
    { count: 25, label: '25 questions', desc: 'Recommended (~45 min)' },
    { count: 50, label: '50 questions', desc: 'Intensive (~90 min)' },
  ];

  const difficultyOptions = [
    { id: 'Foundation', label: 'Foundation', desc: 'Step-by-step conceptual clarity' },
    { id: 'Moderate', label: 'Standard Exam Level', desc: 'Actual JEE/NEET previous year question standard' },
    { id: 'Challenger', label: 'Advanced Challenger', desc: 'Multi-concept problems for top rankers' },
  ];

  return (
    <div className="w-full">
      {/* Quiet Progress Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                s <= step ? 'bg-[#ff9d50]' : 'bg-white/[0.08]'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-zinc-400 font-normal shrink-0">
          {step} / 3
        </span>
      </div>

      {/* Main Integrated Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-6 sm:p-8 shadow-xl">
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
            <span>•</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleNext}>
          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="pb-1 border-b border-white/[0.04]">
                <h2 className="text-lg font-medium text-white tracking-tight">Personal details</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Connected as <span className="text-zinc-300">{initialEmail}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#12161f] border border-white/[0.08] focus:border-[#ff9d50] focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="alex_2026"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#12161f] border border-white/[0.08] focus:border-[#ff9d50] focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors"
                  />
                </div>
                <p className="text-xs text-zinc-400 mt-1.5">Your public username</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  School or coaching institute
                </label>
                <input
                  type="text"
                  required
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="e.g. DPS R.K. Puram / Allen"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#12161f] border border-white/[0.08] focus:border-[#ff9d50] focus:outline-none text-white text-sm placeholder:text-zinc-600 transition-colors"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Academic Track */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="pb-1 border-b border-white/[0.04]">
                <h2 className="text-lg font-medium text-white tracking-tight">Your academic track</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Helps us select the right syllabus and questions for you.
                </p>
              </div>

              {/* Grade Selection */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">Current grade</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {gradeOptions.map((g) => (
                    <button
                      type="button"
                      key={g.label}
                      onClick={() => setGrade(g.label)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        grade === g.label
                          ? 'border-[#ff9d50] bg-[#ff9d50]/10 text-white'
                          : 'border-white/[0.08] bg-[#12161f] text-zinc-400 hover:border-white/[0.16] hover:text-white'
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{g.label}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stream Selection */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">Subject stream</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {streamOptions.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setStream(s.id)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        stream === s.id
                          ? 'border-[#20c4d0] bg-[#20c4d0]/10 text-white'
                          : 'border-white/[0.08] bg-[#12161f] text-zinc-400 hover:border-white/[0.16] hover:text-white'
                      }`}
                    >
                      <div className="text-sm font-semibold text-white">{s.name}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Practice Goal & Difficulty */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="pb-1 border-b border-white/[0.04]">
                <h2 className="text-lg font-medium text-white tracking-tight">Practice goal & difficulty</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Choose a starting pace that fits your preparation routine.
                </p>
              </div>

              {/* Daily Target */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">Daily practice goal</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {dailyGoalOptions.map((dg) => (
                    <button
                      type="button"
                      key={dg.count}
                      onClick={() => setDailyGoal(dg.count)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        dailyGoal === dg.count
                          ? 'border-[#50d97a] bg-[#50d97a]/10 text-white'
                          : 'border-white/[0.08] bg-[#12161f] text-zinc-400 hover:border-white/[0.16] hover:text-white'
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{dg.label}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{dg.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Difficulty */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">Starting difficulty</label>
                <div className="space-y-2.5">
                  {difficultyOptions.map((diff) => (
                    <button
                      type="button"
                      key={diff.id}
                      onClick={() => setPreferredDifficulty(diff.id)}
                      className={`w-full p-3.5 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                        preferredDifficulty === diff.id
                          ? 'border-[#ff9d50] bg-[#ff9d50]/10 text-white'
                          : 'border-white/[0.08] bg-[#12161f] text-zinc-400 hover:border-white/[0.16] hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-white">{diff.label}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{diff.desc}</div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          preferredDifficulty === diff.id
                            ? 'border-[#ff9d50] bg-[#ff9d50]'
                            : 'border-zinc-600'
                        }`}
                      >
                        {preferredDifficulty === diff.id && <div className="w-1.5 h-1.5 rounded-full bg-[#080a0e]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep((prev) => (prev - 1) as 1 | 2 | 3);
                }}
                className="px-3 py-2 text-xs font-normal text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-full bg-[#ff9d50] hover:bg-[#ffa964] text-[#080a0e] font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <span>Setting up...</span>
              ) : step === 3 ? (
                <span>Get started →</span>
              ) : (
                <span>Continue →</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
