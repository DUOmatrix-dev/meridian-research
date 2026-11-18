import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { BriefArchiveView } from './components/BriefArchiveView';
import { DossierWorkspace } from './components/DossierWorkspace';
import { MethodologyView } from './components/MethodologyView';
import { ResearchLauncherModal } from './components/ResearchLauncherModal';
import { SidebarNav } from './components/SidebarNav';
import { TopHeader } from './components/TopHeader';
import { WatchlistView } from './components/WatchlistView';
import { SEED_BRIEFS, SEED_WATCHLIST } from './data/seedBriefs';
import {
  deleteBriefFromFirestore,
  deleteWatchlistSignalFromFirestore,
  sanitizeId,
  saveBriefToFirestore,
  saveWatchlistSignalToFirestore,
  signInWithGoogle,
  signOutUser,
  subscribeAuth,
  subscribeUserBriefs,
  subscribeUserWatchlist,
  toggleBriefArchiveInFirestore,
  updateBriefHistoryInFirestore,
  updateWatchlistDeltaInFirestore,
  updateWatchlistSettingsInFirestore,
} from './lib/firebase';
import type {
  LifecycleHistoryEntry,
  LifecyclePhase,
  MonitoringCadence,
  ResearchBrief,
  WatchlistSignal,
  WorkspaceView,
} from './types/research';

const LOCAL_BRIEFS_KEY = 'meridian_research_briefs_v1';
const LOCAL_WATCHLIST_KEY = 'meridian_research_watchlist_v1';
const THEME_KEY = 'meridian_theme';

function loadLocalBriefs(): ResearchBrief[] {
  try {
    const raw = localStorage.getItem(LOCAL_BRIEFS_KEY);
    if (!raw) return SEED_BRIEFS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_BRIEFS;
    return parsed.map((item: ResearchBrief) => {
      if (Array.isArray(item.history) && item.history.length > 0) return item;
      const seedMatch = SEED_BRIEFS.find((s) => s.id === item.id);
      return seedMatch?.history ? { ...item, history: seedMatch.history } : item;
    });
  } catch {
    return SEED_BRIEFS;
  }
}

