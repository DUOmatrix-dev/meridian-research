import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LifecyclePhase, ResearchBrief } from '../types/research';

interface TrendLifecycleChartProps {
  brief: ResearchBrief;
}

interface LifecyclePoint {
  period: string;
  stage: LifecyclePhase;
  observedAdoption: number | null;
  projectedAdoption: number | null;
  momentumIndex: number;
  isCurrent?: boolean;
}

const PHASES: LifecyclePhase[] = ['Emergence', 'Growth', 'Maturity', 'Decline'];

function buildLifecycleSeries(brief: ResearchBrief): LifecyclePoint[] {
  const current = Math.min(95, Math.max(1.5, brief.metrics.currentAdoptionPct));
  const proj6m = Math.min(98, Math.max(current + 1.5, brief.metrics.projected6mAdoptionPct));
  const phase = brief.lifecyclePhase;
  const cagr = Math.max(8, brief.metrics.cagrPct);

  // Calibrate historical & forecast curve around the current lifecycle phase
  if (phase === 'Emergence') {
    const q1 = Math.max(0.5, Number((current * 0.25).toFixed(1)));
    const q2 = Math.max(0.8, Number((current * 0.42).toFixed(1)));
    const q3 = Math.max(1.2, Number((current * 0.65).toFixed(1)));
    const q4 = Number(current.toFixed(1));
    const q5 = Number(((current + proj6m) / 2).toFixed(1));
    const q6 = Number(proj6m.toFixed(1));
    const q7 = Number(Math.min(72, proj6m * (1 + cagr / 160)).toFixed(1));
    const q8 = Number(Math.min(84, q7 * (1 + cagr / 180)).toFixed(1));

    return [
      { period: 'Q1 25', stage: 'Emergence', observedAdoption: q1, projectedAdoption: null, momentumIndex: 18 },
      { period: 'Q3 25', stage: 'Emergence', observedAdoption: q2, projectedAdoption: null, momentumIndex: 28 },
      { period: 'Q1 26', stage: 'Emergence', observedAdoption: q3, projectedAdoption: null, momentumIndex: 42 },
      { period: 'Now', stage: 'Emergence', observedAdoption: q4, projectedAdoption: q4, momentumIndex: 58, isCurrent: true },
      { period: 'Q1 27', stage: 'Growth', observedAdoption: null, projectedAdoption: q5, momentumIndex: 71 },
      { period: 'Q2 27', stage: 'Growth', observedAdoption: null, projectedAdoption: q6, momentumIndex: 82 },
      { period: 'Q4 27', stage: 'Maturity', observedAdoption: null, projectedAdoption: q7, momentumIndex: 69 },
      { period: 'Q2 28', stage: 'Decline', observedAdoption: null, projectedAdoption: q8, momentumIndex: 46 },
    ];
  }

  if (phase === 'Growth') {
    const q1 = Math.max(2, Number((current * 0.35).toFixed(1)));
    const q2 = Math.max(4, Number((current * 0.56).toFixed(1)));
    const q3 = Math.max(6, Number((current * 0.78).toFixed(1)));
    const q4 = Number(current.toFixed(1));
    const q5 = Number(((current + proj6m) / 2).toFixed(1));
    const q6 = Number(proj6m.toFixed(1));
    const q7 = Number(Math.min(82, proj6m * 1.24).toFixed(1));
    const q8 = Number(Math.min(90, q7 * 1.1).toFixed(1));

    return [
      { period: 'Q1 25', stage: 'Emergence', observedAdoption: q1, projectedAdoption: null, momentumIndex: 34 },
      { period: 'Q3 25', stage: 'Emergence', observedAdoption: q2, projectedAdoption: null, momentumIndex: 52 },
      { period: 'Q1 26', stage: 'Growth', observedAdoption: q3, projectedAdoption: null, momentumIndex: 74 },
      { period: 'Now', stage: 'Growth', observedAdoption: q4, projectedAdoption: q4, momentumIndex: 88, isCurrent: true },
      { period: 'Q1 27', stage: 'Growth', observedAdoption: null, projectedAdoption: q5, momentumIndex: 92 },
      { period: 'Q2 27', stage: 'Maturity', observedAdoption: null, projectedAdoption: q6, momentumIndex: 78 },
      { period: 'Q4 27', stage: 'Maturity', observedAdoption: null, projectedAdoption: q7, momentumIndex: 62 },
      { period: 'Q2 28', stage: 'Decline', observedAdoption: null, projectedAdoption: q8, momentumIndex: 41 },
    ];
  }

  if (phase === 'Maturity') {
    const q4 = Number(current.toFixed(1));
    const q6 = Number(proj6m.toFixed(1));
    return [
      { period: 'Q1 25', stage: 'Emergence', observedAdoption: Number((q4 * 0.48).toFixed(1)), projectedAdoption: null, momentumIndex: 45 },
      { period: 'Q3 25', stage: 'Growth', observedAdoption: Number((q4 * 0.68).toFixed(1)), projectedAdoption: null, momentumIndex: 78 },
      { period: 'Q1 26', stage: 'Growth', observedAdoption: Number((q4 * 0.86).toFixed(1)), projectedAdoption: null, momentumIndex: 84 },
      { period: 'Now', stage: 'Maturity', observedAdoption: q4, projectedAdoption: q4, momentumIndex: 66, isCurrent: true },
      { period: 'Q1 27', stage: 'Maturity', observedAdoption: null, projectedAdoption: Number(((q4 + q6) / 2).toFixed(1)), momentumIndex: 59 },
      { period: 'Q2 27', stage: 'Maturity', observedAdoption: null, projectedAdoption: q6, momentumIndex: 52 },
      { period: 'Q4 27', stage: 'Decline', observedAdoption: null, projectedAdoption: Number(Math.min(95, q6 * 1.04).toFixed(1)), momentumIndex: 38 },
      { period: 'Q2 28', stage: 'Decline', observedAdoption: null, projectedAdoption: Number(Math.min(96, q6 * 1.05).toFixed(1)), momentumIndex: 29 },
    ];
  }

  // Decline / Commoditization phase
  const q4 = Number(current.toFixed(1));
  return [
    { period: 'Q1 25', stage: 'Growth', observedAdoption: Number((q4 * 0.82).toFixed(1)), projectedAdoption: null, momentumIndex: 74 },
    { period: 'Q3 25', stage: 'Maturity', observedAdoption: Number((q4 * 0.94).toFixed(1)), projectedAdoption: null, momentumIndex: 58 },
    { period: 'Q1 26', stage: 'Maturity', observedAdoption: Number((q4 * 0.98).toFixed(1)), projectedAdoption: null, momentumIndex: 44 },
    { period: 'Now', stage: 'Decline', observedAdoption: q4, projectedAdoption: q4, momentumIndex: 31, isCurrent: true },
    { period: 'Q1 27', stage: 'Decline', observedAdoption: null, projectedAdoption: Number(Math.max(1, q4 * 0.96).toFixed(1)), momentumIndex: 26 },
    { period: 'Q2 27', stage: 'Decline', observedAdoption: null, projectedAdoption: Number(Math.max(1, q4 * 0.92).toFixed(1)), momentumIndex: 22 },
  ];
}

