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
    <div className="min-h-screen bg-[#080a0e] text-[#f1f5f9] flex flex-col font-sans selection:bg-[#ff9e4f]/30 selection:text-white relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[520px] bg-gradient-to-b from-[#ff9e4f]/15 via-[#16cfd9]/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[1400px] right-0 w-[500px] h-[500px] bg-[#16cfd9]/5 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-[2200px] left-0 w-[500px] h-[500px] bg-[#54e17f]/5 blur-[130px] pointer-events-none -z-10" />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#080a0e]/85 border-b border-[#1e2535]/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff9e4f] to-[#16cfd9] p-0.5 flex items-center justify-center shadow-lg shadow-[#ff9e4f]/25 group-hover:shadow-[#ff9e4f]/45 transition-all">
              <div className="w-full h-full bg-[#080a0e] rounded-[6px] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[#ff9e4f]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m13 2-2 2.5h3L11 8" />
                  <path d="M12 22v-6" />
                  <path d="M8 8H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-3" />
                </svg>
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight text-white flex items-center">
              crackr
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff9e4f] ml-1 animate-pulse" />
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
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
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5"
            >
              Log in
            </a>
            <a
              href="#get-started"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg bg-[#ff9e4f] text-[#080a0e] hover:bg-[#ffaa66] shadow-md shadow-[#ff9e4f]/25 hover:shadow-[#ff9e4f]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <span>Get started</span>
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#1e2535] bg-[#080a0e]/95 backdrop-blur-xl px-4 pt-2 pb-6 space-y-3">
            <a
              href="#practice"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              Practice
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              How it works
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              Features
            </a>
            <div className="pt-3 border-t border-[#1e2535] flex flex-col gap-2.5">
              <a
                href="#login"
                className="text-center text-sm font-medium text-slate-300 hover:text-white py-2"
              >
                Log in
              </a>
              <a
                href="#get-started"
                className="text-center text-sm font-bold py-2.5 px-4 rounded-lg bg-[#ff9e4f] text-[#080a0e]"
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
        <section className="relative pt-16 sm:pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center isolate overflow-hidden">
          {/* Animated WebGL PlasmaWave Background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[650px] overflow-hidden pointer-events-none z-0">
            <PlasmaWave
              colors={["#FF9E4F", "#16CFD9"]}
              speed1={0.05}
              speed2={0.05}
              focalLength={0.85}
              bend1={0.9}
              bend2={0.5}
              dir2={1.0}
              rotationDeg={0}
              yOffset={-30}
            />
            {/* Top & Bottom Ambient Vignette Masks */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#080a0e] via-[#080a0e]/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#080a0e] via-[#080a0e]/70 to-transparent pointer-events-none" />
          </div>

          {/* Foreground Hero Content */}
          <div className="relative z-10 flex flex-col items-center w-full">
            {/* Top Announcement Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141924]/90 backdrop-blur-md border border-[#ff9e4f]/40 text-xs text-[#fff9d9] mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#ff9e4f] animate-ping" />
              <span className="font-mono font-medium tracking-wide">
                Practice engine 2.0 · Built for serious problem solvers
              </span>
            </div>

            {/* Hero Headline with High-Contrast Legibility */}
            <div className="relative mb-10">
              <div className="absolute -inset-x-8 -inset-y-4 bg-[#080a0e]/60 blur-2xl rounded-3xl -z-10 pointer-events-none" />
              <h1 className="max-w-4xl text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.08] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                Practice smarter. <br />
                Crack{" "}
                <span className="bg-gradient-to-r from-[#ff9e4f] via-[#16cfd9] to-[#54e17f] bg-clip-text text-transparent">
                  more.
                </span>
              </h1>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
              <a
                href="#get-started"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#ff9e4f] hover:bg-[#ffaa66] text-[#080a0e] font-bold text-sm shadow-xl shadow-[#ff9e4f]/30 hover:shadow-[#ff9e4f]/45 hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                <span>Start practicing</span>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </a>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#0d1118]/90 hover:bg-[#131926] border border-[#1e2535] hover:border-slate-700 text-slate-300 hover:text-white font-medium text-sm transition-all backdrop-blur-sm"
              >
                See how it works
              </a>
            </div>

            {/* Social Proof Trust Badge */}
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-medium">
              <svg
                className="w-4 h-4 text-[#16cfd9] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>
                Trusted by 20,000+ candidates targeting top percentiles in IIT
                JEE, NEET, and competitive exams
              </span>
            </div>
          </div>

          {/* HERO PRODUCT MOCKUP: DASHBOARD PREVIEW */}
          <div className="w-full max-w-5xl mt-14 rounded-2xl border border-[#1e2535] bg-[#0a0d14]/90 backdrop-blur-xl shadow-2xl shadow-[#ff9e4f]/5 overflow-hidden text-left relative z-10">
            {/* Window Top Chrome */}
            <div className="px-4 py-3 bg-[#0d1118] border-b border-[#1e2535] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]/80" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]/80" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]/80" />
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-[#080a0e] border border-[#1e2535] text-[11px] font-mono text-slate-400">
                <svg
                  className="w-3 h-3 text-[#16cfd9]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>crackr.app/practice/dashboard</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono text-[#16cfd9]">
                <span className="w-2 h-2 rounded-full bg-[#16cfd9] animate-pulse" />
                <span>TELEMETRY ACTIVE</span>
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-5 sm:p-7 space-y-6">
              {/* Header inside Dashboard */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2535]/60">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Good evening, Alex
                    </h2>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#fff9d9]/10 text-[#fff9d9] border border-[#fff9d9]/30">
                      LEVEL 3
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Calibrated daily minimum: 25 questions to target mastery bar.
                  </p>
                </div>
                <div className="flex items-center">
                  <button className="px-3 py-1.5 rounded-lg border border-[#1e2535] hover:border-slate-700 bg-[#0d1118] text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
                    <svg
                      className="w-3.5 h-3.5 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    <span>LOG OUT</span>
                  </button>
                </div>
              </div>

              {/* 4 Quick Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 7 Day Streak */}
                <div className="p-4 rounded-xl bg-[#0d1118] border border-[#1e2535] relative overflow-hidden group hover:border-[#ff9e4f]/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      STREAK
                    </span>
                    <svg
                      className="w-4 h-4 text-[#ff9e4f]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
                    </svg>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    7 Day Streak
                  </div>
                  <div className="text-xs text-[#ff9e4f] font-medium mt-1">
                    Keep your streak alive
                  </div>
                </div>

                {/* ACCURACY */}
                <div className="p-4 rounded-xl bg-[#0d1118] border border-[#1e2535] relative overflow-hidden group hover:border-[#54e17f]/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      ACCURACY
                    </span>
                    <svg
                      className="w-4 h-4 text-[#54e17f]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    84.6%
                  </div>
                  <div className="text-xs text-[#54e17f] font-medium mt-1">
                    +2.3% this week
                  </div>
                </div>

                {/* SOLVED */}
                <div className="p-4 rounded-xl bg-[#0d1118] border border-[#1e2535] relative overflow-hidden group hover:border-[#16cfd9]/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      SOLVED
                    </span>
                    <svg
                      className="w-4 h-4 text-[#16cfd9]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    842
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-1">
                    28 today
                  </div>
                </div>

                {/* PACE */}
                <div className="p-4 rounded-xl bg-[#0d1118] border border-[#1e2535] relative overflow-hidden group hover:border-[#fff9d9]/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      PACE
                    </span>
                    <svg
                      className="w-4 h-4 text-[#fff9d9]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    1m 24s
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-1">
                    / target question
                  </div>
                </div>
              </div>

              {/* Two Column Section in Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Subject Mastery Progress */}
                <div className="p-5 rounded-xl bg-[#0d1118] border border-[#1e2535] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      Subject Mastery Progress
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      COMPLETION GOAL: 75%
                    </span>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Physics */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                        <span className="text-slate-300">Physics</span>
                        <span className="font-mono text-[#ff9e4f] font-bold">
                          75%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#1e2535] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#ff9e4f] transition-all duration-500 shadow-sm shadow-[#ff9e4f]"
                          style={{ width: "75%" }}
                        />
                      </div>
                    </div>

                    {/* Chemistry */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                        <span className="text-slate-300">Chemistry</span>
                        <span className="font-mono text-[#16cfd9] font-bold">
                          91%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#1e2535] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#16cfd9] transition-all duration-500 shadow-sm shadow-[#16cfd9]"
                          style={{ width: "91%" }}
                        />
                      </div>
                    </div>

                    {/* Mathematics */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                        <span className="text-slate-300">Mathematics</span>
                        <span className="font-mono text-[#54e17f] font-bold">
                          89%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#1e2535] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#54e17f] transition-all duration-500 shadow-sm shadow-[#54e17f]"
                          style={{ width: "89%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Session Card */}
                <div className="p-5 rounded-xl bg-[#0d1118] border border-[#1e2535] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-white">
                        Active Session
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff9e4f]/15 text-[#ff9e4f] border border-[#ff9e4f]/30 font-semibold uppercase">
                        IN PROGRESS
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#080a0e] border border-[#1e2535]">
                      <div className="text-[10px] font-mono text-[#ff9e4f] uppercase tracking-wider mb-1">
                        PHYSICS DRILL
                      </div>
                      <div className="text-base font-bold text-white">
                        Work, Energy & Power
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        8 questions · 3 completed
                      </div>

                      {/* Step Indicator */}
                      <div className="flex items-center gap-1.5 mt-3">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className="h-1.5 flex-1 rounded-full bg-[#ff9e4f]"
                          />
                        ))}
                        {[4, 5, 6, 7, 8].map((step) => (
                          <div
                            key={step}
                            className="h-1.5 flex-1 rounded-full bg-[#1e2535]"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400 font-mono">
                      Est. remaining: 12 min
                    </span>
                    <button className="px-4 py-2 rounded-lg bg-[#ff9e4f] hover:bg-[#ffaa66] text-[#080a0e] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#ff9e4f]/25 transition-all">
                      <span>CONTINUE</span>
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: ENGINEERED FOR DELIBERATE PRACTICE */}
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1e2535]/60">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-mono text-[#16cfd9] uppercase tracking-widest block mb-3 font-semibold">
                ONE HOP TO HIGH REPETITION
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                Engineered for deliberate practice
              </h2>
              <p className="text-base sm:text-lg text-slate-400">
                High-yield routines designed to maximize retention while
                systematically eradicating cognitive weak points.
              </p>
            </div>

            {/* 3 Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 01 */}
              <div className="p-7 rounded-2xl bg-[#0d1118] border border-[#1e2535] hover:border-[#54e17f]/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="text-4xl font-mono font-extrabold text-[#54e17f] mb-6">
                    01
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                    Pick what you want to practice
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Target specific domains, difficulty tiers, and problem
                    archetype variations. Filter dynamically across syllabus
                    milestones.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-[#16cfd9]">
                  <a
                    href="#practice"
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>Explore syllabus</span>
                    <span>→</span>
                  </a>
                  <span className="text-slate-600">/</span>
                  <a href="#rules" className="hover:underline">
                    Adaptive bucket rules
                  </a>
                </div>
              </div>

              {/* Card 02 */}
              <div className="p-7 rounded-2xl bg-[#0d1118] border border-[#1e2535] hover:border-[#ff9e4f]/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="text-4xl font-mono font-extrabold text-[#54e17f] mb-6">
                    02
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                    Answer focused questions
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Timed, distraction-free environment eliminating visual
                    noise. Keyboard-first navigation fosters raw simplicity in
                    the zone.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-[#16cfd9]">
                  <a
                    href="#shortcuts"
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>Keyboard shortcuts</span>
                    <span>→</span>
                  </a>
                  <span className="text-slate-600">/</span>
                  <a href="#multimodal" className="hover:underline">
                    Multi-modal
                  </a>
                </div>
              </div>

              {/* Card 03 */}
              <div className="p-7 rounded-2xl bg-[#0d1118] border border-[#1e2535] hover:border-[#16cfd9]/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="text-4xl font-mono font-extrabold text-[#54e17f] mb-6">
                    03
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                    See exactly where you&apos;re getting beaten
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Micro-telemetry on concept breakdown, cognitive speed, and
                    retention. Actionable diagnostic breakdowns after every
                    session.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-[#16cfd9]">
                  <a
                    href="#analytics"
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>Full analytics preview</span>
                    <span>→</span>
                  </a>
                  <span className="text-slate-600">/</span>
                  <a href="#predictive" className="hover:underline">
                    Predictive scoring
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: THE WORKSPACE ENVIRONMENT (DISTRACTION-FREE PROBLEM SOLVING) */}
        <section id="practice" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1e2535]/60 bg-[#080a0e] relative">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-mono text-[#16cfd9] uppercase tracking-widest block mb-3 font-semibold">
                THE WORKSPACE ENVIRONMENT
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                Distraction-free problem solving
              </h2>
              <p className="text-base sm:text-lg text-slate-400">
                Designed like keycaps and Linux terminals: pure cognitive flow
                without clutter.
              </p>
            </div>

            {/* Interactive Workspace Card */}
            <div className="rounded-2xl border border-[#1e2535] bg-[#0a0d14] shadow-2xl shadow-[#ff9e4f]/5 overflow-hidden">
              {/* Question Header */}
              <div className="px-5 py-4 bg-[#0d1118] border-b border-[#1e2535] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[#ff9e4f] font-semibold">PHYSICS</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-300">Work, Energy & Power</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-slate-400">Question 4 of 20</span>
                  <button className="px-2 py-1 rounded bg-[#080a0e] border border-[#1e2535] text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
                    <svg
                      className="w-3 h-3 text-[#ff9e4f]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                      <line x1="4" x2="4" y1="22" y2="15" />
                    </svg>
                    <span>FLAG</span>
                  </button>
                </div>
              </div>

              {/* Question Statement & Options */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 font-semibold">
                    PROBLEM STATEMENT
                  </div>
                  <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed">
                    A particle of mass 2 kg moves along the x-axis under the
                    influence of a conservative force-field where the potential
                    energy is given by{" "}
                    <span className="font-mono text-[#16cfd9] bg-[#141924] px-2 py-0.5 rounded border border-[#16cfd9]/30">
                      U(x) = -3x² - 6x + 2
                    </span>
                    . What is the work done by the force as the particle moves
                    from{" "}
                    <span className="font-mono text-[#16cfd9]">x = -1 m</span> to{" "}
                    <span className="font-mono text-[#16cfd9]">x = 3 m</span>?
                  </p>
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-3 pt-2">
                  {options.map((option) => {
                    const isSelected = selectedOption === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setSelectedOption(option.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-[#1f1915] border-[#ff9e4f] ring-1 ring-[#ff9e4f]/50 shadow-md shadow-[#ff9e4f]/20"
                            : "bg-[#0d1118] border-[#1e2535] hover:border-slate-700 hover:bg-[#121722]"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                              isSelected
                                ? "bg-[#ff9e4f] text-[#080a0e]"
                                : "bg-[#080a0e] border border-[#1e2535] text-slate-400"
                            }`}
                          >
                            {option.id}
                          </div>
                          <span
                            className={`text-sm sm:text-base font-medium ${
                              isSelected ? "text-white font-semibold" : "text-slate-300"
                            }`}
                          >
                            {option.text}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-mono font-bold tracking-wider text-[#ff9e4f] px-2.5 py-0.5 rounded bg-[#ff9e4f]/15 border border-[#ff9e4f]/30">
                            SELECTED
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Action Bar */}
                <div className="pt-4 border-t border-[#1e2535] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={markedForReview}
                        onChange={(e) => setMarkedForReview(e.target.checked)}
                        className="rounded border-[#1e2535] bg-[#080a0e] text-[#ff9e4f] focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Mark for review</span>
                    </label>
                  </div>

                  <div className="hidden md:flex items-center gap-3 text-xs font-mono text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-[#0d1118] border border-[#1e2535] text-slate-300">
                      [←][→]
                    </span>
                    <span>Navigate</span>
                    <span className="text-slate-600">·</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#0d1118] border border-[#1e2535] text-slate-300">
                      [1][2][3][4]
                    </span>
                    <span>Select</span>
                  </div>

                  <button
                    onClick={() => setSubmitted(true)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#ff9e4f] hover:bg-[#ffaa66] text-[#080a0e] text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-[#ff9e4f]/25 transition-all"
                  >
                    <span>{submitted ? "Submitted ✓" : "Submit →"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: PSYCHOLOGICAL ENGINEERING */}
        <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1e2535]/60">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-mono text-[#fff9d9] uppercase tracking-widest block mb-3 font-semibold">
                PSYCHOLOGICAL ENGINEERING
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                Momentum mechanics, zero fluff.
              </h2>
              <p className="text-base sm:text-lg text-slate-400">
                We eliminated avatars, cartoon animations, and superficial
                badges. Zero bloated feedback loop, high-yield practice.
              </p>
            </div>

            {/* 3 Distinct Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Streak Engine (Accent: Orange #FF9E4F) */}
              <div className="p-7 rounded-2xl bg-[#0d1118] border border-[#1e2535] hover:border-[#ff9e4f]/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#ff9e4f]/15 border border-[#ff9e4f]/30 flex items-center justify-center mb-6 text-[#ff9e4f]">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                    Streak Engine
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Fostering unbroken daily commitment and high-density routines
                    that muscle discipline over time.
                  </p>

                  {/* 7-day Streak Boxes */}
                  <div className="grid grid-cols-7 gap-1.5 mb-6">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-lg bg-[#ff9e4f]/20 border border-[#ff9e4f]/40 flex items-center justify-center text-[10px] font-mono font-bold text-[#ff9e4f]"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] font-mono text-[#ff9e4f] font-semibold tracking-wider">
                  7 CONSECUTIVE SESSIONS LOGGED
                </div>
              </div>

              {/* Card 2: XP & Mastery (Accent: Mint #54E17F) */}
              <div className="p-7 rounded-2xl bg-[#0d1118] border border-[#1e2535] hover:border-[#54e17f]/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#54e17f]/15 border border-[#54e17f]/30 flex items-center justify-center mb-6 text-[#54e17f]">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                    XP & Mastery
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Earn XP strictly weighted by question complexity and
                    efficiency rather than vanity metrics.
                  </p>

                  {/* XP Breakdown Rows */}
                  <div className="space-y-2 mb-6 text-xs font-mono">
                    <div className="flex items-center justify-between p-2 rounded bg-[#080a0e] border border-[#1e2535]">
                      <span className="text-slate-400">BASE XP: QUESTION COMPLETED</span>
                      <span className="text-[#54e17f] font-bold">+100 XP</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#080a0e] border border-[#1e2535]">
                      <span className="text-slate-400">SPEED BONUS: UNDER 1M</span>
                      <span className="text-[#54e17f] font-bold">+25 XP</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#080a0e] border border-[#1e2535]">
                      <span className="text-slate-400">FIRST TRY SUCCESS</span>
                      <span className="text-[#54e17f] font-bold">+50 XP</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-[#54e17f] font-semibold tracking-wider">
                  CALIBRATED ON 1,200 DIFFICULTY POINTS
                </div>
              </div>

              {/* Card 3: Adaptive Weak-spot Detection (Accent: Aqua #16CFD9) */}
              <div className="p-7 rounded-2xl bg-[#0d1118] border border-[#1e2535] hover:border-[#16cfd9]/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#16cfd9]/15 border border-[#16cfd9]/30 flex items-center justify-center mb-6 text-[#16cfd9]">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="22" x2="18" y1="12" y2="12" />
                      <line x1="6" x2="2" y1="12" y2="12" />
                      <line x1="12" x2="12" y1="6" y2="2" />
                      <line x1="12" x2="12" y1="22" y2="18" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                    Adaptive Weak-spot Detection
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Real-time clustering automatically isolates cognitive
                    blindspots and feeds spaced-repetition drills into your queue.
                  </p>

                  {/* Weak-spot Box */}
                  <div className="p-3.5 rounded-lg bg-[#080a0e] border border-[#16cfd9]/30 mb-6 space-y-1">
                    <div className="text-[11px] font-mono font-bold text-[#16cfd9]">
                      DETECTED WEAK SPOT
                    </div>
                    <div className="text-xs font-semibold text-white">
                      Rotational Inertia Integrals
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Found with error rate &gt; 60%
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-[#16cfd9] font-semibold tracking-wider">
                  ENHANCE RETENTION VIA RE-COMPILATION
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL SECTION */}
        <section id="get-started" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1e2535]/60 relative text-center">
          <div className="max-w-3xl mx-auto flex flex-col items-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
              Ready to crack it?
            </h2>
            <p className="text-base sm:text-lg text-slate-400 mb-9">
              Build the habit. Answer the questions. Get better.
            </p>
            <a
              href="#signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#ff9e4f] hover:bg-[#ffaa66] text-[#080a0e] font-bold text-base shadow-xl shadow-[#ff9e4f]/35 hover:shadow-[#ff9e4f]/50 hover:-translate-y-0.5 active:translate-y-0 transition-all mb-4"
            >
              <span>GET STARTED</span>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
            <div className="text-xs font-mono text-[#fff9d9]/70 uppercase tracking-wider">
              FREE 14-DAY EVALUATION · NO CREDIT CARD REQUIRED
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#1e2535] bg-[#080a0e] pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Top Row: Brand & Links */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Brand column */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#ff9e4f] flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-[#080a0e]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="m13 2-2 2.5h3L11 8" />
                    <path d="M12 22v-6" />
                    <path d="M8 8H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-3" />
                  </svg>
                </div>
                <span className="font-bold text-base text-white tracking-tight">
                  crackr
                </span>
              </div>
              <p className="text-slate-400 max-w-sm leading-relaxed text-xs">
                Focused practice engine designed specifically for candidates
                preparing for high-stakes examinations.
              </p>
            </div>

            {/* Links: PRODUCT */}
            <div className="space-y-3">
              <div className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                PRODUCT
              </div>
              <ul className="space-y-2">
                <li>
                  <a href="#practice" className="hover:text-white transition-colors">
                    Practice Engine
                  </a>
                </li>
                <li>
                  <a href="#questions" className="hover:text-white transition-colors">
                    Question Bank
                  </a>
                </li>
                <li>
                  <a href="#analytics" className="hover:text-white transition-colors">
                    Analytics
                  </a>
                </li>
              </ul>
            </div>

            {/* Links: RESOURCES */}
            <div className="space-y-3">
              <div className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                RESOURCES
              </div>
              <ul className="space-y-2">
                <li>
                  <a href="#docs" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#telemetry" className="hover:text-white transition-colors">
                    Telemetry
                  </a>
                </li>
                <li>
                  <a href="#changelog" className="hover:text-white transition-colors">
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            {/* Links: LEGAL */}
            <div className="space-y-3">
              <div className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                LEGAL
              </div>
              <ul className="space-y-2">
                <li>
                  <a href="#privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-[#1e2535]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
            <div>© 2026 Crackr Inc. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <a href="#privacy" className="hover:text-slate-300 transition-colors">
                Privacy Policy
              </a>
              <a href="#terms" className="hover:text-slate-300 transition-colors">
                Terms of Service
              </a>
              <div className="flex items-center gap-1.5 text-[#54e17f] font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#54e17f] animate-pulse" />
                <span>SYSTEM OPERATIONAL</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
