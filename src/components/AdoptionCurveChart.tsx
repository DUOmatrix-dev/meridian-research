import { useState } from 'react';
import type { AdoptionPoint } from '../types/research';

interface AdoptionCurveChartProps {
  points: AdoptionPoint[];
  currentAdoptionPct: number;
  projected6mPct: number;
  lifecyclePhase: string;
}

export function AdoptionCurveChart({
  points,
  currentAdoptionPct,
  projected6mPct,
  lifecyclePhase,
}: AdoptionCurveChartProps) {
  const safePoints: AdoptionPoint[] =
    points.length > 0
      ? points
      : [
          { stage: 'Innovators', sharePct: 2.5, currentStatus: 'completed', velocityNote: 'Early R&D validation' },
          { stage: 'Early Adopters', sharePct: 13.5, currentStatus: 'active', velocityNote: 'Initial commercial traction' },
          { stage: 'Early Majority', sharePct: 34, currentStatus: 'upcoming', velocityNote: 'Mainstream inflection' },
          { stage: 'Late Majority', sharePct: 34, currentStatus: 'upcoming', velocityNote: 'Standardized adoption' },
          { stage: 'Laggards', sharePct: 16, currentStatus: 'upcoming', velocityNote: 'Legacy migration' },
        ];

  const activeIdx = Math.max(
    0,
    safePoints.findIndex((p) => p.currentStatus === 'active'),
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(activeIdx);
  const activePoint = safePoints[selectedIndex] ?? safePoints[0];

  // SVG Bell + Cumulative S-Curve coordinates (viewBox 640 x 230)
  const width = 640;
  const height = 220;
  const padX = 40;
  const padY = 26;
  const plotW = width - padX * 2;
  const plotH = height - padY - 36;

  // Bell curve heights proportional to sharePct (max 34%)
  const maxShare = Math.max(...safePoints.map((p) => p.sharePct), 34);
  const nodeCoords = safePoints.map((p, idx) => {
    const x = padX + (idx / Math.max(1, safePoints.length - 1)) * plotW;
    const bellY = padY + plotH - (p.sharePct / maxShare) * (plotH * 0.85);
    return { x, bellY, point: p, idx };
  });

  // Smooth bell curve path
  const bellPath = nodeCoords
    .map((n, i) => {
      if (i === 0) return `M ${n.x} ${n.bellY}`;
      const prev = nodeCoords[i - 1];
      const cx = (prev.x + n.x) / 2;
      return `C ${cx} ${prev.bellY}, ${cx} ${n.bellY}, ${n.x} ${n.bellY}`;
    })
    .join(' ');

  const areaPath = `${bellPath} L ${nodeCoords[nodeCoords.length - 1].x} ${padY + plotH} L ${nodeCoords[0].x} ${padY + plotH} Z`;

  // Map currentAdoptionPct (0..100) onto horizontal span
  const clampedNow = Math.min(98, Math.max(2, currentAdoptionPct));
  const clamped6m = Math.min(99, Math.max(clampedNow + 1, projected6mPct));
  const nowX = padX + (clampedNow / 100) * plotW;
  const projX = padX + (clamped6m / 100) * plotW;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Technology Diffusion & Adoption Curve
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Current lifecycle position: {lifecyclePhase} · Click any cohort to inspect adoption dynamics
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
          <span className="text-violet-700 dark:text-violet-300 font-medium">
            Now: {currentAdoptionPct.toFixed(1)}%
          </span>
          <span className="text-slate-400" aria-hidden="true">
            /
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
            +6m Forecast: {projected6mPct.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-4 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[480px] h-auto select-none"
          role="img"
          aria-label="Adoption curve visualization"
        >
          <defs>
            <linearGradient id="adoptionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6D28D9" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal baseline */}
          <line
            x1={padX}
            y1={padY + plotH}
            x2={width - padX}
            y2={padY + plotH}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth="1"
          />

          {/* Shaded diffusion curve */}
          <path d={areaPath} fill="url(#adoptionFill)" />
          <path
            d={bellPath}
            fill="none"
            stroke="#6D28D9"
            strokeWidth="2.25"
            strokeLinecap="round"
          />

          {/* Current adoption vertical marker */}
          <line
            x1={nowX}
            y1={padY}
            x2={nowX}
            y2={padY + plotH}
            stroke="#6D28D9"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={nowX}
            y={padY - 8}
            textAnchor="middle"
            className="fill-violet-700 dark:fill-violet-300 text-[10px] font-mono font-semibold"
          >
            NOW ({currentAdoptionPct.toFixed(1)}%)
          </text>

          {/* 6-month forecast vertical marker */}
          <line
            x1={projX}
            y1={padY + 12}
            x2={projX}
            y2={padY + plotH}
            stroke="#059669"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text
            x={Math.min(width - padX - 24, projX + 4)}
            y={padY + 10}
            textAnchor="start"
            className="fill-emerald-700 dark:fill-emerald-400 text-[10px] font-mono font-medium"
          >
            +6M ({projected6mPct.toFixed(1)}%)
          </text>

          {/* Interactive stage nodes */}
          {nodeCoords.map(({ x, bellY, point, idx }) => {
            const isSelected = idx === selectedIndex;
            const isActive = point.currentStatus === 'active';
            const fillColor =
              point.currentStatus === 'completed'
                ? '#059669'
                : isActive
                ? '#6D28D9'
                : '#94A3B8';

            return (
              <g
                key={point.stage}
                className="cursor-pointer"
                onClick={() => setSelectedIndex(idx)}
              >
                <circle
                  cx={x}
                  cy={bellY}
                  r={isSelected ? 7 : 5}
                  fill={fillColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                {isSelected && (
                  <circle
                    cx={x}
                    cy={bellY}
                    r={11}
                    fill="none"
                    stroke={fillColor}
                    strokeWidth="1.5"
                    strokeOpacity="0.45"
                  />
                )}
                <text
                  x={x}
                  y={padY + plotH + 16}
                  textAnchor="middle"
                  className={`text-[11px] font-medium ${
                    isSelected
                      ? 'fill-slate-900 dark:fill-slate-100 font-semibold'
                      : 'fill-slate-500 dark:fill-slate-400'
                  }`}
                >
                  {point.stage}
                </text>
                <text
                  x={x}
                  y={padY + plotH + 30}
                  textAnchor="middle"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                >
                  {point.sharePct}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {activePoint && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {activePoint.stage}
            </span>
            <span className="text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
              {activePoint.sharePct}% of addressable market
            </span>
            <span className="text-slate-400" aria-hidden="true">
              ·
            </span>
            <span
              className={`font-medium capitalize ${
                activePoint.currentStatus === 'completed'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : activePoint.currentStatus === 'active'
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {activePoint.currentStatus}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">{activePoint.velocityNote}</p>
        </div>
      )}
    </div>
  );
}