function loadLocalWatchlist(): WatchlistSignal[] {
  try {
    const raw = localStorage.getItem(LOCAL_WATCHLIST_KEY);
    if (!raw) return SEED_WATCHLIST;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_WATCHLIST;
  } catch {
    return SEED_WATCHLIST;
  }
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [localBriefs, setLocalBriefs] = useState<ResearchBrief[]>(loadLocalBriefs);
  const [localWatchlist, setLocalWatchlist] = useState<WatchlistSignal[]>(loadLocalWatchlist);
  const [cloudBriefs, setCloudBriefs] = useState<ResearchBrief[] | null>(null);
  const [cloudWatchlist, setCloudWatchlist] = useState<WatchlistSignal[] | null>(null);

  const [activeView, setActiveView] = useState<WorkspaceView>('studio');
  const [activeBriefId, setActiveBriefId] = useState<string>(
    () => loadLocalBriefs()[0]?.id ?? SEED_BRIEFS[0].id,
  );
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage failures
    }
  }, [isDark]);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(LOCAL_BRIEFS_KEY, JSON.stringify(localBriefs));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [localBriefs, user]);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(localWatchlist));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [localWatchlist, user]);

  useEffect(() => {
    const unsub = subscribeAuth((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) {
        setCloudBriefs(null);
        setCloudWatchlist(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubBriefs = subscribeUserBriefs(
      user.uid,
      (items) => {
        setCloudBriefs(items);
        if (items.length > 0 && !items.some((b) => b.id === activeBriefId)) {
          setActiveBriefId(items[0].id);
        }
      },
      (err) => setBannerError(err.message),
    );

    const unsubWatchlist = subscribeUserWatchlist(
      user.uid,
      (items) => setCloudWatchlist(items),
      (err) => setBannerError(err.message),
    );

    return () => {
      unsubBriefs();
      unsubWatchlist();
    };
  }, [user, activeBriefId]);

  // Combine cloud data with seed examples if a new user has zero saved briefs yet
  const briefs: ResearchBrief[] = user
    ? cloudBriefs && cloudBriefs.length > 0
      ? cloudBriefs
      : SEED_BRIEFS
    : localBriefs;

  const watchlist: WatchlistSignal[] = user
    ? cloudWatchlist && cloudWatchlist.length > 0
      ? cloudWatchlist
      : SEED_WATCHLIST
    : localWatchlist;

  const activeBrief =
    briefs.find((b) => b.id === activeBriefId) ??
    briefs.find((b) => !b.isArchived) ??
    briefs[0];

  const handleSignIn = async () => {
    setBannerError(null);
    try {
      const signedInUser = await signInWithGoogle();
      // Persist any custom non-seeded local briefs to Firestore on sign-in
      const customLocal = localBriefs.filter((b) => !b.isSeeded);
      for (const item of customLocal) {
        await saveBriefToFirestore(signedInUser.uid, { ...item, ownerId: signedInUser.uid });
      }
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  };

  const handleSignOut = async () => {
    setBannerError(null);
    try {
      await signOutUser();
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Sign-out failed.');
    }
  };

  const handleResearchComplete = async (newBrief: ResearchBrief) => {
    setBannerError(null);
    const enriched: ResearchBrief = {
      ...newBrief,
      id: sanitizeId(newBrief.id, 'brief'),
      ownerId: user?.uid ?? 'local',
      isSeeded: false,
    };

    if (user) {
      try {
        await saveBriefToFirestore(user.uid, enriched);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to save brief to cloud.');
      }
    } else {
      setLocalBriefs((prev) => [enriched, ...prev]);
    }

    setActiveBriefId(enriched.id);
    setActiveView('studio');
  };

  const handlePinToWatchlist = async (brief: ResearchBrief) => {
    setBannerError(null);
    const existing = watchlist.find(
      (s) => s.linkedBriefId === brief.id || s.topic.toLowerCase() === brief.topic.toLowerCase(),
    );
    if (existing) return;

    const now = new Date().toISOString();
    const signal: WatchlistSignal = {
      id: sanitizeId(`watch_${brief.id}`, 'watch'),
      ownerId: user?.uid ?? 'local',
      topic: brief.topic,
      industry: brief.industry,
      signalStrength: brief.signalStrength,
      lifecyclePhase: brief.lifecyclePhase,
      cadence: 'Weekly',
      alertThreshold: `Alert on ${brief.lifecyclePhase} transition or >10% CAGR shift`,
      latestDeltaNote: `Baseline captured (${brief.signalStrength} signal, ${brief.leadTimeMonths} lead time).`,
      linkedBriefId: brief.id,
      createdAt: now,
      updatedAt: now,
    };

    if (user) {
      try {
        if (brief.isSeeded) {
          await saveBriefToFirestore(user.uid, { ...brief, ownerId: user.uid, isSeeded: false });
        }
        await saveWatchlistSignalToFirestore(user.uid, signal);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to save watchlist signal.');
      }
    } else {
      setLocalWatchlist((prev) => [signal, ...prev]);
    }
  };

  const handleAddSignal = async (input: {
    topic: string;
    industry: string;
    cadence: MonitoringCadence;
    alertThreshold: string;
  }) => {
    setBannerError(null);
    const now = new Date().toISOString();
    const signal: WatchlistSignal = {
      id: sanitizeId(`sig_${Date.now()}`, 'sig'),
      ownerId: user?.uid ?? 'local',
      topic: input.topic,
      industry: input.industry,
      signalStrength: 'Moderate',
      lifecyclePhase: 'Emergence',
      cadence: input.cadence,
      alertThreshold: input.alertThreshold,
      latestDeltaNote: 'Signal added to monitoring queue. Click Refresh to run live web scan.',
      linkedBriefId: '',
      createdAt: now,
      updatedAt: now,
    };

    if (user) {
      try {
        await saveWatchlistSignalToFirestore(user.uid, signal);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to create watchlist signal.');
      }
    } else {
      setLocalWatchlist((prev) => [signal, ...prev]);
    }
  };

  const handleRefreshSignal = async (signal: WatchlistSignal) => {
    const res = await fetch('/api/research/refresh-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: signal.topic,
        industry: signal.industry,
        previousPhase: signal.lifecyclePhase,
        previousStrength: signal.signalStrength,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to refresh signal.');
    }

    if (user) {
      const isCloudRecord = cloudWatchlist?.some((w) => w.id === signal.id);
      if (isCloudRecord) {
        await updateWatchlistDeltaInFirestore(user.uid, signal.id, {
          signalStrength: data.signalStrength,
          lifecyclePhase: data.lifecyclePhase,
          latestDeltaNote: data.latestDeltaNote,
          linkedBriefId: signal.linkedBriefId,
        });
      } else {
        await saveWatchlistSignalToFirestore(user.uid, {
          ...signal,
          ownerId: user.uid,
          signalStrength: data.signalStrength,
          lifecyclePhase: data.lifecyclePhase,
          latestDeltaNote: data.latestDeltaNote,
        });
      }
    } else {
      setLocalWatchlist((prev) =>
        prev.map((item) =>
          item.id === signal.id
            ? {
                ...item,
                signalStrength: data.signalStrength,
                lifecyclePhase: data.lifecyclePhase,
                latestDeltaNote: data.latestDeltaNote,
                updatedAt: data.updatedAt || new Date().toISOString(),
              }
            : item,
        ),
      );
    }

    // Append new lifecycle checkpoint to any linked ResearchBrief's history
    if (signal.linkedBriefId) {
      const linkedBrief = briefs.find((b) => b.id === signal.linkedBriefId);
      if (linkedBrief) {
        const checkpoint: LifecycleHistoryEntry = {
          timestamp: data.updatedAt || new Date().toISOString(),
          lifecyclePhase: data.lifecyclePhase,
          signalStrength: data.signalStrength,
          adoptionPct: linkedBrief.metrics.currentAdoptionPct,
          confidencePct: linkedBrief.confidencePct,
          note: String(data.latestDeltaNote || 'Watchlist signal refreshed.').slice(0, 580),
        };
        const nextHistory = [...(linkedBrief.history ?? []), checkpoint].slice(-24);

        if (user && cloudBriefs?.some((b) => b.id === linkedBrief.id)) {
          await updateBriefHistoryInFirestore(user.uid, linkedBrief, {
            signalStrength: data.signalStrength,
            lifecyclePhase: data.lifecyclePhase,
            history: nextHistory,
          });
        } else if (!user) {
          setLocalBriefs((prev) =>
            prev.map((b) =>
              b.id === linkedBrief.id
                ? {
                    ...b,
                    signalStrength: data.signalStrength,
                    lifecyclePhase: data.lifecyclePhase,
                    history: nextHistory,
                    updatedAt: checkpoint.timestamp,
                  }
                : b,
            ),
          );
        }
      }
    }
  };

  const handleUpdateSignalPhase = async (
    signal: WatchlistSignal,
    nextPhase: LifecyclePhase,
  ) => {
    if (signal.lifecyclePhase === nextPhase) return;
    setBannerError(null);
    const now = new Date().toISOString();
    const deltaNote = `Lifecycle phase transitioned from ${signal.lifecyclePhase} to ${nextPhase}.`;

    if (user) {
      try {
        const isCloudRecord = cloudWatchlist?.some((w) => w.id === signal.id);
        if (isCloudRecord) {
          await updateWatchlistDeltaInFirestore(user.uid, signal.id, {
            signalStrength: signal.signalStrength,
            lifecyclePhase: nextPhase,
            latestDeltaNote: deltaNote,
            linkedBriefId: signal.linkedBriefId,
          });
        } else {
          await saveWatchlistSignalToFirestore(user.uid, {
            ...signal,
            ownerId: user.uid,
            lifecyclePhase: nextPhase,
            latestDeltaNote: deltaNote,
          });
        }
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to update lifecycle phase.');
        return;
      }
    } else {
      setLocalWatchlist((prev) =>
        prev.map((item) =>
          item.id === signal.id
            ? {
                ...item,
                lifecyclePhase: nextPhase,
                latestDeltaNote: deltaNote,
                updatedAt: now,
              }
            : item,
        ),
      );
    }

    if (signal.linkedBriefId) {
      const linkedBrief = briefs.find((b) => b.id === signal.linkedBriefId);
      if (linkedBrief) {
        const checkpoint: LifecycleHistoryEntry = {
          timestamp: now,
          lifecyclePhase: nextPhase,
          signalStrength: signal.signalStrength,
          adoptionPct: linkedBrief.metrics.currentAdoptionPct,
          confidencePct: linkedBrief.confidencePct,
          note: deltaNote,
        };
        const nextHistory = [...(linkedBrief.history ?? []), checkpoint].slice(-24);

        if (user && cloudBriefs?.some((b) => b.id === linkedBrief.id)) {
          await updateBriefHistoryInFirestore(user.uid, linkedBrief, {
            signalStrength: signal.signalStrength,
            lifecyclePhase: nextPhase,
            history: nextHistory,
          });
        } else if (!user) {
          setLocalBriefs((prev) =>
            prev.map((b) =>
              b.id === linkedBrief.id
                ? {
                    ...b,
                    lifecyclePhase: nextPhase,
                    history: nextHistory,
                    updatedAt: now,
                  }
                : b,
            ),
          );
        }
      }
    }
  };

  const handleUpdateCadence = async (
    signalId: string,
    cadence: MonitoringCadence,
    alertThreshold: string,
  ) => {
    if (user && cloudWatchlist?.some((w) => w.id === signalId)) {
      try {
        await updateWatchlistSettingsInFirestore(user.uid, signalId, cadence, alertThreshold);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to update cadence.');
      }
    } else {
      setLocalWatchlist((prev) =>
        prev.map((item) => (item.id === signalId ? { ...item, cadence } : item)),
      );
    }
  };

  const handleRemoveSignal = async (signalId: string) => {
    if (user && cloudWatchlist?.some((w) => w.id === signalId)) {
      try {
        await deleteWatchlistSignalFromFirestore(user.uid, signalId);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to delete signal.');
      }
    } else {
      setLocalWatchlist((prev) => prev.filter((item) => item.id !== signalId));
    }
  };

  const handleToggleArchive = async (briefId: string, archived: boolean) => {
    if (user && cloudBriefs?.some((b) => b.id === briefId)) {
      try {
        await toggleBriefArchiveInFirestore(user.uid, briefId, archived);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to update archive status.');
      }
    } else {
      setLocalBriefs((prev) =>
        prev.map((b) =>
          b.id === briefId ? { ...b, isArchived: archived, updatedAt: new Date().toISOString() } : b,
        ),
      );
    }
  };

  const handleDeleteBrief = async (briefId: string) => {
    if (user && cloudBriefs?.some((b) => b.id === briefId)) {
      try {
        await deleteBriefFromFirestore(user.uid, briefId);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to delete brief.');
      }
    } else {
      setLocalBriefs((prev) => prev.filter((b) => b.id !== briefId));
    }
  };

  const isCurrentBriefWatched = Boolean(
    activeBrief &&
      watchlist.some(
        (w) =>
          w.linkedBriefId === activeBrief.id ||
          w.topic.toLowerCase() === activeBrief.topic.toLowerCase(),
      ),
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <SidebarNav
        activeView={activeView}
        onSelectView={setActiveView}
        briefs={briefs}
        activeBriefId={activeBrief?.id ?? ''}
        onSelectBrief={(id) => {
          setActiveBriefId(id);
          setActiveView('studio');
        }}
        watchlistCount={watchlist.length}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopHeader
          activeView={activeView}
          activeTopic={activeBrief?.topic}
          isDark={isDark}
          onToggleTheme={() => setIsDark((d) => !d)}
          user={user}
          authLoading={authLoading}
          onSignIn={() => void handleSignIn()}
          onSignOut={() => void handleSignOut()}
          onOpenNewResearch={() => setLauncherOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {bannerError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-4 px-4 py-3 rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-200"
            >
              <span className="truncate">{bannerError}</span>
              <button
                type="button"
                onClick={() => setBannerError(null)}
                className="font-semibold underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeView === 'studio' && activeBrief && (
            <DossierWorkspace
              brief={activeBrief}
              isWatched={isCurrentBriefWatched}
              onPinToWatchlist={(b) => void handlePinToWatchlist(b)}
            />
          )}

          {activeView === 'studio' && !activeBrief && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center space-y-3">
              <h2 className="font-display text-lg font-semibold">No Active Research Dossier</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Launch a live trend research run to synthesize market sizing, competitors, and citations.
              </p>
              <button
                type="button"
                onClick={() => setLauncherOpen(true)}
                className="px-4 py-2 text-xs font-semibold rounded-md bg-violet-700 hover:bg-violet-800 text-white"
              >
                New Research Run
              </button>
            </div>
          )}

          {activeView === 'watchlist' && (
            <WatchlistView
              signals={watchlist}
              isWatchlistSynced={!user || cloudWatchlist !== null}
              isCloudBacked={Boolean(user)}
              onAddSignal={(s) => void handleAddSignal(s)}
              onRefreshSignal={handleRefreshSignal}
              onUpdatePhase={(sig, phase) => void handleUpdateSignalPhase(sig, phase)}
              onUpdateCadence={(id, cad, thresh) => void handleUpdateCadence(id, cad, thresh)}
              onRemoveSignal={(id) => void handleRemoveSignal(id)}
              onOpenLinkedBrief={(briefId) => {
                if (briefs.some((b) => b.id === briefId)) {
                  setActiveBriefId(briefId);
                  setActiveView('studio');
                }
              }}
            />
          )}

          {activeView === 'archive' && (
            <BriefArchiveView
              briefs={briefs}
              onOpenBrief={(id) => {
                setActiveBriefId(id);
                setActiveView('studio');
              }}
              onToggleArchive={(id, arch) => void handleToggleArchive(id, arch)}
              onDeleteBrief={(id) => void handleDeleteBrief(id)}
              onOpenNewResearch={() => setLauncherOpen(true)}
            />
          )}

          {activeView === 'methodology' && (
            <MethodologyView onOpenNewResearch={() => setLauncherOpen(true)} />
          )}
        </main>
      </div>

      <ResearchLauncherModal
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        onComplete={(b) => void handleResearchComplete(b)}
      />
    </div>
  );
}
