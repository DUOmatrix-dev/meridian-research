import { useEffect, useMemo, useState } from 'react';
import type { CompetitorEntry } from '../types/research';

interface CompetitiveComparisonViewProps {
  competitors: CompetitorEntry[];
  axisXLabel: string;
  axisYLabel: string;
  topic: string;
}

type CategoryFilter = 'All' | 'Direct' | 'Indirect' | 'Emerging';
type SortField = 'composite' | 'share' | 'xScore' | 'yScore' | 'name';
type LayoutMode = 'grid' | 'table';

interface EnrichedCompetitor extends CompetitorEntry {
  derivedSharePct: number;
  compositeScore: number;
  differentiationDelta: number;
  derivedFeatures: string[];
}

function enrichCompetitors(competitors: CompetitorEntry[]): EnrichedCompetitor[] {
  if (competitors.length === 0) return [];

  const rawWeights = competitors.map((c) => {
    if (typeof c.marketSharePct === 'number' && c.marketSharePct > 0) {
      return c.marketSharePct;
    }
    const categoryMultiplier =
      c.category === 'Direct' ? 1.25 : c.category === 'Indirect' ? 0.95 : 0.55;
    return Math.max(8, (c.xScore * 0.72 + c.yScore * 0.28) * categoryMultiplier);
  });

  const explicitSum = competitors.every(
    (c) => typeof c.marketSharePct === 'number' && c.marketSharePct > 0,
  );
  const totalWeight = rawWeights.reduce((acc, w) => acc + w, 0) || 1;

  return competitors.map((comp, idx) => {
    const derivedSharePct = explicitSum
      ? Number((comp.marketSharePct ?? 0).toFixed(1))
      : Number(((rawWeights[idx] / totalWeight) * 86).toFixed(1));

    const compositeScore = Math.round((comp.xScore + comp.yScore) / 2);
    const differentiationDelta = comp.yScore - comp.xScore;

    const derivedFeatures =
      Array.isArray(comp.keyFeatures) && comp.keyFeatures.length > 0
        ? comp.keyFeatures
        : [
            comp.positioning.split(/[.;]/)[0]?.trim() || comp.positioning,
            `Switching friction: ${comp.switchingCost}`,
            `Pricing: ${comp.pricingModel}`,
          ];

    return {
      ...comp,
      derivedSharePct,
      compositeScore,
      differentiationDelta,
      derivedFeatures,
    };
  });
}

