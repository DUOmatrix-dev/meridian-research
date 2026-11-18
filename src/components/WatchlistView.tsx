import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bell, BellOff, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type { LifecyclePhase, MonitoringCadence, WatchlistSignal } from '../types/research';

interface WatchlistViewProps {
  signals: WatchlistSignal[];
  isWatchlistSynced?: boolean;
  isCloudBacked?: boolean;
  onAddSignal: (signal: {
    topic: string;
    industry: string;
    cadence: MonitoringCadence;
    alertThreshold: string;
  }) => void;
  onRefreshSignal: (signal: WatchlistSignal) => Promise<void>;
  onUpdatePhase: (signal: WatchlistSignal, nextPhase: LifecyclePhase) => void;
  onUpdateCadence: (signalId: string, cadence: MonitoringCadence, alertThreshold: string) => void;
  onRemoveSignal: (signalId: string) => void;
  onOpenLinkedBrief: (briefId: string) => void;
}

interface PhaseTransitionAlert {
  id: string;
  signalId: string;
  topic: string;
  fromPhase: LifecyclePhase;
  toPhase: LifecyclePhase;
  signalStrength: WatchlistSignal['signalStrength'];
  linkedBriefId: string;
  timestamp: string;
}

const ALERTS_PREF_KEY = 'meridian_browser_alerts_enabled';
const ALERTS_FEED_KEY = 'meridian_phase_alerts_v1';
const LIFECYCLE_PHASES: LifecyclePhase[] = ['Emergence', 'Growth', 'Maturity', 'Decline'];

