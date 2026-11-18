import { useState, type FormEvent } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { BriefType, ResearchBrief } from '../types/research';

interface ResearchLauncherModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (brief: ResearchBrief) => void;
}

const STARTER_PROMPTS = [
  {
    topic: 'GLP-1 Metabolic Consumer Food & Retail Ecosystem',
    industry: 'Consumer Health & CPG',
    briefType: 'opportunity-assessment' as BriefType,
    focus: 'Focus on portion-sized CPG reformulation, functional nutrition brands, and retail pharmacy loyalty shifts.',
  },
  {
    topic: 'AI-Native Security Operations & Autonomous SOC Triage',
    industry: 'Enterprise Cybersecurity',
    briefType: 'market-map' as BriefType,
    focus: 'Compare Series A–B challengers against CrowdStrike, Palo Alto Networks, and Microsoft Security Copilot.',
  },
  {
    topic: 'Direct-to-Cell Satellite Connectivity for Enterprise IoT',
    industry: 'Telecom & Space Infrastructure',
    briefType: 'tech-scouting' as BriefType,
    focus: 'Evaluate 3GPP Release 18 NTN adoption, carrier partnerships, and logistics/maritime ARPU.',
  },
];

export function ResearchLauncherModal({
  open,
  onClose,
  onComplete,
}: ResearchLauncherModalProps) {
  const [topic, setTopic] = useState('');
  const [industry, setIndustry] = useState('');
  const [briefType, setBriefType] = useState<BriefType>('trend-brief');
  const [urlsText, setUrlsText] = useState('');
  const [focusNotes, setFocusNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (topic.trim().length < 2 || loading) return;

    setLoading(true);
    setError(null);

    const urls = urlsText
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, 5);

    try {
      const res = await fetch('/api/research/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          industry: industry.trim() || 'Technology & Product Strategy',
          briefType,
          urls,
          focusNotes: focusNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Research run failed.');
      }

      onComplete(data.brief as ResearchBrief);
      setTopic('');
      setIndustry('');
      setUrlsText('');
      setFocusNotes('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete research run.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="launcher-title"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2
              id="launcher-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              Launch Live Trend Research Run
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grounds market sizing, competitive positioning, and citations using live Google Search and URL context
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Quick-Fill Research Prompts
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STARTER_PROMPTS.map((preset) => (
                <button
                  key={preset.topic}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setTopic(preset.topic);
                    setIndustry(preset.industry);
                    setBriefType(preset.briefType);
                    setFocusNotes(preset.focus);
                  }}
                  className="text-left p-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:border-violet-600 dark:hover:border-violet-400 transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                    {preset.topic}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {preset.industry}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="research-topic"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Market Trend or Product Domain
              </label>
              <input
                id="research-topic"
                type="text"
                required
                minLength={2}
                maxLength={220}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Autonomous Voice AI Agents in Healthcare Scheduling"
                className="w-full px-3.5 py-2.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>

            <div>
              <label
                htmlFor="research-industry"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Industry Vertical
              </label>
              <input
                id="research-industry"
                type="text"
                maxLength={100}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Digital Health & Clinical SaaS"
                className="w-full px-3.5 py-2.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>

            <div>
              <label
                htmlFor="research-format"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Intelligence Deliverable Format
              </label>
              <select
                id="research-format"
                value={briefType}
                onChange={(e) => setBriefType(e.target.value as BriefType)}
                className="w-full px-3.5 py-2.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
              >
                <option value="trend-brief">Executive Trend Brief</option>
                <option value="market-map">Competitive Market Map</option>
                <option value="opportunity-assessment">Opportunity & Sizing Assessment</option>
                <option value="tech-scouting">Technology & Regulatory Scouting</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="research-urls"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Reference URLs to Inspect (Optional, up to 5)
            </label>
            <textarea
              id="research-urls"
              rows={2}
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              placeholder="https://example.com/product-release, https://example.com/market-report"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <div>
            <label
              htmlFor="research-focus"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Strategic Focus & Analyst Instructions (Optional)
            </label>
            <textarea
              id="research-focus"
              rows={2}
              maxLength={600}
              value={focusNotes}
              onChange={(e) => setFocusNotes(e.target.value)}
              placeholder="Specify target geography, buyer persona, pricing sensitivity, or specific competitors to benchmark."
              className="w-full px-3.5 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || topic.trim().length < 2}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-md bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white transition-colors whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Synthesizing Web Signals...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Run Intelligence Synthesis</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
