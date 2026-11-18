import { useState } from 'react';
import type { CompetitorEntry } from '../types/research';

interface CompetitiveMatrixChartProps {
  competitors: CompetitorEntry[];
  axisXLabel: string;
  axisYLabel: string;
}

export function CompetitiveMatrixChart({
  competitors,
  axisXLabel,
  axisYLabel,
}: CompetitiveMatrixChartProps) {
  const [selectedName, setSelectedName] = useState<string>(competitors[0]?.name ?? '');
  const selected =
    competitors.find((c) => c.name === selectedName) ?? competitors[0] ?? null;

  const size = 440;
  const pad = 48;
  const inner = size - pad * 2;

  const getCoords = (c: CompetitorEntry) => {
    const x = pad + (Math.min(98, Math.max(2, c.xScore)) / 100) * inner;
    const y = pad + ((100 - Math.min(98, Math.max(2, c.yScore))) / 100) * inner;
    return { x, y };
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
      <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Competitive Positioning Matrix
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any plotted player to inspect differentiation, pricing, and market gaps
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <svg width="10" height="10" aria-hidden="true">
                <circle cx="5" cy="5" r="4" fill="#6D28D9" />
              </svg>
              Direct
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="10" height="10" aria-hidden="true">
                <rect x="1.5" y="1.5" width="7" height="7" fill="#0F766E" />
              </svg>
              Emerging
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="10" height="10" aria-hidden="true">
                <polygon points="5,1 9,9 1,9" fill="#64748B" />
              </svg>
              Indirect
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full max-w-[440px] h-auto select-none"
            role="img"
            aria-label="Competitive landscape 2x2 matrix"
          >
            {/* Outer grid frame */}
            <rect
              x={pad}
              y={pad}
              width={inner}
              height={inner}
              fill="none"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="1"
            />
            {/* Quadrant crosshairs */}
            <line
              x1={pad + inner / 2}
              y1={pad}
              x2={pad + inner / 2}
              y2={pad + inner}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeDasharray="4 4"
            />
            <line
              x1={pad}
              y1={pad + inner / 2}
              x2={pad + inner}
              y2={pad + inner / 2}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeDasharray="4 4"
            />

            {/* Quadrant water-light labels */}
            <text
              x={pad + 8}
              y={pad + 16}
              className="fill-slate-400 dark:fill-slate-500 text-[10px]"
            >
              Challengers
            </text>
            <text
              x={pad + inner - 8}
              y={pad + 16}
              textAnchor="end"
              className="fill-violet-700 dark:fill-violet-400 text-[10px] font-semibold"
            >
              Category Leaders
            </text>
            <text
              x={pad + 8}
              y={pad + inner - 8}
              className="fill-slate-400 dark:fill-slate-500 text-[10px]"
            >
              Niche Entrants
            </text>
            <text
              x={pad + inner - 8}
              y={pad + inner - 8}
              textAnchor="end"
              className="fill-slate-400 dark:fill-slate-500 text-[10px]"
            >
              Incumbents
            </text>

            {/* Axis Titles */}
            <text
              x={pad + inner / 2}
              y={size - 12}
              textAnchor="middle"
              className="fill-slate-600 dark:fill-slate-300 text-[11px] font-medium"
            >
              {axisXLabel} →
            </text>
            <text
              x={16}
              y={pad + inner / 2}
              textAnchor="middle"
              transform={`rotate(-90 16 ${pad + inner / 2})`}
              className="fill-slate-600 dark:fill-slate-300 text-[11px] font-medium"
            >
              {axisYLabel} →
            </text>

            {/* Plot Nodes with distinct shapes per category */}
            {competitors.map((comp) => {
              const { x, y } = getCoords(comp);
              const isSelected = selected?.name === comp.name;
              const color =
                comp.category === 'Direct'
                  ? '#6D28D9'
                  : comp.category === 'Emerging'
                  ? '#0F766E'
                  : '#64748B';

              return (
                <g
                  key={comp.name}
                  className="cursor-pointer"
                  onClick={() => setSelectedName(comp.name)}
                >
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r={13}
                      fill="none"
                      stroke={color}
                      strokeWidth="1.5"
                      strokeOpacity="0.45"
                    />
                  )}
                  {comp.category === 'Direct' && (
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 7 : 5.5}
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth="1.75"
                    />
                  )}
                  {comp.category === 'Emerging' && (
                    <rect
                      x={x - (isSelected ? 6 : 5)}
                      y={y - (isSelected ? 6 : 5)}
                      width={isSelected ? 12 : 10}
                      height={isSelected ? 12 : 10}
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth="1.75"
                    />
                  )}
                  {comp.category === 'Indirect' && (
                    <polygon
                      points={`${x},${y - 7} ${x + 6.5},${y + 5} ${x - 6.5},${y + 5}`}
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  )}
                  <text
                    x={x}
                    y={y - 11}
                    textAnchor="middle"
                    className={`text-[10px] ${
                      isSelected
                        ? 'fill-slate-900 dark:fill-slate-100 font-semibold'
                        : 'fill-slate-600 dark:fill-slate-400'
                    }`}
                  >
                    {comp.name.length > 20 ? `${comp.name.slice(0, 18)}…` : comp.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Synchronized Competitor Detail Panel */}
      <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between">
        {selected ? (
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>{selected.category} Competitor</span>
                <span aria-hidden="true">·</span>
                <span>Switching Cost: {selected.switchingCost}</span>
              </div>
              <h4 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                {selected.name}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {axisXLabel}
                </div>
                <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {selected.xScore} / 100
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {axisYLabel}
                </div>
                <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {selected.yScore} / 100
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Market Positioning
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {selected.positioning}
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Exploitable White Space & Gap
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {selected.keyGap}
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pricing & Packaging Model
              </div>
              <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                {selected.pricingModel}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No competitors plotted in this dossier.
          </p>
        )}

        <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5">
          {competitors.map((comp) => (
            <button
              key={comp.name}
              type="button"
              onClick={() => setSelectedName(comp.name)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                selected?.name === comp.name
                  ? 'bg-violet-700 text-white font-medium'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {comp.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