function loadSessionAlerts(): PhaseTransitionAlert[] {
  try {
    const raw = sessionStorage.getItem(ALERTS_FEED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function WatchlistView({
  signals,
  isWatchlistSynced = true,
  isCloudBacked = false,
  onAddSignal,
  onRefreshSignal,
  onUpdatePhase,
  onUpdateCadence,
  onRemoveSignal,
  onOpenLinkedBrief,
}: WatchlistViewProps) {
  const [topic, setTopic] = useState('');
  const [industry, setIndustry] = useState('');
  const [cadence, setCadence] = useState<MonitoringCadence>('Weekly');
  const [threshold, setThreshold] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(ALERTS_PREF_KEY);
      if (saved === 'false') return false;
      if (saved === 'true') return true;
      if (typeof window !== 'undefined' && 'Notification' in window) {
        return Notification.permission === 'granted';
      }
      return false;
    } catch {
      return false;
    }
  });

  const [phaseAlerts, setPhaseAlerts] = useState<PhaseTransitionAlert[]>(loadSessionAlerts);

  // Track previous lifecycle phases per signal ID to detect real-time Firebase / state transitions
  const prevPhasesRef = useRef<Map<string, LifecyclePhase> | null>(null);
  const wasSyncedRef = useRef<boolean>(isWatchlistSynced);

  useEffect(() => {
    try {
      sessionStorage.setItem(ALERTS_FEED_KEY, JSON.stringify(phaseAlerts));
    } catch {
      // Ignore storage errors
    }
  }, [phaseAlerts]);

  useEffect(() => {
    // Wait until initial Firebase snapshot hydration finishes before establishing baseline map
    if (!isWatchlistSynced) {
      wasSyncedRef.current = false;
      return;
    }

    if (prevPhasesRef.current === null || !wasSyncedRef.current) {
      const baseline = new Map<string, LifecyclePhase>();
      for (const sig of signals) {
        baseline.set(sig.id, sig.lifecyclePhase);
      }
      prevPhasesRef.current = baseline;
      wasSyncedRef.current = true;
      return;
    }

    const prevMap = prevPhasesRef.current;
    const detectedTransitions: PhaseTransitionAlert[] = [];

    for (const sig of signals) {
      const prevPhase = prevMap.get(sig.id);
      if (prevPhase && prevPhase !== sig.lifecyclePhase) {
        const alert: PhaseTransitionAlert = {
          id: `alert_${sig.id}_${Date.now()}`,
          signalId: sig.id,
          topic: sig.topic,
          fromPhase: prevPhase,
          toPhase: sig.lifecyclePhase,
          signalStrength: sig.signalStrength,
          linkedBriefId: sig.linkedBriefId,
          timestamp: new Date().toISOString(),
        };
        detectedTransitions.push(alert);

        if (
          alertsEnabled &&
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          try {
            const notification = new Notification(`Lifecycle Phase Shift: ${sig.topic}`, {
              body: `Transitioned from ${prevPhase} to ${sig.lifecyclePhase} (${sig.signalStrength} Signal).`,
              tag: `meridian-phase-${sig.id}-${sig.lifecyclePhase}`,
            });
            notification.onclick = () => {
              window.focus();
              if (sig.linkedBriefId) {
                onOpenLinkedBrief(sig.linkedBriefId);
              }
              notification.close();
            };
          } catch {
            // Browser Notification API may be restricted inside nested sandboxes; in-app feed remains active
          }
        }
      }
      prevMap.set(sig.id, sig.lifecyclePhase);
    }

    // Remove deleted signals from baseline map so re-adding later starts cleanly
    const currentIds = new Set(signals.map((s) => s.id));
    for (const existingId of Array.from(prevMap.keys())) {
      if (!currentIds.has(existingId)) {
        prevMap.delete(existingId);
      }
    }

    if (detectedTransitions.length > 0) {
      setPhaseAlerts((prev) => [...detectedTransitions, ...prev].slice(0, 10));
    }
  }, [signals, isWatchlistSynced, alertsEnabled, onOpenLinkedBrief]);

  const handleToggleBrowserAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionState('unsupported');
      setAlertsEnabled((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(ALERTS_PREF_KEY, String(next));
        } catch {
          // Ignore storage error
        }
        return next;
      });
      return;
    }

    if (alertsEnabled) {
      setAlertsEnabled(false);
      try {
        localStorage.setItem(ALERTS_PREF_KEY, 'false');
      } catch {
        // Ignore storage error
      }
      return;
    }

    let currentPerm = Notification.permission;
    if (currentPerm === 'default') {
      try {
        currentPerm = await Notification.requestPermission();
      } catch {
        currentPerm = Notification.permission;
      }
    }
    setPermissionState(currentPerm);

    setAlertsEnabled(true);
    try {
      localStorage.setItem(ALERTS_PREF_KEY, 'true');
    } catch {
      // Ignore storage error
    }

    if (currentPerm === 'granted') {
      try {
        new Notification('Meridian Watchlist Alerts Active', {
          body: 'Browser notifications will fire whenever a monitored signal changes lifecycle phase.',
          tag: 'meridian-alerts-enabled',
        });
      } catch {
        // Ignore sandbox restriction
      }
    }
  };

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (topic.trim().length < 2) return;
    onAddSignal({
      topic: topic.trim(),
      industry: industry.trim() || 'Technology',
      cadence,
      alertThreshold: threshold.trim() || 'Alert on signal strength or lifecycle shift',
    });
    setTopic('');
    setIndustry('');
    setThreshold('');
  };

  const handleRefresh = async (signal: WatchlistSignal) => {
    setRefreshingId(signal.id);
    setError(null);
    try {
      await onRefreshSignal(signal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh signal.');
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Lifecycle Phase Transition Alerts Feed */}
      {phaseAlerts.length > 0 && (
        <section
          aria-live="polite"
          className="bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-800 rounded-lg p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-800 dark:text-violet-300">
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Real-Time Lifecycle Transition Alerts</span>
            </div>
            <button
              type="button"
              onClick={() => setPhaseAlerts([])}
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Clear All
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {phaseAlerts.map((alert) => (
              <div
                key={alert.id}
                className="py-2 flex items-center justify-between gap-4 text-xs"
              >
                <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {alert.topic}
                  </span>
                  <span className="text-slate-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    Phase changed:{' '}
                    <span className="font-medium">{alert.fromPhase}</span> →{' '}
                    <span className="font-semibold text-violet-700 dark:text-violet-300">
                      {alert.toPhase}
                    </span>
                  </span>
                  <span className="text-slate-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {new Date(alert.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {alert.linkedBriefId && (
                    <>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenLinkedBrief(alert.linkedBriefId)}
                        className="font-medium text-violet-700 dark:text-violet-300 hover:underline"
                      >
                        Open Dossier
                      </button>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss alert"
                  onClick={() => setPhaseAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Continuous Signal Watchlist
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isCloudBacked
                ? 'Synced live with Firebase watchlist state · Alerts trigger automatically on lifecycle phase transitions'
                : 'Monitoring local watchlist state · Sign in with Google to sync real-time Firebase alerts across devices'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleToggleBrowserAlerts()}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              alertsEnabled && permissionState !== 'denied'
                ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {alertsEnabled && permissionState !== 'denied' ? (
              <>
                <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {permissionState === 'granted'
                    ? 'Browser Alerts Active'
                    : 'In-App Alerts Active'}
                </span>
              </>
            ) : (
              <>
                <BellOff className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>
                  {permissionState === 'denied'
                    ? 'Browser Permission Blocked'
                    : 'Enable Browser Alerts'}
                </span>
              </>
            )}
          </button>
        </div>

        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label htmlFor="watch-topic" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Monitored Trend or Keyword
            </label>
            <input
              id="watch-topic"
              type="text"
              required
              minLength={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Sovereign AI Cloud Procurement"
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="watch-industry" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Vertical
            </label>
            <input
              id="watch-industry"
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Cloud & GovTech"
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="watch-cadence" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Cadence
            </label>
            <select
              id="watch-cadence"
              value={cadence}
              onChange={(e) => setCadence(e.target.value as MonitoringCadence)}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="watch-threshold" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Escalation Threshold
            </label>
            <input
              id="watch-threshold"
              type="text"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="Alert on new EU/US mandates"
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md bg-violet-700 hover:bg-violet-800 text-white transition-colors whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Track</span>
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-3 text-xs text-rose-700 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {signals.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No monitored signals in your watchlist yet.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add a market keyword above or pin any active dossier from the Research Studio.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                  <th className="py-2.5 px-5">Signal & Industry</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Assessment & Phase</th>
                  <th className="py-2.5 px-4">Latest Intelligence Delta</th>
                  <th className="py-2.5 px-4">Cadence</th>
                  <th className="py-2.5 px-4">Last Checked</th>
                  <th className="py-2.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {signals.map((sig) => {
                  const isRefreshing = refreshingId === sig.id;
                  const strengthClass =
                    sig.signalStrength === 'Strong'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : sig.signalStrength === 'Moderate'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-400';

                  return (
                    <tr
                      key={sig.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors align-top"
                    >
                      <td className="py-3.5 px-5 min-w-[200px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {sig.linkedBriefId ? (
                            <button
                              type="button"
                              onClick={() => onOpenLinkedBrief(sig.linkedBriefId)}
                              className="text-left hover:text-violet-700 dark:hover:text-violet-300 hover:underline"
                            >
                              {sig.topic}
                            </button>
                          ) : (
                            sig.topic
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {sig.industry} · Threshold: {sig.alertThreshold}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`font-semibold ${strengthClass}`}>
                          {sig.signalStrength} Signal
                        </div>
                        <div className="mt-1">
                          <select
                            aria-label={`Lifecycle phase for ${sig.topic}`}
                            value={sig.lifecyclePhase}
                            onChange={(e) =>
                              onUpdatePhase(sig, e.target.value as LifecyclePhase)
                            }
                            className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                          >
                            {LIFECYCLE_PHASES.map((phase) => (
                              <option key={phase} value={phase}>
                                {phase}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 leading-relaxed min-w-[240px]">
                        {sig.latestDeltaNote}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          aria-label={`Monitoring cadence for ${sig.topic}`}
                          value={sig.cadence}
                          onChange={(e) =>
                            onUpdateCadence(
                              sig.id,
                              e.target.value as MonitoringCadence,
                              sig.alertThreshold,
                            )
                          }
                          className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                        >
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(sig.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isRefreshing}
                            onClick={() => void handleRefresh(sig)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                          >
                            {isRefreshing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            <span>{isRefreshing ? 'Scanning' : 'Refresh'}</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${sig.topic} from watchlist`}
                            onClick={() => onRemoveSignal(sig.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