export function TrendLifecycleChart({ brief }: TrendLifecycleChartProps) {
  const data = useMemo(() => buildLifecycleSeries(brief), [brief]);
  const currentPoint = data.find((d) => d.isCurrent);

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Trend Lifecycle Trajectory Over Time
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Observed market penetration vs. 18-month forward lifecycle curve ({brief.lifecyclePhase} stage active)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-violet-700" aria-hidden="true" />
            Observed Adoption (%)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-emerald-600" aria-hidden="true" />
            Projected Adoption (%)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-amber-600" aria-hidden="true" />
            Signal Momentum Index
          </span>
        </div>
      </div>

      <div className="mt-4 h-[270px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 20, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="lifecycleAdoptionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#6D28D9" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.22} vertical={false} />

            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              width={42}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0]?.payload as LifecyclePoint | undefined;
                if (!row) return null;
                const adoption = row.observedAdoption ?? row.projectedAdoption ?? 0;
                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3.5 py-2.5 shadow-md text-xs space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {row.period} · {row.stage} Stage
                    </div>
                    <div className="font-mono tabular-nums text-violet-700 dark:text-violet-300">
                      {row.observedAdoption !== null ? 'Observed' : 'Forecast'} Adoption: {adoption.toFixed(1)}%
                    </div>
                    <div className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                      Signal Momentum: {row.momentumIndex} / 100
                    </div>
                  </div>
                );
              }}
            />

            <ReferenceLine
              x="Now"
              stroke="#6D28D9"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: `${brief.lifecyclePhase} (${brief.metrics.currentAdoptionPct.toFixed(1)}%)`,
                position: 'top',
                fill: '#6D28D9',
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            <Area
              type="monotone"
              dataKey="observedAdoption"
              name="Observed Adoption"
              stroke="#6D28D9"
              strokeWidth={2.25}
              fill="url(#lifecycleAdoptionGradient)"
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey="projectedAdoption"
              name="Projected Adoption"
              stroke="#059669"
              strokeWidth={2.25}
              strokeDasharray="5 4"
              dot={{ r: 3.5, fill: '#059669', strokeWidth: 0 }}
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey="momentumIndex"
              name="Signal Momentum"
              stroke="#D97706"
              strokeWidth={1.75}
              dot={{ r: 2.5, fill: '#D97706', strokeWidth: 0 }}
            />

            {currentPoint && currentPoint.observedAdoption !== null && (
              <ReferenceDot
                x="Now"
                y={currentPoint.observedAdoption}
                r={5.5}
                fill="#6D28D9"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Lifecycle Stage Progress Strip */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PHASES.map((phaseName, idx) => {
          const activeIdx = PHASES.indexOf(brief.lifecyclePhase);
          const isCurrent = phaseName === brief.lifecyclePhase;
          const isCompleted = idx < activeIdx;
          return (
            <div
              key={phaseName}
              className={`px-3 py-2 rounded-md border text-xs ${
                isCurrent
                  ? 'border-violet-600/50 bg-violet-50/70 dark:bg-violet-950/30 text-slate-900 dark:text-slate-100'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  0{idx + 1}. {phaseName}
                </span>
                <span
                  className={`font-mono text-[10px] ${
                    isCurrent
                      ? 'text-violet-700 dark:text-violet-300 font-semibold'
                      : isCompleted
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-400'
                  }`}
                >
                  {isCurrent ? 'Active' : isCompleted ? 'Passed' : 'Upcoming'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
