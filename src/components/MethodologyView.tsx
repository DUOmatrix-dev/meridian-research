interface MethodologyViewProps {
  onOpenNewResearch: () => void;
}

const PROCESS_STEPS = [
  {
    step: '01. Signal Collection',
    detail: 'Live multi-source web search and direct URL context extraction across industry press, technical documentation, and regulatory filings.',
  },
  {
    step: '02. Pattern Recognition',
    detail: 'Distinguish structural inflection catalysts from short-lived media hype using adoption-stage triangulation.',
  },
  {
    step: '03. Context & Barrier Mapping',
    detail: 'Identify technical, financial, switching-cost, and regulatory blockers that govern real enterprise velocity.',
  },
  {
    step: '04. Market Quantification',
    detail: 'Top-down and bottom-up TAM / SAM / SOM sizing paired with explicit confidence intervals and CAGR horizons.',
  },
  {
    step: '05. Competitive Positioning',
    detail: 'Map direct incumbents, indirect substitutes, and emerging challengers to uncover defensible product wedges.',
  },
  {
    step: '06. Diffusion Forecasting',
    detail: 'Project 6-month adoption curve progression and estimate lead time prior to early-majority tipping points.',
  },
  {
    step: '07. Strategic Actionability',
    detail: 'Translate market signals into time-boxed 90-day, 6-month, and 12-month product and go-to-market bets.',
  },
];

export function MethodologyView({ onOpenNewResearch }: MethodologyViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Product Trend Researcher Methodology
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Analytical standards governing weak-signal validation, competitive mapping, technology scouting, and opportunity sizing across every Meridian dossier.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNewResearch}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-violet-700 hover:bg-violet-800 text-white whitespace-nowrap shrink-0"
        >
          Start New Research Run
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 pb-4 border-b border-slate-200 dark:border-slate-800">
          Seven-Stage Trend Identification Workflow
        </h2>
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
          {PROCESS_STEPS.map((item) => (
            <div key={item.step} className="py-3.5 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.step}
              </div>
              <div className="md:col-span-8 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
            Quantitative Rigor
          </h3>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Combines search momentum, capital deployment patterns, patent velocity, and unit-level ACV modeling with explicit confidence intervals rather than ungrounded point guesses.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
            Competitive Triangulation
          </h3>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Evaluates direct category leaders alongside indirect workarounds, DIY spreadsheets, and emerging seed-stage disruptors to isolate true switching-cost friction.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
            Source Verification
          </h3>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Every live synthesis anchors claims in verifiable web grounding citations and user-supplied primary documents via URL Context, surfaced inline for executive auditability.
          </p>
        </div>
      </div>
    </div>
  );
}
