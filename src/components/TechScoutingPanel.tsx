import type { TechScoutingInsight } from '../types/research';

interface TechScoutingPanelProps {
  scouting: TechScoutingInsight;
}

const TRL_LABELS = [
  '1. Basic Principles',
  '2. Concept Formulated',
  '3. Proof of Concept',
  '4. Lab Validation',
  '5. Relevant Env Test',
  '6. Prototype Demo',
  '7. Operational Demo',
  '8. Qualified System',
  '9. Proven Production',
];

export function TechScoutingPanel({ scouting }: TechScoutingPanelProps) {
  const trl = Math.min(9, Math.max(1, Math.round(scouting.trlLevel || 6)));

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Technology Readiness Level (TRL)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Commercial viability & engineering maturity assessment
            </p>
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums text-violet-700 dark:text-violet-300">
            TRL {trl} / 9 · {TRL_LABELS[trl - 1]?.replace(/^\d+\.\s*/, '')}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 sm:grid-cols-9 gap-1.5">
          {TRL_LABELS.map((label, idx) => {
            const level = idx + 1;
            const reached = level <= trl;
            const current = level === trl;
            return (
              <div key={label} className="space-y-1.5">
                <div
                  className={`h-2 rounded-sm transition-colors ${
                    current
                      ? 'bg-violet-700'
                      : reached
                      ? 'bg-emerald-600'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
                <div
                  className={`text-[10px] leading-tight ${
                    current
                      ? 'font-semibold text-slate-900 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-5">
          <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-200 dark:border-slate-800">
            Innovation & Capital Velocity
          </h4>

          <div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Patent & R&D Filing Momentum
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {scouting.patentMomentum}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Venture Capital & M&A Flow
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {scouting.vcFundingSignal}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Open Source & Protocol Standards
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {scouting.openSourceActivity}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-5">
          <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-200 dark:border-slate-800">
            Regulatory & Compliance Intelligence
          </h4>

          <div>
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Policy & Regulatory Catalysts
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {scouting.regulatoryCatalyst}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Compliance Risks & Friction
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {scouting.complianceRisk}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
