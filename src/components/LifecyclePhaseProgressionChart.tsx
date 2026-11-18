import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  LifecycleHistoryEntry,
  LifecyclePhase,
  ResearchBrief,
  SignalStrength,
} from '../types/research';

interface LifecyclePhaseProgressionChartProps {
  brief: ResearchBrief;
}

type SeriesMode = 'history' | 'forecast';

interface ChartPoint {
  timeLabel: string;
  fullDate: string;
  lifecyclePhase: LifecyclePhase;
  signalStrength: SignalStrength;
  recordedLevel: number | null;
  projectedLevel: number | null;
  adoptionPct?: number;
  note: string;
  isLatestRecorded?: boolean;
  isForecast?: boolean;
}

const PHASE_TO_LEVEL: Record<LifecyclePhase, number> = {
  Emergence: 1,
  Growth: 2,
  Maturity: 3,
  Decline: 4,
};

const LEVEL_TO_PHASE: Record<number, LifecyclePhase> = {
  1: 'Emergence',
  2: 'Growth',
  3: 'Maturity',
  4: 'Decline',
};

function formatShortDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso.slice(0, 10);
  return parsed.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatFullDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function addMonthsLabel(baseIso: string, months: number): string {
  const base = new Date(baseIso);
  const valid = Number.isNaN(base.getTime()) ? new Date() : base;
  const shifted = new Date(valid.getFullYear(), valid.getMonth() + months, 1);
  return shifted.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function buildForecastPoints(
  lastEntry: LifecycleHistoryEntry,
  brief: ResearchBrief,
): ChartPoint[] {
  const currentLevel = PHASE_TO_LEVEL[lastEntry.lifecyclePhase];
  const cagr = brief.metrics.cagrPct;
  const adoptionDelta = brief.metrics.projected6mAdoptionPct - brief.metrics.currentAdoptionPct;
  const rapidShift = cagr >= 24 || adoptionDelta >= 5;

  let next6mLevel = currentLevel;
  let next12mLevel = currentLevel;
  if (currentLevel === 1) {
    next6mLevel = rapidShift ? 2 : 1.5;
    next12mLevel = 2;
  } else if (currentLevel === 2) {
    next6mLevel = brief.metrics.projected6mAdoptionPct >= 35 ? 2.5 : 2;
    next12mLevel = rapidShift || brief.metrics.currentAdoptionPct >= 22 ? 3 : 2.5;
  } else if (currentLevel === 3) {
    next6mLevel = 3;
    next12mLevel = cagr < 10 ? 3.5 : 3;
  }

  const phase6m = LEVEL_TO_PHASE[Math.min(4, Math.max(1, Math.round(next6mLevel)))];
  const phase12m = LEVEL_TO_PHASE[Math.min(4, Math.max(1, Math.round(next12mLevel)))];

  return [
    {
      timeLabel: `${addMonthsLabel(lastEntry.timestamp, 6)} (+6M)`,
      fullDate: addMonthsLabel(lastEntry.timestamp, 6),
      lifecyclePhase: phase6m,
      signalStrength: lastEntry.signalStrength,
      recordedLevel: null,
      projectedLevel: next6mLevel,
      adoptionPct: brief.metrics.projected6mAdoptionPct,
      note: `6-month forecast at ${brief.metrics.projected6mAdoptionPct.toFixed(1)}% adoption (+${cagr.toFixed(1)}% CAGR).`,
      isForecast: true,
    },
    {
      timeLabel: `${addMonthsLabel(lastEntry.timestamp, 12)} (+12M)`,
      fullDate: addMonthsLabel(lastEntry.timestamp, 12),
      lifecyclePhase: phase12m,
      signalStrength: lastEntry.signalStrength,
      recordedLevel: null,
      projectedLevel: next12mLevel,
      note: `12-month trajectory derived from ${brief.leadTimeMonths} mainstream lead time.`,
      isForecast: true,
    },
  ];
}

export function LifecyclePhaseProgressionChart({
  brief,
}: LifecyclePhaseProgressionChartProps) {
  const [mode, setMode] = useState<SeriesMode>('history');

  const sortedHistory = useMemo<LifecycleHistoryEntry[]>(() => {
    const raw = Array.isArray(brief.history) ? brief.history : [];
    if (raw.length === 0) {
      return [
        {
          timestamp: brief.updatedAt || brief.createdAt,
          lifecyclePhase: brief.lifecyclePhase,
          signalStrength: brief.signalStrength,
          adoptionPct: brief.metrics.currentAdoptionPct,
          confidencePct: brief.confidencePct,
          note: `Dossier baseline (${brief.lifecyclePhase} phase, ${brief.signalStrength} signal).`,
        },
      ];
    }
    return [...raw].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );
  }, [brief]);

  const hasRecordedHistory = Array.isArray(brief.history) && brief.history.length > 0;

  const chartData = useMemo<ChartPoint[]>(() => {
    const lastIdx = sortedHistory.length - 1;
    const recordedPoints: ChartPoint[] = sortedHistory.map((entry, idx) => {
      const level = PHASE_TO_LEVEL[entry.lifecyclePhase] ?? 1;
      const isLast = idx === lastIdx;
      return {
        timeLabel: entry.label || formatShortDate(entry.timestamp),
        fullDate: formatFullDate(entry.timestamp),
        lifecyclePhase: entry.lifecyclePhase,
        signalStrength: entry.signalStrength,
        recordedLevel: level,
        projectedLevel: mode === 'forecast' && isLast ? level : null,
        adoptionPct: entry.adoptionPct,
        note: entry.note,
        isLatestRecorded: isLast,
      };
    });

    if (mode === 'forecast' && sortedHistory.length > 0) {
      return [
        ...recordedPoints,
        ...buildForecastPoints(sortedHistory[lastIdx], brief),
      ];
    }
    return recordedPoints;
  }, [sortedHistory, mode, brief]);

  const latestRecordedPoint = chartData.find((p) => p.isLatestRecorded);
  const transitionCount = useMemo(() => {
    let transitions = 0;
    for (let i = 1; i < sortedHistory.length; i++) {
      if (sortedHistory[i].lifecyclePhase !== sortedHistory[i - 1].lifecyclePhase) {
        transitions++;
      }
    }
    return transitions;
  }, [sortedHistory]);

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Lifecycle Phase Progression
          </h3>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
            <span className="font-mono tabular-nums">
              {hasRecordedHistory
                ? `${sortedHistory.length} recorded checkpoints`
                : '1 baseline snapshot (no prior checkpoints)'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {transitionCount} phase {transitionCount === 1 ? 'transition' : 'transitions'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Current: {brief.lifecyclePhase}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-block w-3.5 h-0.5 bg-violet-700" aria-hidden="true" />
              Brief History
            </span>
            {mode === 'forecast' && (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className="inline-block w-3.5 h-0.5 border-t-2 border-dashed border-emerald-600"
                  aria-hidden="true"
                />
                Forward Outlook
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
            {(
              [
                { id: 'history', label: 'History Only' },
                { id: 'forecast', label: 'History + Outlook' },
              ] as Array<{ id: SeriesMode; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  mode === opt.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 18, right: 24, left: 4, bottom: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#94A3B8"
              strokeOpacity={0.22}
              vertical={false}
            />

            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />

            <YAxis
              domain={[0.75, 4.25]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(value: number) => LEVEL_TO_PHASE[value] ?? ''}
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              width={76}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0]?.payload as ChartPoint | undefined;
                if (!row) return null;
                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3.5 py-2.5 shadow-md text-xs max-w-xs space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {row.fullDate}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {row.isForecast ? 'Forecast' : `${row.signalStrength} Signal`}
                      </span>
                    </div>
                    <div className="font-semibold text-violet-700 dark:text-violet-300">
                      {row.lifecyclePhase} Phase
                      {typeof row.adoptionPct === 'number' && (
                        <span className="ml-2 font-mono font-normal text-slate-500 dark:text-slate-400">
                          · {row.adoptionPct.toFixed(1)}% adoption
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {row.note}
                    </p>
                  </div>
                );
              }}
            />

            {latestRecordedPoint && (
              <ReferenceLine
                x={latestRecordedPoint.timeLabel}
                stroke="#6D28D9"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: `Latest: ${latestRecordedPoint.lifecyclePhase}`,
                  position: 'top',
                  fill: '#6D28D9',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="recordedLevel"
              name="Recorded Lifecycle Phase"
              stroke="#6D28D9"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#6D28D9', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#6D28D9', stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls={false}
            />

            {mode === 'forecast' && (
              <Line
                type="monotone"
                dataKey="projectedLevel"
                name="Projected Progression"
                stroke="#059669"
                strokeWidth={2.25}
                strokeDasharray="5 4"
                dot={{ r: 3.5, fill: '#059669', strokeWidth: 0 }}
                activeDot={{ r: 5.5, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }}
                connectNulls={false}
              />
            )}

            {latestRecordedPoint && latestRecordedPoint.recordedLevel !== null && (
              <ReferenceDot
                x={latestRecordedPoint.timeLabel}
                y={latestRecordedPoint.recordedLevel}
                r={5.5}
                fill="#6D28D9"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chronological History Checkpoint Log */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80">
        {sortedHistory.map((entry, idx) => (
          <div
            key={`${entry.timestamp}_${idx}`}
            className="py-2 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 text-xs"
          >
            <div className="flex flex-wrap items-center gap-x-2 shrink-0">
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {formatFullDate(entry.timestamp)}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {entry.lifecyclePhase}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                {entry.signalStrength} Signal
              </span>
              {typeof entry.adoptionPct === 'number' && (
                <>
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-violet-700 dark:text-violet-300">
                    {entry.adoptionPct.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-400 sm:text-right leading-snug">
              {entry.note}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
