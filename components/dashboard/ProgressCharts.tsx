'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type TimeRange = '7d' | '30d' | '90d';

interface QuestionPoint {
  date: string;
  label: string;
  count: number;
}

interface AccuracyPoint {
  date: string;
  label: string;
  accuracy: number;
  total: number;
}

interface ProgressChartsProps {
  questions7: QuestionPoint[];
  questions30: QuestionPoint[];
  questions90: QuestionPoint[];
  accuracy7: AccuracyPoint[];
  accuracy30: AccuracyPoint[];
  accuracy90: AccuracyPoint[];
  hasAnyPractice: boolean;
}

export function ProgressCharts({
  questions7,
  questions30,
  questions90,
  accuracy7,
  accuracy30,
  accuracy90,
  hasAnyPractice,
}: ProgressChartsProps) {
  const [questionsRange, setQuestionsRange] = useState<TimeRange>('30d');
  const [accuracyRange, setAccuracyRange] = useState<TimeRange>('30d');

  const currentQuestionsData =
    questionsRange === '7d'
      ? questions7
      : questionsRange === '90d'
      ? questions90
      : questions30;

  const currentAccuracyData =
    accuracyRange === '7d'
      ? accuracy7
      : accuracyRange === '90d'
      ? accuracy90
      : accuracy30;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Questions Solved Chart */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-6 flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Questions solved
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Practice volume over time
            </p>
          </div>

          {/* Range Selector */}
          <div className="inline-flex rounded-lg bg-white/[0.04] p-0.5 border border-white/[0.08]">
            {(['7d', '30d', '90d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setQuestionsRange(r)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  questionsRange === r
                    ? 'bg-[#FF9D50] text-[#080A0E] shadow-sm font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Chart View */}
        <div className="h-56 w-full pt-2">
          {hasAnyPractice ? (
            <QuestionsLineChart data={currentQuestionsData} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.08] rounded-xl space-y-2">
              <span className="text-xs font-medium text-zinc-300">
                No practice data yet
              </span>
              <p className="text-[11px] text-zinc-400 max-w-xs">
                Complete your first session to start tracking your practice volume.
              </p>
              <Link
                href="/practice"
                className="inline-block mt-2 text-xs font-semibold text-[#FF9D50] hover:underline"
              >
                Start practicing →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 2. Accuracy Chart */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-6 flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Accuracy
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Performance across active days
            </p>
          </div>

          {/* Range Selector */}
          <div className="inline-flex rounded-lg bg-white/[0.04] p-0.5 border border-white/[0.08]">
            {(['7d', '30d', '90d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setAccuracyRange(r)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  accuracyRange === r
                    ? 'bg-[#20C4D0] text-[#080A0E] shadow-sm font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Chart View */}
        <div className="h-56 w-full pt-2">
          {currentAccuracyData.length > 0 ? (
            <AccuracyLineChart data={currentAccuracyData} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.08] rounded-xl space-y-2">
              <span className="text-xs font-medium text-zinc-300">
                No accuracy data yet
              </span>
              <p className="text-[11px] text-zinc-400 max-w-xs">
                Accuracy trends will calculate automatically as you solve questions.
              </p>
              <Link
                href="/practice"
                className="inline-block mt-2 text-xs font-semibold text-[#20C4D0] hover:underline"
              >
                Start practicing →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function QuestionsLineChart({ data }: { data: QuestionPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 28;

  const maxVal = Math.max(...data.map((d) => d.count), 5);
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;

  const points = data.map((d, idx) => {
    const x = paddingX + (idx / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  const labelStep = Math.max(1, Math.floor(data.length / 5));

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="crackrOrangeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF9D50" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FF9D50" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        <line
          x1={paddingX}
          y1={paddingTop}
          x2={width - paddingX}
          y2={paddingTop}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX}
          y1={paddingTop + chartHeight / 2}
          x2={width - paddingX}
          y2={paddingTop + chartHeight / 2}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="rgba(255,255,255,0.08)"
        />

        {/* Gradient fill */}
        <path d={areaD} fill="url(#crackrOrangeGrad)" />

        {/* Main Line in Crackr Orange */}
        <path d={pathD} fill="none" stroke="#FF9D50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points & Hover Triggers */}
        {points.map((p, idx) => (
          <g key={p.date}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === idx ? 4.5 : 2.5}
              fill={hoveredIdx === idx ? '#FFF9D8' : '#FF9D50'}
              stroke="#080A0E"
              strokeWidth="2"
              className="transition-all"
            />
            <rect
              x={p.x - 10}
              y={0}
              width={20}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            />
          </g>
        ))}

        {/* X-axis Date Labels */}
        {points.map((p, idx) => {
          if (idx % labelStep === 0 || idx === points.length - 1) {
            return (
              <text
                key={p.date}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.4)"
              >
                {p.label}
              </text>
            );
          }
          return null;
        })}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="absolute pointer-events-none bg-[#0C0E14] border border-white/[0.15] text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(points[hoveredIdx].x / width) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100 - 8}%`,
          }}
        >
          <span className="font-semibold block text-[#FF9D50]">{points[hoveredIdx].count} questions</span>
          <span className="text-[10px] text-zinc-400">{points[hoveredIdx].label}</span>
        </div>
      )}
    </div>
  );
}

function AccuracyLineChart({ data }: { data: AccuracyPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 28;

  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;

  const points = data.map((d, idx) => {
    const x = paddingX + (idx / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.accuracy / 100) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const labelStep = Math.max(1, Math.floor(data.length / 5));

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Horizontal gridlines for 100%, 50%, 0% */}
        <line
          x1={paddingX}
          y1={paddingTop}
          x2={width - paddingX}
          y2={paddingTop}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
        <text x={paddingX - 4} y={paddingTop + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.3)">
          100%
        </text>

        <line
          x1={paddingX}
          y1={paddingTop + chartHeight / 2}
          x2={width - paddingX}
          y2={paddingTop + chartHeight / 2}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
        <text x={paddingX - 4} y={paddingTop + chartHeight / 2 + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.3)">
          50%
        </text>

        <line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="rgba(255,255,255,0.08)"
        />

        {/* Main Line in Cyan */}
        <path d={pathD} fill="none" stroke="#20C4D0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points & hover triggers */}
        {points.map((p, idx) => (
          <g key={p.date}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === idx ? 5 : 3}
              fill={hoveredIdx === idx ? '#FFF9D8' : '#20C4D0'}
              stroke="#080A0E"
              strokeWidth="2"
              className="transition-all"
            />
            <rect
              x={p.x - 12}
              y={0}
              width={24}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            />
          </g>
        ))}

        {/* X-axis Date Labels */}
        {points.map((p, idx) => {
          if (idx % labelStep === 0 || idx === points.length - 1) {
            return (
              <text
                key={p.date}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.4)"
              >
                {p.label}
              </text>
            );
          }
          return null;
        })}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="absolute pointer-events-none bg-[#0C0E14] border border-white/[0.15] text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(points[hoveredIdx].x / width) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100 - 8}%`,
          }}
        >
          <span className="font-semibold block text-[#20C4D0]">{points[hoveredIdx].accuracy}% accuracy</span>
          <span className="text-[10px] text-zinc-400">
            {points[hoveredIdx].total} Qs · {points[hoveredIdx].label}
          </span>
        </div>
      )}
    </div>
  );
}
