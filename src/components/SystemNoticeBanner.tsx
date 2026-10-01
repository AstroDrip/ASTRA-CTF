import React, { useEffect, useState } from 'react';
import { AlertTriangle, Database, Key, X, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface SystemStatus {
  online: boolean;
  storageMode: string;
  isSupabaseConfigured: boolean;
  isAdminDefault: boolean;
  warnings: string[];
}

export const SystemNoticeBanner: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/system/status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        // If offline or error, silent ignore
      }
    };
    fetchStatus();
  }, []);

  if (!status || dismissed || (!status.warnings || status.warnings.length === 0)) {
    return null;
  }

  return (
    <aside aria-label="System Notice" className="relative z-50 border-b border-amber-500/40 bg-[#0d0f12]/95 backdrop-blur-md px-4 py-2 font-mono text-xs text-amber-300 shadow-lg shadow-amber-950/20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {/* Left icon + short label */}
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/20 text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold tracking-wider text-amber-400 uppercase">
              STANDALONE MODE ACTIVE:
            </span>
            <span className="text-amber-200/90">
              Running without external cloud DB requirements (Local store active).
            </span>
            {!status.isSupabaseConfigured && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300 border border-amber-500/30">
                <Database className="h-3 w-3" />
                Local Storage: .data/ctf_store.json
              </span>
            )}
            {status.isAdminDefault && (
              <span className="inline-flex items-center gap-1 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-300 border border-cyan-500/30">
                <Key className="h-3 w-3" />
                Admin Key: ASTRA_ADMIN_2026
              </span>
            )}
          </div>
        </div>

        {/* Right controls: Details & Dismiss */}
        <div className="flex shrink-0 items-center space-x-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center space-x-1 rounded border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-300 hover:bg-amber-500/15 transition-colors"
            title="Toggle environment configuration details"
          >
            <span>{expanded ? 'Hide Details' : 'Details'}</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-amber-400/80 hover:bg-amber-500/20 hover:text-amber-200 transition-colors"
            title="Dismiss notice banner"
            aria-label="Dismiss notice banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded details tray */}
      {expanded && (
        <div className="mx-auto mt-2.5 max-w-7xl border-t border-amber-500/20 pt-2 text-[11px] text-amber-200/80 space-y-1.5">
          <div className="font-semibold text-amber-300">Active Notices:</div>
          <ul className="list-disc pl-5 space-y-1">
            {status.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
          <p className="pt-1 text-[10px] text-gray-400">
            Tip: All CTF challenges, scoring, hint unlock, and virtual workstation features are fully playable in standalone mode. To connect Supabase for live multi-server sync, set <code className="text-amber-300">SUPABASE_URL</code> and <code className="text-amber-300">SUPABASE_SERVICE_ROLE_KEY</code> in your environment.
          </p>
        </div>
      )}
    </aside>
  );
};
