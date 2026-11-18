import { useState } from 'react';
import type { MarketSegment, ResearchMetrics } from '../types/research';

interface MarketSizingPanelProps {
  metrics: ResearchMetrics;
  segments: MarketSegment[];
}

export function MarketSizingPanel({ metrics, segments }: MarketSizingPanelProps) {
  const [capturePct, setCapturePct] = useState<number>(3.5);
  const [acvUsd, setAcvUsd] = useState<number>(metrics.avgAcvUsd || 36000);
  const [velocityMultiplier, setVelocityMultiplier] = useState<number>(1.0);

  const confidenceDelta = Math.max(5, 100 - metrics.sizingConfidencePct);
  const somBillions = metrics.somUsdMillions / 1000;
  const samRatio = metrics.tamUsdBillions > 0 ? (metrics.samUsdBillions / metrics.tamUsdBillions) * 100 : 25;
  const somRatio = metrics.tamUsdBillions > 0 ? Math.max(4, (somBillions / metrics.tamUsdBillions) * 100) : 6;

  // Interactive 3-Year ARR Scenario Calculation
  const samDollars = metrics.samUsdBillions * 1_000_000_000;
  const targetMarketRevenue = samDollars * (capturePct / 100) * 0.01; // Realistic obtainable slice
  const baseCustomers = Math.max(12, Math.round((metrics.somUsdMillions * 1_000_000 * (capturePct / 100)) / Math.max(1000, acvUsd)));
  const yr1Arr = Math.round(baseCustomers * 0.28 * acvUsd * velocityMultiplier);
  const yr2Arr = Math.round(baseCustomers * 0.62 * acvUsd * velocityMultiplier);
  const yr3Arr = Math.round(baseCustomers * acvUsd * velocityMultiplier);
  const blendedCagr = ((metrics.cagrPct * velocityMultiplier) || 20).toFixed(1);

  const formatUsdCompact = (val: number) => {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* TAM / SAM / SOM Structural Breakdown */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-baseline justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Market Opportunity Funnel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {metrics.sizingTimeframe} horizon · ±{confidenceDelta}% sizing confidence interval
              </p>
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {metrics.cagrPct.toFixed(1)}% CAGR
            </span>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <div className="flex items-baseline justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Total Addressable Market (TAM)
                </span>
                <span className="font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  ${metrics.tamUsdBillions.toFixed(1)}B
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                <div className="h-full bg-slate-700 dark:bg-slate-400 w-full" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Global theoretical demand across all eligible enterprise and commercial verticals.
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Serviceable Addressable Market (SAM)
                </span>
                <span className="font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  ${metrics.samUsdBillions.toFixed(1)}B
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-violet-700"
                  style={{ width: `${Math.min(100, Math.max(8, samRatio))}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Active addressable slice aligned with modern API, compliance, and buyer readiness.
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Serviceable Obtainable Market (SOM)
                </span>
                <span className="font-mono text-base font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                  ${metrics.somUsdMillions.toFixed(0)}M
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-emerald-600"
                  style={{ width: `${Math.min(100, Math.max(4, somRatio))}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Realistic 3–5 year commercial capture target accounting for incumbent switching friction.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Reference SAM Slice (0.01×)</span>
              <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {formatUsdCompact(targetMarketRevenue)}
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Baseline Avg ACV</span>
              <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                ${metrics.avgAcvUsd.toLocaleString()} / yr
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Scenario Sensitivity Modeler */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                3-Year Opportunity Scenario Modeler
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Stress-test obtainable SOM capture, pricing power, and GTM velocity assumptions
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="som-capture-range" className="font-medium text-slate-700 dark:text-slate-300">
                    Target SOM Share Capture
                  </label>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {capturePct.toFixed(1)}%
                  </span>
                </div>
                <input
                  id="som-capture-range"
                  type="range"
                  min={0.5}
                  max={15}
                  step={0.5}
                  value={capturePct}
                  onChange={(e) => setCapturePct(Number(e.target.value))}
                  className="w-full accent-violet-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="acv-range" className="font-medium text-slate-700 dark:text-slate-300">
                    Annual Contract Value (ACV)
                  </label>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    ${acvUsd.toLocaleString()}
                  </span>
                </div>
                <input
                  id="acv-range"
                  type="range"
                  min={5000}
                  max={150000}
                  step={1000}
                  value={acvUsd}
                  onChange={(e) => setAcvUsd(Number(e.target.value))}
                  className="w-full accent-violet-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="velocity-range" className="font-medium text-slate-700 dark:text-slate-300">
                    Adoption Speed Multiplier
                  </label>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {velocityMultiplier.toFixed(1)}× ({blendedCagr}% adj. growth)
                  </span>
                </div>
                <input
                  id="velocity-range"
                  type="range"
                  min={0.6}
                  max={1.6}
                  step={0.1}
                  value={velocityMultiplier}
                  onChange={(e) => setVelocityMultiplier(Number(e.target.value))}
                  className="w-full accent-violet-700 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Year 1 ARR</div>
              <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatUsdCompact(yr1Arr)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Year 2 ARR</div>
              <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatUsdCompact(yr2Arr)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Year 3 ARR</div>
              <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                {formatUsdCompact(yr3Arr)}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                ~{Math.round(baseCustomers * velocityMultiplier)} accounts
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Segmentation & Unmet Needs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-baseline justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Customer Segmentation & Unmet Needs
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Buyer personas, addressable share, and friction barriers across primary market wedges
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                <th className="py-2.5 px-5">Segment</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Share</th>
                <th className="py-2.5 px-4">Target Buyer Persona</th>
                <th className="py-2.5 px-4">Core Unmet Need</th>
                <th className="py-2.5 px-5">Adoption Barrier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {segments.map((seg) => (
                <tr
                  key={seg.name}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-5 font-semibold text-slate-900 dark:text-slate-100">
                    {seg.name}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {seg.sharePct}%
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {seg.buyerPersona}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                    {seg.unmetNeed}
                  </td>
                  <td className="py-3 px-5 text-slate-500 dark:text-slate-400 leading-relaxed">
                    {seg.adoptionBarrier}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