export function CompetitiveComparisonView({
  competitors,
  axisXLabel,
  axisYLabel,
  topic,
}: CompetitiveComparisonViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [sortField, setSortField] = useState<SortField>('composite');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [selectedNames, setSelectedNames] = useState<string[]>(() =>
    competitors.slice(0, 4).map((c) => c.name),
  );

  // Sync default selection whenever the active ResearchBrief's competitors change
  useEffect(() => {
    setSelectedNames(competitors.slice(0, 4).map((c) => c.name));
    setCategoryFilter('All');
  }, [competitors]);

  const enriched = useMemo(() => enrichCompetitors(competitors), [competitors]);

  const filtered = useMemo(() => {
    const base =
      categoryFilter === 'All'
        ? enriched
        : enriched.filter((c) => c.category === categoryFilter);

    return [...base].sort((a, b) => {
      if (sortField === 'composite') return b.compositeScore - a.compositeScore;
      if (sortField === 'share') return b.derivedSharePct - a.derivedSharePct;
      if (sortField === 'xScore') return b.xScore - a.xScore;
      if (sortField === 'yScore') return b.yScore - a.yScore;
      return a.name.localeCompare(b.name);
    });
  }, [enriched, categoryFilter, sortField]);

  const comparedCompetitors = useMemo(() => {
    if (layoutMode !== 'grid') return filtered;
    const active = filtered.filter((c) => selectedNames.includes(c.name));
    return active.length > 0 ? active : filtered.slice(0, 4);
  }, [filtered, selectedNames, layoutMode]);

  const leaders = useMemo(() => {
    if (comparedCompetitors.length === 0) {
      return { x: -1, y: -1, share: -1, composite: -1 };
    }
    return {
      x: Math.max(...comparedCompetitors.map((c) => c.xScore)),
      y: Math.max(...comparedCompetitors.map((c) => c.yScore)),
      share: Math.max(...comparedCompetitors.map((c) => c.derivedSharePct)),
      composite: Math.max(...comparedCompetitors.map((c) => c.compositeScore)),
    };
  }, [comparedCompetitors]);

  const totalMappedShare = enriched.reduce((sum, c) => sum + c.derivedSharePct, 0);
  const longTailShare = Math.max(0, Number((100 - totalMappedShare).toFixed(1)));

  const toggleCompetitorSelection = (name: string) => {
    setSelectedNames((prev) => {
      if (prev.includes(name)) {
        if (prev.length <= 1) return prev; // Keep at least 1 column visible
        return prev.filter((n) => n !== name);
      }
      return [...prev, name];
    });
  };

  return (
    <div className="space-y-6">
      {/* Market Share & Comparison Controls */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Competitive Comparison & Differentiation Grid
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Side-by-side benchmark of {axisXLabel}, {axisYLabel}, market share, switching friction, and exploitable gaps in {topic}
            </p>
          </div>
          <div className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {competitors.length} mapped players · {totalMappedShare.toFixed(1)}% tracked share
          </div>
        </div>

        {/* Proportional Market Share Strip */}
        {enriched.length > 0 && (
          <div className="mt-4 space-y-2.5">
            <div className="h-3 w-full rounded-sm overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              {[...enriched]
                .sort((a, b) => b.derivedSharePct - a.derivedSharePct)
                .map((comp, idx) => {
                  const colors = [
                    'bg-violet-700',
                    'bg-emerald-600',
                    'bg-slate-700 dark:bg-slate-400',
                    'bg-amber-600',
                    'bg-sky-600',
                    'bg-indigo-500',
                  ];
                  return (
                    <div
                      key={comp.name}
                      title={`${comp.name}: ${comp.derivedSharePct}%`}
                      style={{ width: `${Math.max(3, comp.derivedSharePct)}%` }}
                      className={`${colors[idx % colors.length]} border-r border-white/60 dark:border-slate-900/60`}
                    />
                  );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              {[...enriched]
                .sort((a, b) => b.derivedSharePct - a.derivedSharePct)
                .map((comp, idx) => {
                  const dotColors = [
                    'bg-violet-700',
                    'bg-emerald-600',
                    'bg-slate-700 dark:bg-slate-400',
                    'bg-amber-600',
                    'bg-sky-600',
                    'bg-indigo-500',
                  ];
                  return (
                    <span
                      key={comp.name}
                      className="inline-flex items-center gap-1.5 font-mono tabular-nums"
                    >
                      <span
                        className={`inline-block w-2 h-2 rounded-xs ${dotColors[idx % dotColors.length]}`}
                      />
                      <span className="font-sans font-medium text-slate-800 dark:text-slate-200">
                        {comp.name}
                      </span>
                      <span>{comp.derivedSharePct}%</span>
                    </span>
                  );
                })}
              {longTailShare > 0 && (
                <span className="font-mono tabular-nums text-slate-400">
                  Other / Long Tail {longTailShare}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Filter, Sort & Layout Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['All', 'Direct', 'Indirect', 'Emerging'] as CategoryFilter[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <label
                htmlFor="comp-sort"
                className="text-slate-500 dark:text-slate-400 whitespace-nowrap"
              >
                Sort by
              </label>
              <select
                id="comp-sort"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-600"
              >
                <option value="composite">Composite Score</option>
                <option value="share">Market Share (%)</option>
                <option value="xScore">{axisXLabel}</option>
                <option value="yScore">{axisYLabel}</option>
                <option value="name">Competitor Name</option>
              </select>
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
              {(
                [
                  { id: 'grid', label: 'Side-by-Side Grid' },
                  { id: 'table', label: 'Full Matrix' },
                ] as Array<{ id: LayoutMode; label: string }>
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setLayoutMode(mode.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    layoutMode === mode.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Column Selector for Side-by-Side Comparison */}
        {layoutMode === 'grid' && filtered.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
                Compare Columns:
              </span>
              {filtered.map((comp) => {
                const isSelected = comparedCompetitors.some((c) => c.name === comp.name);
                return (
                  <button
                    key={comp.name}
                    type="button"
                    onClick={() => toggleCompetitorSelection(comp.name)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'border-violet-600/60 bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {comp.name}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setSelectedNames(filtered.map((c) => c.name))}
              className="text-[11px] font-medium text-violet-700 dark:text-violet-300 hover:underline whitespace-nowrap shrink-0"
            >
              Show All ({filtered.length})
            </button>
          </div>
        )}
      </section>

      {/* Side-by-Side Comparison Grid vs Full Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No competitors match the selected category filter.
          </div>
        ) : layoutMode === 'grid' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
                  <th className="py-3.5 px-5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 w-52 min-w-[190px] align-bottom">
                    Differentiation Metric
                  </th>
                  {comparedCompetitors.map((comp) => (
                    <th
                      key={comp.name}
                      className="py-3.5 px-4 min-w-[210px] border-l border-slate-100 dark:border-slate-800/80 align-top"
                    >
                      <div className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {comp.name}
                      </div>
                      <div className="mt-0.5 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        {comp.category} · {comp.switchingCost} lock-in
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {/* Composite Differentiation Score */}
                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 dark:text-slate-300">
                    Composite Index
                  </td>
                  {comparedCompetitors.map((comp) => {
                    const isLead = comp.compositeScore === leaders.composite;
                    return (
                      <td
                        key={comp.name}
                        className="py-3 px-4 border-l border-slate-100 dark:border-slate-800/80"
                      >
                        <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {comp.compositeScore} / 100
                          </span>
                          {isLead && (
                            <span className="text-[11px] font-sans font-semibold text-emerald-700 dark:text-emerald-400">
                              Lead
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                          <div
                            className={isLead ? 'h-full bg-emerald-600' : 'h-full bg-violet-700'}
                            style={{ width: `${Math.min(100, comp.compositeScore)}%` }}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Est. Market Share */}
                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 dark:text-slate-300">
                    Est. Market Share
                  </td>
                  {comparedCompetitors.map((comp) => {
                    const isLead = comp.derivedSharePct === leaders.share;
                    return (
                      <td
                        key={comp.name}
                        className="py-3 px-4 border-l border-slate-100 dark:border-slate-800/80"
                      >
                        <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {comp.derivedSharePct.toFixed(1)}%
                          </span>
                          {isLead && (
                            <span className="text-[11px] font-sans font-semibold text-emerald-700 dark:text-emerald-400">
                              Largest Share
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-slate-700 dark:bg-slate-300"
                            style={{ width: `${Math.min(100, comp.derivedSharePct * 2.2)}%` }}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Primary Axis X */}
                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 dark:text-slate-300">
                    {axisXLabel}
                  </td>
                  {comparedCompetitors.map((comp) => {
                    const isLead = comp.xScore === leaders.x;
                    return (
                      <td
                        key={comp.name}
                        className="py-3 px-4 border-l border-slate-100 dark:border-slate-800/80"
                      >
                        <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {comp.xScore} / 100
                          </span>
                          {isLead && (
                            <span className="text-[11px] font-sans font-semibold text-emerald-700 dark:text-emerald-400">
                              Lead
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-violet-700"
                            style={{ width: `${Math.min(100, comp.xScore)}%` }}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Secondary Axis Y */}
                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 dark:text-slate-300">
                    {axisYLabel}
                  </td>
                  {comparedCompetitors.map((comp) => {
                    const isLead = comp.yScore === leaders.y;
                    return (
                      <td
                        key={comp.name}
                        className="py-3 px-4 border-l border-slate-100 dark:border-slate-800/80"
                      >
                        <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {comp.yScore} / 100
                          </span>
                          {isLead && (
                            <span className="text-[11px] font-sans font-semibold text-emerald-700 dark:text-emerald-400">
                              Lead
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-emerald-600"
                            style={{ width: `${Math.min(100, comp.yScore)}%` }}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Differentiation Balance */}
                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 dark:text-slate-300">
                    Axis Skew (Y vs. X)
                  </td>
                  {comparedCompetitors.map((comp) => (
                    <td
                      key={comp.name}
                      className="py-3 px-4 border-l border-slate-100 dark:border-slate-800/80 font-mono tabular-nums text-slate-600 dark:text-slate-300"
                    >
                      {comp.differentiationDelta >= 0 ? '+' : ''}
                      {comp.differentiationDelta} pts{' '}
                      <span className="font-sans text-[11px] text-slate-500 dark:text-slate-400">
                        · {comp.differentiationDelta > 8
                          ? 'Tech-led'
                          : comp.differentiationDelta < -8
                          ? 'Distribution-led'
                          : 'Balanced'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Switching Cost */}
                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 dark:text-slate-300">
                    Switching Friction
                  </td>
                  {comparedCompetitors.map((comp) => (
                    <td
                      key={comp.name}
                      className={`py-3 px-4 border-l border-slate-100 dark:border-slate-800/80 font-semibold ${
                        comp.switchingCost === 'High'
                          ? 'text-amber-700 dark:text-amber-400'
                          : comp.switchingCost === 'Low'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {comp.switchingCost}
                    </td>
                  ))}
                </tr>

                {/* Pricing Model */}
                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 dark:text-slate-300">
                    Pricing & Packaging
                  </td>
                  {comparedCompetitors.map((comp) => (
                    <td
                      key={comp.name}
                      className="py-3 px-4 border-l border-slate-100 dark:border-slate-800/80 font-mono text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed"
                    >
                      {comp.pricingModel}
                    </td>
                  ))}
                </tr>

                {/* Core Positioning */}
                <tr className="align-top">
                  <td className="py-3.5 px-5 font-medium text-slate-700 dark:text-slate-300">
                    Market Positioning
                  </td>
                  {comparedCompetitors.map((comp) => (
                    <td
                      key={comp.name}
                      className="py-3.5 px-4 border-l border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 leading-relaxed"
                    >
                      {comp.positioning}
                    </td>
                  ))}
                </tr>

                {/* Key Capabilities */}
                <tr className="align-top">
                  <td className="py-3.5 px-5 font-medium text-slate-700 dark:text-slate-300">
                    Key Capabilities
                  </td>
                  {comparedCompetitors.map((comp) => (
                    <td
                      key={comp.name}
                      className="py-3.5 px-4 border-l border-slate-100 dark:border-slate-800/80"
                    >
                      <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc pl-4">
                        {comp.derivedFeatures.map((feat, idx) => (
                          <li key={idx} className="leading-snug">
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                {/* Exploitable Gap */}
                <tr className="align-top">
                  <td className="py-3.5 px-5 font-medium text-slate-700 dark:text-slate-300">
                    Exploitable Gap
                  </td>
                  {comparedCompetitors.map((comp) => (
                    <td
                      key={comp.name}
                      className="py-3.5 px-4 border-l border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 leading-relaxed"
                    >
                      {comp.keyGap}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-2.5 px-5">Competitor</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Est. Market Share</th>
                  <th className="py-2.5 px-4">Key Capabilities & Features</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">{axisXLabel}</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">{axisYLabel}</th>
                  <th className="py-2.5 px-4">Pricing & Packaging</th>
                  <th className="py-2.5 px-5">Exploitable Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs align-top">
                {filtered.map((comp) => (
                  <tr
                    key={comp.name}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {comp.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {comp.category} · {comp.switchingCost} switching cost
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">
                      <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {comp.derivedSharePct.toFixed(1)}%
                      </div>
                      <div className="mt-1.5 h-1.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-violet-700"
                          style={{ width: `${Math.min(100, comp.derivedSharePct * 2.5)}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4 min-w-[230px]">
                      <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc pl-4">
                        {comp.derivedFeatures.map((feat, idx) => (
                          <li key={idx} className="leading-snug">
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {comp.xScore} / 100
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {comp.yScore} / 100
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300 min-w-[150px]">
                      {comp.pricingModel}
                    </td>

                    <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 leading-relaxed min-w-[200px]">
                      {comp.keyGap}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
