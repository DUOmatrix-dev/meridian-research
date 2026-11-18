import { useMemo, useState } from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { ResearchBrief } from '../types/research';

interface SourceIntegrityPanelProps {
  brief: ResearchBrief;
}

type SourceFilter = 'all' | 'citations' | 'registries';

interface IntegrityEntry {
  id: string;
  name: string;
  domain: string;
  uri: string;
  kind: 'citation' | 'registry';
  classification: string;
  verificationRole: string;
}

function classifyDomain(domain: string): { classification: string; verificationRole: string } {
  const lower = domain.toLowerCase();
  if (lower.endsWith('.gov') || lower.endsWith('.edu') || lower.includes('nrel.gov') || lower.includes('energy.gov')) {
    return {
      classification: 'Public & Institutional Research',
      verificationRole: 'Primary government / laboratory benchmark',
    };
  }
  if (
    lower.includes('crunchbase') ||
    lower.includes('pitchbook') ||
    lower.includes('cbinsights') ||
    lower.includes('sec.gov')
  ) {
    return {
      classification: 'Venture & Financial Registry',
      verificationRole: 'Funding rounds, filings & capital flow',
    };
  }
  if (
    lower.includes('statista') ||
    lower.includes('mckinsey') ||
    lower.includes('gartner') ||
    lower.includes('forrester') ||
    lower.includes('idc')
  ) {
    return {
      classification: 'Market Research & Advisory',
      verificationRole: 'TAM/SAM sizing & industry triangulation',
    };
  }
  if (
    lower.includes('docs.') ||
    lower.includes('github') ||
    lower.includes('onnxruntime') ||
    lower.includes('qualcomm') ||
    lower.includes('visa.com') ||
    lower.includes('stripe.com')
  ) {
    return {
      classification: 'Primary Vendor & Technical Spec',
      verificationRole: 'Architecture, API & commercial validation',
    };
  }
  return {
    classification: 'Grounded Web Source',
    verificationRole: 'Live market signal & news corroboration',
  };
}

export function SourceIntegrityPanel({ brief }: SourceIntegrityPanelProps) {
  const [filter, setFilter] = useState<SourceFilter>('all');

  const entries = useMemo<IntegrityEntry[]>(() => {
    const query = encodeURIComponent(brief.topic);

    const citationEntries: IntegrityEntry[] = brief.sources.map((src, idx) => {
      const meta = classifyDomain(src.domain);
      return {
        id: `cit_${idx}_${src.uri}`,
        name: src.title || src.domain,
        domain: src.domain,
        uri: src.uri,
        kind: 'citation',
        classification: meta.classification,
        verificationRole: meta.verificationRole,
      };
    });

    const registryTemplates: Array<{
      name: string;
      domain: string;
      uri: string;
      classification: string;
      verificationRole: string;
    }> = [
      {
        name: 'Statista Market & Consumer Data',
        domain: 'statista.com',
        uri: `https://www.statista.com/search/?q=${query}`,
        classification: 'Market Sizing Registry',
        verificationRole: 'Cross-check TAM, CAGR & segment forecasts',
      },
      {
        name: 'Crunchbase Venture Intelligence',
        domain: 'crunchbase.com',
        uri: `https://www.crunchbase.com/textsearch?q=${query}`,
        classification: 'Venture & Startup Database',
        verificationRole: 'Verify emerging entrants & Series A–C rounds',
      },
      {
        name: 'Google Trends Search Momentum',
        domain: 'trends.google.com',
        uri: `https://trends.google.com/trends/explore?q=${query}`,
        classification: 'Search Demand Analytics',
        verificationRole: 'Inspect 12-month interest velocity & geography',
      },
      {
        name: 'CB Insights Emerging Tech Research',
        domain: 'cbinsights.com',
        uri: `https://www.cbinsights.com/research/?s=${query}`,
        classification: 'Technology Scouting Index',
        verificationRole: 'Validate market maps & institutional theses',
      },
      {
        name: 'PitchBook Capital & M&A Profiles',
        domain: 'pitchbook.com',
        uri: `https://pitchbook.com/search?q=${query}`,
        classification: 'Private Market Intelligence',
        verificationRole: 'Audit valuation multiples & acquirer activity',
      },
      {
        name: 'USPTO Patent Public Search',
        domain: 'ppubs.uspto.gov',
        uri: `https://ppubs.uspto.gov/pubwebapp/static/pages/ppubsbasic.html`,
        classification: 'IP & Patent Registry',
        verificationRole: 'Confirm R&D filing velocity & IP moats',
      },
    ];

    const existingDomains = new Set(citationEntries.map((c) => c.domain.toLowerCase()));
    const registryEntries: IntegrityEntry[] = registryTemplates
      .filter((r) => !existingDomains.has(r.domain))
      .map((r) => ({
        id: `reg_${r.domain}`,
        ...r,
        kind: 'registry',
      }));

    return [...citationEntries, ...registryEntries];
  }, [brief.sources, brief.topic]);

  const visibleEntries = useMemo(() => {
    if (filter === 'citations') return entries.filter((e) => e.kind === 'citation');
    if (filter === 'registries') return entries.filter((e) => e.kind === 'registry');
    return entries;
  }, [entries, filter]);

  const citationCount = entries.filter((e) => e.kind === 'citation').length;
  const registryCount = entries.filter((e) => e.kind === 'registry').length;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Source Integrity & Credibility Links
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {citationCount} brief citations · {registryCount} primary market data registries scoped to this topic
          </p>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'all', label: `All (${entries.length})` },
              { id: 'citations', label: `Brief Citations (${citationCount})` },
              { id: 'registries', label: `Market Registries (${registryCount})` },
            ] as Array<{ id: SourceFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          No direct web citations recorded for this brief yet. Run a live grounded synthesis or inspect primary registries.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
          {visibleEntries.map((entry) => (
            <a
              key={entry.id}
              href={entry.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="group py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 -mx-2 px-2 rounded-md transition-colors"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-300">
                  <span className="truncate">{entry.name}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-violet-700 dark:group-hover:text-violet-300" aria-hidden="true" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                  <span>{entry.classification}</span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.verificationRole}</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>{entry.kind === 'citation' ? 'Cited' : 'Verify'}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-700 dark:text-slate-300">{entry.domain}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
