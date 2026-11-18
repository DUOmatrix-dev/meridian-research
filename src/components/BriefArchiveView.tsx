import { useState } from 'react';
import { Archive, ArchiveRestore, Download, Search, Trash2 } from 'lucide-react';
import { buildMarkdownReport, downloadFile, slugifyTopic } from '../lib/exportBrief';
import type { LifecyclePhase, ResearchBrief } from '../types/research';

interface BriefArchiveViewProps {
  briefs: ResearchBrief[];
  onOpenBrief: (briefId: string) => void;
  onToggleArchive: (briefId: string, archived: boolean) => void;
  onDeleteBrief: (briefId: string) => void;
  onOpenNewResearch: () => void;
}

type FilterOption = 'All' | LifecyclePhase | 'Archived';

const FILTERS: FilterOption[] = ['All', 'Emergence', 'Growth', 'Maturity', 'Archived'];

export function BriefArchiveView({
  briefs,
  onOpenBrief,
  onToggleArchive,
  onDeleteBrief,
  onOpenNewResearch,
}: BriefArchiveViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('All');

  const filtered = briefs.filter((b) => {
    if (filter === 'Archived' && !b.isArchived) return false;
    if (filter !== 'Archived' && filter !== 'All') {
      if (b.isArchived || b.lifecyclePhase !== filter) return false;
    }
    if (filter === 'All' && b.isArchived) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.topic.toLowerCase().includes(q) ||
        b.industry.toLowerCase().includes(q) ||
        b.executiveSummary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Research Brief Archive
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Browse, filter, and export completed market intelligence dossiers
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by topic or industry..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto">
          {FILTERS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilter(opt)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === opt
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No matching research dossiers found.
            </p>
            <button
              type="button"
              onClick={onOpenNewResearch}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-violet-700 hover:bg-violet-800 text-white"
            >
              Launch New Research Run
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-2.5 px-5">Dossier Topic</th>
                  <th className="py-2.5 px-4">Industry</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Phase & Signal</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">TAM / CAGR</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Updated</th>
                  <th className="py-2.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <button
                        type="button"
                        onClick={() => onOpenBrief(b.id)}
                        className="text-left font-semibold text-slate-900 dark:text-slate-100 hover:text-violet-700 dark:hover:text-violet-300 hover:underline"
                      >
                        {b.topic}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {b.industry}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {b.lifecyclePhase} · {b.signalStrength}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      ${b.metrics.tamUsdBillions.toFixed(1)}B · +{b.metrics.cagrPct.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(b.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Export Markdown"
                          onClick={() =>
                            downloadFile(
                              buildMarkdownReport(b),
                              `${slugifyTopic(b.topic) || 'brief'}.md`,
                              'text/markdown',
                            )
                          }
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title={b.isArchived ? 'Restore brief' : 'Archive brief'}
                          onClick={() => onToggleArchive(b.id, !b.isArchived)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {b.isArchived ? (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          ) : (
                            <Archive className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Delete brief"
                          onClick={() => onDeleteBrief(b.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
