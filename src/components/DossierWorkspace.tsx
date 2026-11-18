import { useState } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Download,
  FileJson,
  FileText,
} from 'lucide-react';
import {
  buildMarkdownReport,
  buildTextSummary,
  downloadFile,
  downloadPdfBrief,
  slugifyTopic,
} from '../lib/exportBrief';
import type { DossierTab, ResearchBrief } from '../types/research';
import { AdoptionCurveChart } from './AdoptionCurveChart';
import { BriefInterrogator } from './BriefInterrogator';
import { CompetitiveComparisonView } from './CompetitiveComparisonView';
import { CompetitiveMatrixChart } from './CompetitiveMatrixChart';
import { LifecyclePhaseProgressionChart } from './LifecyclePhaseProgressionChart';
import { MarketSizingPanel } from './MarketSizingPanel';
import { SourceIntegrityPanel } from './SourceIntegrityPanel';
import { TechScoutingPanel } from './TechScoutingPanel';
import { TrendLifecycleChart } from './TrendLifecycleChart';

interface DossierWorkspaceProps {
  brief: ResearchBrief;
  isWatched: boolean;
  onPinToWatchlist: (brief: ResearchBrief) => void;
}

const BRIEF_TYPE_LABELS: Record<ResearchBrief['briefType'], string> = {
  'trend-brief': 'Executive Trend Brief',
  'market-map': 'Competitive Market Map',
  'opportunity-assessment': 'Opportunity Assessment',
  'tech-scouting': 'Technology Scouting',
};

const TABS: Array<{ id: DossierTab; label: string }> = [
  { id: 'overview', label: 'Executive Brief' },
  { id: 'sizing', label: 'Market Sizing' },
  { id: 'competitive', label: 'Competitive Map' },
  { id: 'comparison', label: 'Competitive Comparison' },
  { id: 'scouting', label: 'Tech & Regulatory' },
];

