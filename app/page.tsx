"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const PlasmaWave = dynamic(
  () => import("@/components/PlasmaWave/PlasmaWave"),
  { ssr: false }
);

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("B");
  const [markedForReview, setMarkedForReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const options = [
    { id: "A", text: "16 J" },
    { id: "B", text: "28 J" },
    { id: "C", text: "-50 J" },
    { id: "D", text: "-40 J" },
  ];

  return (
    <div className="min-h-screen bg-[#080a0e] text-[#f1f5f9] flex flex-col font-sans selection:bg-[#ff9e4f]/25 selection:text-white relative">
      {/* Floating Quiet Navbar */}
      <header className="fixed top-5 inset-x-0 mx-auto z-50 w-[92%] max-w-4xl transition-all">
        <div className="rounded-full bg-[#0c0e14]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/50 px-5 sm:px-6 h-12 flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-1.5 group">
            <span className="font-semibold text-base tracking-tight text-white flex items-center group-hover:text-[#ff9e4f] transition-colors">
              crackr<span className="text-[#ff9e4f] ml-0.5">•</span>
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs sm:text-sm text-zinc-400 font-normal">
            <a
              href="#practice"
              className="hover:text-white transition-colors duration-150"
            >
              Practice
            </a>
            <a
              href="#how-it-works"
              className="hover:text-white transition-colors duration-150"
            >
              How it works
            </a>
            <a
              href="#features"
              className="hover:text-white transition-colors duration-150"
            >
              Features
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#login"
              className="text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Log in
            </a>
            <a
              href="#get-started"
              className="inline-flex items-center justify-center gap-1 text-xs sm:text-sm font-medium px-4 py-1.5 rounded-full bg-[#ff9e4f] text-[#080a0e] hover:bg-[#ffaa66] transition-all"
            >
              <span>Get started</span>
              <span className="text-xs">→</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 text-zinc-400 hover:text-white rounded-full focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 rounded-2xl border border-white/[0.08] bg-[#0c0e14]/95 backdrop-blur-2xl p-5 space-y-3 shadow-2xl">
            <a
              href="#practice"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-white py-1"
            >
              Practice
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-white py-1"
            >
              How it works
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-white py-1"
            >
              Features
            </a>
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <a
                href="#login"
                className="text-sm text-zinc-400 hover:text-white"
              >
                Log in
              </a>
              <a
                href="#get-started"
                className="text-xs font-semibold py-1.5 px-4 rounded-full bg-[#ff9e4f] text-[#080a0e]"
              >
                Get started →
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* HERO SECTION */}
        <section className="relative pt-36 sm:pt-44 pb-24 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center isolate overflow-hidden">
          {/* Animated WebGL PlasmaWave Background */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[560px] overflow-hidden pointer-events-none z-0 opacity-85">
            <PlasmaWave
              colors={["#FF9E4F", "#16CFD9"]}
              speed1={0.04}
              speed2={0.04}
              focalLength={0.9}
              bend1={0.8}
              bend2={0.4}
              dir2={1.0}
              rotationDeg={0}
              yOffset={-40}
            />
            {/* Top & Bottom Vignette Mask */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#080a0e] via-[#080a0e]/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#080a0e] via-[#080a0e]/80 to-transparent pointer-events-none" />
          </div>

          {/* Foreground Hero Content */}
          <div className="relative z-10 flex flex-col items-center w-full max-w-3xl mx-auto">
            {/* Headline */}
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white leading-[1.04]">
              Practice smarter. <br />
              Crack{" "}
              <span className="bg-gradient-to-r from-[#ff9e4f] via-[#16cfd9] to-[#54e17f] bg-clip-text text-transparent">
                more.
              </span>
            </h1>

            {/* Action CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="#get-started"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-full bg-[#ff9e4f] hover:bg-[#ffaa66] text-[#080a0e] font-semibold text-sm shadow-[0_4px_24px_rgba(255,158,79,0.35)] transition-all"
              >
                <span>Start practicing</span>
                <span className="text-sm">→</span>
              </a>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-full bg-[#12161f]/80 hover:bg-[#181d28] border border-white/[0.08] text-zinc-300 hover:text-white text-sm font-medium transition-all"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* AUTHENTIC PRODUCT UI: REAL DASHBOARD INTERFACE */}
          <div className="w-full max-w-4xl mt-20 rounded-xl border border-white/[0.08] bg-[#0c0e14] shadow-2xl overflow-hidden text-left relative z-10">
            {/* Dashboard Workspace */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* User Overview Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                      Good evening, Alex
                    </h2>
                    <span className="text-[11px] font-mono text-[#fff9d9] bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.08]">
                      Level 3
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Daily target: 25 calibrated questions
                  </p>
                </div>

                {/* Direct Key Metrics */}
                <div className="flex items-center gap-6 text-xs text-zinc-400 font-mono">
                  <div>
                    <span className="text-white font-medium text-sm block">1,240 XP</span>
                    <span>Total earned</span>
                  </div>
                  <div className="w-px h-6 bg-white/[0.08]" />
                  <div>
                    <span className="text-[#ff9e4f] font-medium text-sm block">7 days 🔥</span>
                    <span>Active streak</span>
                  </div>
                  <div className="w-px h-6 bg-white/[0.08]" />
                  <div>
                    <span className="text-[#54e17f] font-medium text-sm block">84.6%</span>
                    <span>Accuracy</span>
                  </div>
                </div>
              </div>

              {/* 2-Column Product Content */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-1">
                {/* Active Session Card (7 cols) */}
                <div className="md:col-span-7 rounded-lg border border-white/[0.06] bg-[#090b10] p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                      <span>Active Practice Drill</span>
                      <span className="text-[#16cfd9] font-mono text-[11px]">Physics · Mechanics</span>
                    </div>

                    <h3 className="text-base font-medium text-white tracking-tight">
                      Work, Energy & Power
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      10 questions · 3 completed (est. 12 min remaining)
                    </p>

                    {/* Clean segmented progress indicator */}
                    <div className="grid grid-cols-10 gap-1 mt-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-1 rounded-full bg-[#ff9e4f]" />
                      ))}
                      {[4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div key={i} className="h-1 rounded-full bg-white/[0.08]" />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-zinc-400 font-mono">
                      Question 4 queued
                    </span>
                    <button className="px-4 py-1.5 rounded-full bg-[#ff9e4f] hover:bg-[#ffaa66] text-[#080a0e] text-xs font-semibold transition-colors">
                      Resume session →
                    </button>
                  </div>
                </div>

                {/* Subject Mastery Breakdown (5 cols) */}
                <div className="md:col-span-5 rounded-lg border border-white/[0.06] bg-[#090b10] p-5 space-y-3.5">
                  <div className="text-xs font-medium text-zinc-300">
                    Subject Mastery
                  </div>

                  <div className="space-y-3 pt-1 text-xs">
                    {/* Physics */}
                    <div>
                      <div className="flex justify-between text-zinc-400 mb-1">
                        <span>Physics</span>
                        <span className="font-mono text-white">75%</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-white/[0.08]">
                        <div className="h-1 rounded-full bg-[#ff9e4f] w-[75%]" />
                      </div>
                    </div>

                    {/* Chemistry */}
                    <div>
                      <div className="flex justify-between text-zinc-400 mb-1">
                        <span>Chemistry</span>
                        <span className="font-mono text-white">91%</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-white/[0.08]">
                        <div className="h-1 rounded-full bg-[#16cfd9] w-[91%]" />
                      </div>
                    </div>

                    {/* Mathematics */}
                    <div>
                      <div className="flex justify-between text-zinc-400 mb-1">
                        <span>Mathematics</span>
                        <span className="font-mono text-white">88%</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-white/[0.08]">
                        <div className="h-1 rounded-full bg-[#54e17f] w-[88%]" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Weak spot: Rotational inertia</span>
                    <a href="#practice" className="text-[#16cfd9] hover:underline">
                      Drill →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: HOW IT WORKS (EDITORIAL, NO TEMPLATE CARDS) */}
        <section id="how-it-works" className="py-28 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="max-w-xl mb-16">
              <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight">
                Engineered for deliberate practice.
              </h2>
              <p className="mt-3 text-base text-zinc-400 font-normal leading-relaxed">
                Passive reading creates an illusion of competence. Crackr replaces
                it with high-frequency problem retrieval and diagnostic feedback.
              </p>
            </div>

            {/* 3 Direct Content Columns without boxy template containers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              <div className="space-y-3">
                <span className="text-xs font-mono text-[#54e17f] block font-medium">
                  01 / Target
                </span>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Targeted question buckets
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Select by examination syllabus, specific chapter subtopics,
                  difficulty tier, or historical mistake frequency. Practice only
                  what moves your score.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-mono text-[#16cfd9] block font-medium">
                  02 / Focus
                </span>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Distraction-free workspace
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Fast, keyboard-first question interface with zero visual
                  clutter or cartoons. Designed for uninterrupted cognitive flow.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-mono text-[#ff9e4f] block font-medium">
                  03 / Diagnose
                </span>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Precise diagnostic feedback
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  See where time and accuracy drop. Spaced-repetition drills
                  automatically re-queue questions and concepts you struggle with.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: WORKSPACE ENVIRONMENT */}
        <section id="practice" className="py-28 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-[#07090d]">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="max-w-xl mb-14">
              <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight">
                Distraction-free problem solving.
              </h2>
              <p className="mt-3 text-base text-zinc-400 leading-relaxed">
                Clean formatting, LaTeX math rendering, and immediate key navigation.
              </p>
            </div>

            {/* Interactive Question Workspace UI */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0c0e14] shadow-2xl overflow-hidden">
              {/* Question Header */}
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between text-xs">
                <div className="text-zinc-400 font-mono">
                  <span className="text-white font-medium">Physics</span> · Work, Energy & Power
                </div>
                <div className="flex items-center gap-4 text-zinc-400 font-mono">
                  <span>Question 4 of 20</span>
                  <button className="text-zinc-400 hover:text-white transition-colors">
                    Flag question
                  </button>
                </div>
              </div>

              {/* Problem Statement & Options */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <div className="text-xs font-mono text-zinc-400 mb-2">
                    Problem
                  </div>
                  <p className="text-base sm:text-lg text-zinc-100 font-normal leading-relaxed">
                    A particle of mass 2 kg moves along the x-axis under the
                    influence of a conservative force field where the potential
                    energy is given by{" "}
                    <span className="font-mono text-[#16cfd9] bg-white/[0.04] px-2 py-0.5 rounded">
                      U(x) = -3x² - 6x + 2
                    </span>
                    . What is the work done by the force as the particle moves
                    from <span className="font-mono text-[#16cfd9]">x = -1 m</span> to{" "}
                    <span className="font-mono text-[#16cfd9]">x = 3 m</span>?
                  </p>
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-2.5 pt-1">
                  {options.map((option) => {
                    const isSelected = selectedOption === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setSelectedOption(option.id)}
                        className={`px-4 py-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-white/[0.04] border-[#ff9e4f] text-white"
                            : "bg-[#090b10] border-white/[0.06] hover:border-white/[0.15] text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-medium ${
                              isSelected
                                ? "bg-[#ff9e4f] text-[#080a0e]"
                                : "bg-white/[0.06] text-zinc-400"
                            }`}
                          >
                            {option.id}
                          </span>
                          <span className="text-sm font-medium">{option.text}</span>
                        </div>
                        {isSelected && (
                          <span className="text-[11px] font-mono text-[#ff9e4f]">
                            Selected
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Workspace Footer */}
                <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                  <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={markedForReview}
                      onChange={(e) => setMarkedForReview(e.target.checked)}
                      className="rounded border-white/[0.1] bg-[#090b10] text-[#ff9e4f] focus:ring-0"
                    />
                    <span>Mark for review</span>
                  </label>

                  <div className="hidden md:flex items-center gap-3 font-mono text-zinc-400">
                    <span>[1-4] Select</span>
                    <span>·</span>
                    <span>[J/K] Navigate</span>
                    <span>·</span>
                    <span>[Enter] Submit</span>
                  </div>

                  <button
                    onClick={() => setSubmitted(true)}
                    className="w-full sm:w-auto px-5 py-2 rounded-full bg-[#ff9e4f] hover:bg-[#ffaa66] text-[#080a0e] font-semibold transition-colors"
                  >
                    {submitted ? "Submitted ✓" : "Submit answer →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: MOMENTUM & DISCIPLINE */}
        <section id="features" className="py-28 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="max-w-xl mb-16">
              <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight">
                Consistency over vanity metrics.
              </h2>
              <p className="mt-3 text-base text-zinc-400 font-normal leading-relaxed">
                No avatars, games, or superficial badges. Just clear feedback on
                your daily habit and concept mastery.
              </p>
            </div>

            {/* Direct 3-Part Discipline Framework */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#ff9e4f]">01 / Habit</div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Daily Streak Engine
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Build unbroken study momentum. Set your calibrated daily minimum
                  and let routine drive retention over months.
                </p>
                <div className="flex gap-1 pt-2">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
                    <div
                      key={idx}
                      className="w-7 h-7 rounded bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] font-mono text-[#ff9e4f] font-medium"
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#54e17f]">02 / Calibration</div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Difficulty-Weighted XP
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Points calibrated strictly by problem difficulty and solve efficiency.
                  Zero points for low-effort repetition.
                </p>
                <div className="pt-2 text-xs font-mono text-zinc-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Base question</span>
                    <span className="text-[#54e17f]">+100 XP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pace bonus (&lt;1m)</span>
                    <span className="text-[#54e17f]">+25 XP</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#16cfd9]">03 / Retention</div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Adaptive Spaced Repetition
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Questions missed during a session automatically feed into spaced
                  repetition queues until your error rate drops below 10%.
                </p>
                <div className="pt-2 text-[11px] font-mono text-[#16cfd9]">
                  Automatic topic re-queueing
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section id="get-started" className="py-28 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] text-center">
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-4xl sm:text-5xl font-medium text-white tracking-tight">
              Ready to start practicing?
            </h2>
            <p className="text-base text-zinc-400 leading-relaxed">
              Build consistency, isolate weak points, and get better every day.
            </p>
            <div className="pt-2">
              <a
                href="#signup"
                className="inline-flex items-center justify-center gap-1.5 px-7 py-3.5 rounded-full bg-[#ff9e4f] hover:bg-[#ffaa66] text-[#080a0e] font-semibold text-sm transition-all"
              >
                <span>Start practicing free</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] bg-[#06080b] py-12 px-4 sm:px-6 lg:px-8 text-xs text-zinc-400">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-tight text-sm">
              crackr<span className="text-[#ff9e4f]">•</span>
            </span>
            <span className="text-zinc-500">© 2026 Crackr Inc.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#practice" className="hover:text-white transition-colors">
              Practice
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#privacy" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#terms" className="hover:text-white transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
