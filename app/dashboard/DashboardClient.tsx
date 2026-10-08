'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardData } from '@/lib/services/dashboard';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { GoalProgress } from '@/components/dashboard/GoalProgress';
import { StatCards } from '@/components/dashboard/StatCards';
import { Consistency } from '@/components/dashboard/Consistency';
import { ProgressCharts } from '@/components/dashboard/ProgressCharts';
import { SubjectPerformance } from '@/components/dashboard/SubjectPerformance';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { DailyRewardCard } from '@/components/dashboard/DailyRewardCard';
import { PrimaryActionHero } from '@/components/dashboard/PrimaryActionHero';

interface DashboardClientProps {
  data: DashboardData;
}

export function DashboardClient({ data }: DashboardClientProps) {
  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex selection:bg-[#FF9D50]/30 selection:text-[#FFF9D8]">
      {/* App Sidebar (Fixed Desktop Sidebar + Mobile Bottom Nav) */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        {/* Compact Top Header */}
        <DashboardHeader
          name={data.profile.name}
          grade={data.profile.grade}
          stream={data.profile.stream}
          rankInfo={data.profile.rankInfo}
          levelInfo={data.profile.levelInfo}
        />

        {/* Dashboard Body */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
          {/* 1. Primary Practice Action Hero (Resume or Start Practice) */}
          <PrimaryActionHero
            activeSession={data.activeSession}
            activeSessionsCount={data.activeSessionsCount}
            recommendation={data.recommendation}
            today={data.today}
          />

          {/* 2. Page Greeting Headline */}
          <section className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                {data.greeting.headline}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                {data.greeting.subline}
              </p>
            </div>
          </section>

          {/* 3. Daily Login Reward & Streak Bonus */}
          {data.dailyReward && <DailyRewardCard dailyReward={data.dailyReward} />}

          {/* 2. Today's Target Progress & Overview Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <GoalProgress today={data.today} />
            </div>
            <div className="lg:col-span-7">
              <StatCards overview={data.overview} />
            </div>
          </div>

          {/* 3. Study Consistency / Weekly Pattern */}
          <Consistency consistency={data.consistency} />

          {/* 4. Questions Solved & Accuracy Progress Charts */}
          <ProgressCharts
            questions7={data.charts.days7.questions}
            questions30={data.charts.days30.questions}
            questions90={data.charts.days90.questions}
            accuracy7={data.charts.days7.accuracy}
            accuracy30={data.charts.days30.accuracy}
            accuracy90={data.charts.days90.accuracy}
            hasAnyPractice={data.overview.questionsSolved > 0}
          />

          {/* 5. Subject Performance Breakdown & Recent Sessions Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <SubjectPerformance subjects={data.subjectPerformance} />
            </div>
            <div className="lg:col-span-5">
              <RecentActivity
                sessions={data.recentSessions}
                recommendation={data.recommendation}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
