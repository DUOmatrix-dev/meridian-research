import {
  Activity,
  Archive,
  BookOpen,
  Compass,
  Telescope,
  X,
} from 'lucide-react';
import type { ResearchBrief, WorkspaceView } from '../types/research';

interface SidebarNavProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  briefs: ResearchBrief[];
  activeBriefId: string;
  onSelectBrief: (briefId: string) => void;
  watchlistCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: WorkspaceView;
  label: string;
  icon: typeof Compass;
}> = [
  { id: 'studio', label: 'Research Studio', icon: Compass },
  { id: 'watchlist', label: 'Signal Watchlist', icon: Activity },
  { id: 'archive', label: 'Brief Archive', icon: Archive },
  { id: 'methodology', label: 'Research Framework', icon: BookOpen },
];

export function SidebarNav({
  activeView,
  onSelectView,
  briefs,
  activeBriefId,
  onSelectBrief,
  watchlistCount,
  mobileOpen,
  onCloseMobile,
}: SidebarNavProps) {
  const recentBriefs = briefs.filter((b) => !b.isArchived).slice(0, 6);

  const navContent = (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            onSelectView('studio');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-700 text-white shrink-0">
            <Telescope className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            Meridian Research
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-md"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="px-3 py-4 space-y-1" aria-label="Workspace navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 ${
                isActive
                  ? 'bg-violet-50 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? 'text-violet-700 dark:text-violet-300'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'watchlist' && (
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {watchlistCount}
                </span>
              )}
              {item.id === 'archive' && (
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {briefs.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 pt-3 pb-2 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Active Dossiers
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {recentBriefs.map((brief) => {
          const isCurrent = activeView === 'studio' && brief.id === activeBriefId;
          return (
            <button
              key={brief.id}
              type="button"
              onClick={() => {
                onSelectBrief(brief.id);
                onSelectView('studio');
                onCloseMobile();
              }}
              className={`w-full text-left px-3 py-2.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 ${
                isCurrent
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-medium leading-snug line-clamp-2 text-slate-900 dark:text-slate-100">
                {brief.topic}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <span>{brief.lifecyclePhase}</span>
                <span aria-hidden="true">·</span>
                <span>{brief.signalStrength}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[260px] shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-[272px] max-w-[85vw] h-full z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
