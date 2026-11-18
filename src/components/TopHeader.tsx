import type { User } from 'firebase/auth';
import { LogIn, LogOut, Menu, Moon, Plus, Sun } from 'lucide-react';
import type { WorkspaceView } from '../types/research';

interface TopHeaderProps {
  activeView: WorkspaceView;
  activeTopic?: string;
  isDark: boolean;
  onToggleTheme: () => void;
  user: User | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenNewResearch: () => void;
  onOpenMobileNav: () => void;
}

const VIEW_LABELS: Record<WorkspaceView, string> = {
  studio: 'Research Studio',
  watchlist: 'Signal Watchlist',
  archive: 'Brief Archive',
  methodology: 'Research Framework',
};

export function TopHeader({
  activeView,
  activeTopic,
  isDark,
  onToggleTheme,
  user,
  authLoading,
  onSignIn,
  onSignOut,
  onOpenNewResearch,
  onOpenMobileNav,
}: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sm:gap-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open workspace navigation"
          className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-400 dark:text-slate-500 hidden sm:inline whitespace-nowrap shrink-0">
            Workspace
          </span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
            {VIEW_LABELS[activeView]}
          </span>
          {activeView === 'studio' && activeTopic && (
            <>
              <span className="text-slate-300 dark:text-slate-700 hidden md:inline" aria-hidden="true">
                /
              </span>
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[260px] lg:max-w-[380px] hidden md:inline">
                {activeTopic}
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {!authLoading && (
          user ? (
            <button
              type="button"
              onClick={onSignOut}
              title={`Signed in as ${user.email ?? 'Analyst'}. Click to sign out.`}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <span className="truncate max-w-[120px]">{user.displayName || user.email}</span>
              <LogOut className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <span>Sync Library</span>
            </button>
          )
        )}

        <button
          type="button"
          onClick={onOpenNewResearch}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-violet-700 hover:bg-violet-800 text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Research Run</span>
        </button>
      </div>
    </header>
  );
}