export function DossierWorkspace({
  brief,
  isWatched,
  onPinToWatchlist,
}: DossierWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<DossierTab>('overview');
  const [exportOpen, setExportOpen] = useState(false);

  const signalColor =
    brief.signalStrength === 'Strong'
      ? 'text-emerald-700 dark:text-emerald-400'
      : brief.signalStrength === 'Moderate'
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-slate-600 dark:text-slate-400';

  const handleExportPdf = () => {
    downloadPdfBrief(brief);
    setExportOpen(false);
  };

  const handleExportTxt = () => {
    const txt = buildTextSummary(brief);
    downloadFile(txt, `${slugifyTopic(brief.topic) || 'trend-summary'}.txt`, 'text/plain');
    setExportOpen(false);
  };

  const handleExportMd = () => {
    const md = buildMarkdownReport(brief);
    downloadFile(md, `${slugifyTopic(brief.topic) || 'trend-brief'}.md`, 'text/markdown');
    setExportOpen(false);
  };

  const handleExportJson = () => {
    downloadFile(
      JSON.stringify(brief, null, 2),
      `${slugifyTopic(brief.topic) || 'trend-brief'}.json`,
      'application/json',
    );
    setExportOpen(false);
  };

  const m = brief.metrics;

  return (
    <div className="space-y-6">
      {/* Dossier Header & Actions */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">{brief.industry}</span>
              <span aria-hidden="true">·</span>
              <span>{BRIEF_TYPE_LABELS[brief.briefType]}</span>
              <span aria-hidden="true">·</span>
              <span className={`font-semibold ${signalColor}`}>
                {brief.signalStrength} Signal
              </span>
              <span aria-hidden="true">·</span>
              <span>{brief.lifecyclePhase} Phase</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{brief.leadTimeMonths} lead time</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 [text-wrap:balance]">
              {brief.topic}
            </h1>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Confidence: {brief.confidencePct}% · Updated{' '}
              {new Date(brief.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onPinToWatchlist(brief)}
              disabled={isWatched}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                isWatched
                  ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isWatched ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Monitored</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pin to Watchlist</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md bg-violet-700 hover:bg-violet-800 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download PDF</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export</span>
              </button>

              {exportOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg py-1 z-20">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>PDF Summary (.pdf)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTxt}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>Text Summary (.txt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportMd}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>Markdown Brief (.md)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <FileJson className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>Structured JSON (.json)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Quantitative KPI Strip */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total Addressable Market
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              ${m.tamUsdBillions.toFixed(1)}B
            </div>
            <div className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              SAM ${m.samUsdBillions.toFixed(1)}B · {m.sizingTimeframe}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Obtainable Opportunity (SOM)
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-violet-700 dark:text-violet-300">
              ${m.somUsdMillions.toFixed(0)}M
            </div>
            <div className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              ±{Math.max(5, 100 - m.sizingConfidencePct)}% confidence interval
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Projected Growth Rate
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              +{m.cagrPct.toFixed(1)}%
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Annualized CAGR ({m.sizingTimeframe})
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Adoption Trajectory
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {m.currentAdoptionPct.toFixed(1)}% → {m.projected6mAdoptionPct.toFixed(1)}%
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Current share vs. 6-month forecast
            </div>
          </div>
        </div>

        {/* Segmented Dossier View Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-200 dark:border-slate-800">
                Executive Intelligence Thesis
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {brief.executiveSummary}
              </div>
            </div>

            <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-5">
              <div>
                <h3 className="font-display text-sm font-semibold text-emerald-700 dark:text-emerald-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  Structural Acceleration Drivers
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed list-disc pl-4">
                  {brief.drivers.map((driver, i) => (
                    <li key={i}>{driver}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-display text-sm font-semibold text-amber-700 dark:text-amber-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  Adoption & Regulatory Barriers
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed list-disc pl-4">
                  {brief.barriers.map((barrier, i) => (
                    <li key={i}>{barrier}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <LifecyclePhaseProgressionChart brief={brief} />

          <TrendLifecycleChart brief={brief} />

          <AdoptionCurveChart
            points={brief.sections.adoptionCurve}
            currentAdoptionPct={m.currentAdoptionPct}
            projected6mPct={m.projected6mAdoptionPct}
            lifecyclePhase={brief.lifecyclePhase}
          />

          {/* Strategic Product Recommendations */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Actionable Product & Go-To-Market Recommendations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Prioritized strategic bets mapped to execution horizons
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {brief.sections.recommendations.map((rec, idx) => (
                <div
                  key={rec.title}
                  className="py-4 first:pt-4 last:pb-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-start"
                >
                  <div className="md:col-span-5">
                    <div className="text-xs font-mono text-violet-700 dark:text-violet-300">
                      0{idx + 1}. {rec.horizon}
                    </div>
                    <h3 className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {rec.title}
                    </h3>
                  </div>
                  <div className="md:col-span-3">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Expected Outcome
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {rec.impact}
                    </p>
                  </div>
                  <div className="md:col-span-4">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Execution Plan
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {rec.actionSteps}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <SourceIntegrityPanel brief={brief} />

          <BriefInterrogator key={brief.id} brief={brief} />
        </div>
      )}

      {activeTab === 'sizing' && (
        <MarketSizingPanel metrics={brief.metrics} segments={brief.sections.segments} />
      )}

      {activeTab === 'competitive' && (
        <div className="space-y-6">
          <CompetitiveMatrixChart
            competitors={brief.sections.competitors}
            axisXLabel={brief.sections.axisXLabel}
            axisYLabel={brief.sections.axisYLabel}
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Competitive Intelligence Matrix
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                    <th className="py-2.5 px-5">Player</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Positioning</th>
                    <th className="py-2.5 px-4">Key Vulnerability / Gap</th>
                    <th className="py-2.5 px-4">Pricing Model</th>
                    <th className="py-2.5 px-5 text-right">Switching Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {brief.sections.competitors.map((comp) => (
                    <tr
                      key={comp.name}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {comp.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {comp.category}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-relaxed min-w-[200px]">
                        {comp.positioning}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-relaxed min-w-[200px]">
                        {comp.keyGap}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {comp.pricingModel}
                      </td>
                      <td className="py-3 px-5 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {comp.switchingCost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <CompetitiveComparisonView
          competitors={brief.sections.competitors}
          axisXLabel={brief.sections.axisXLabel}
          axisYLabel={brief.sections.axisYLabel}
          topic={brief.topic}
        />
      )}

      {activeTab === 'scouting' && (
        <TechScoutingPanel scouting={brief.sections.techScouting} />
      )}
    </div>
  );
}
