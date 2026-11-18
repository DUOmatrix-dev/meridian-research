import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Loader2, Send } from 'lucide-react';
import type { BriefChatMessage, ResearchBrief } from '../types/research';

interface BriefInterrogatorProps {
  brief: ResearchBrief;
}

const PRESET_QUESTIONS = [
  'What are the top 3 monetization wedge risks over the next 12 months?',
  'Which incumbent competitor is most vulnerable to unbundling?',
  'Outline a 90-day customer discovery & validation sprint.',
];

export function BriefInterrogator({ brief }: BriefInterrogatorProps) {
  const [messages, setMessages] = useState<BriefChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    const userMsg: BriefChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/research/interrogate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: brief.topic,
          industry: brief.industry,
          executiveSummary: brief.executiveSummary,
          question: trimmed,
          history: nextHistory,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to query analyst.');
      }

      const assistantMsg: BriefChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: data.answer,
        sources: data.sources || [],
        timestamp: data.timestamp || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach research service.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void askQuestion(input);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Interrogate Dossier
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Run live web-grounded follow-up questions scoped to {brief.topic}
          </p>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESET_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void askQuestion(q)}
              className="text-left text-xs px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-600 dark:hover:border-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mt-4 space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded-md border text-sm ${
                msg.role === 'user'
                  ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {msg.role === 'user' ? 'Product Strategist' : 'Trend Researcher Analyst'}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {msg.sources.slice(0, 4).map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-300 hover:underline"
                    >
                      <span className="truncate max-w-[200px]">{src.domain}</span>
                      <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-rose-700 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up question on pricing, regulation, or GTM strategy..."
          disabled={loading}
          className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-600"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-md bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white transition-colors whitespace-nowrap shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span>Researching</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ask Analyst</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
