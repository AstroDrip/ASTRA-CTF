import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EchoState } from '../types';
import { 
  ShieldAlert, 
  RotateCcw, 
  Zap, 
  Unlock, 
  Download, 
  Sliders, 
  Flame, 
  Eye, 
  AlertTriangle,
  CheckCircle2 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { challenges, team, fetchInitialData, setEchoMessage } = useApp();
  const [selectedEchoState, setSelectedEchoState] = useState<EchoState>('AWAKE');
  const [selectedThreatLevel, setSelectedThreatLevel] = useState<number>(3);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleResetTeam = async () => {
    if (!confirm('RESET SIMULATION: This will reset solved challenges, evidence, and scores to initial state. Proceed?')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reset-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team?.id }),
      });
      const data = await res.json();
      setActionStatus(data.message || 'Team state reset.');
      await fetchInitialData();
    } catch {
      setActionStatus('Failed to reset simulation state.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/unlock-all-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team?.id }),
      });
      const data = await res.json();
      setActionStatus(data.message || 'All nodes unlocked.');
      await fetchInitialData();
    } catch {
      setActionStatus('Failed to unlock nodes.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideEcho = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/override-echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team?.id,
          echoState: selectedEchoState,
          threatLevel: selectedThreatLevel,
        }),
      });
      const data = await res.json();
      setActionStatus(data.message || 'ECHO state updated.');
      await fetchInitialData();
    } catch {
      setActionStatus('Failed to update ECHO state.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerChaos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/trigger-chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team?.id }),
      });
      const data = await res.json();
      setActionStatus(data.message || 'Simulated network anomaly packet burst injected.');
      await fetchInitialData();
    } catch {
      setActionStatus('Failed to inject chaos packet.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const exportBlob = new Blob([
      JSON.stringify({
        timestamp: new Date().toISOString(),
        team,
        challenges: challenges.map((c) => ({
          id: c.id,
          title: c.title,
          isSolved: c.isSolved,
          isLocked: c.isLocked,
        })),
      }, null, 2),
    ], { type: 'application/json' });

    const url = URL.createObjectURL(exportBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KMCT_ECHO_REPORT_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 border-b border-[#1b2129] pb-6">
        <div className="flex items-center space-x-2 font-mono text-xs text-[#f43f5e]">
          <ShieldAlert className="h-4 w-4" />
          <span>INSTRUCTOR CONTROL SUITE // RANGE DIRECTIVE</span>
        </div>
        <h1 className="mt-2 font-sans text-3xl font-black tracking-tight text-[#f3f4f6] sm:text-4xl">
          ADMIN & RANGE CONTROLS
        </h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Dynamic supervision tools for facilitators and challenge authors. Manipulate range state in real-time.
        </p>
      </div>

      {actionStatus && (
        <div className="mb-6 border border-[#ccff00] bg-[#ccff00]/10 p-4 font-mono text-xs text-[#ccff00] flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{actionStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 1. ECHO Evolutionary State Manipulation */}
        <div className="border border-[#1b2129] bg-[#0c0f14] p-6 space-y-4">
          <div className="flex items-center space-x-2 font-mono text-xs font-bold text-[#ccff00]">
            <Eye className="h-4 w-4" />
            <span>FORCE ECHO STATE SHIFT</span>
          </div>
          <p className="text-xs text-[#9ca3af]">
            Instantly shift the reactive intelligence state for demonstration and testing purposes.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-[#6b7280] mb-1">TARGET STATE:</label>
              <select
                value={selectedEchoState}
                onChange={(e) => setSelectedEchoState(e.target.value as EchoState)}
                className="w-full border border-[#1b2129] bg-[#07090b] px-3 py-2 text-white"
              >
                <option value="OBSERVING">OBSERVING (Baseline / Quiet)</option>
                <option value="ADAPTING">ADAPTING (Aware / Reconfigured)</option>
                <option value="AWAKE">AWAKE (Active Countermeasures)</option>
                <option value="CORE">CORE (System Singularity)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#6b7280] mb-1">THREAT LEVEL (1 - 5):</label>
              <input
                type="range"
                min="1"
                max="5"
                value={selectedThreatLevel}
                onChange={(e) => setSelectedThreatLevel(Number(e.target.value))}
                className="w-full accent-[#ccff00]"
              />
              <div className="text-right text-[#ccff00]">LEVEL {selectedThreatLevel}</div>
            </div>

            <button
              onClick={handleOverrideEcho}
              disabled={loading}
              className="w-full border border-[#ccff00] bg-[#ccff00] py-2 font-bold text-black hover:bg-transparent hover:text-[#ccff00] transition-all"
            >
              APPLY ECHO OVERRIDE
            </button>
          </div>
        </div>

        {/* 2. Network Traffic & Anomaly Injection */}
        <div className="border border-[#1b2129] bg-[#0c0f14] p-6 space-y-4">
          <div className="flex items-center space-x-2 font-mono text-xs font-bold text-[#f43f5e]">
            <Flame className="h-4 w-4" />
            <span>CHAOS & TELEMETRY INJECTION</span>
          </div>
          <p className="text-xs text-[#9ca3af]">
            Simulate an active threat actor beacon burst. Adds anomalous frames to the network analyzer and updates ECHO dialogue.
          </p>

          <div className="space-y-3 pt-4">
            <button
              onClick={handleTriggerChaos}
              disabled={loading}
              className="w-full border border-[#f43f5e] bg-[#f43f5e]/10 py-2.5 font-mono text-xs font-bold text-[#f43f5e] hover:bg-[#f43f5e] hover:text-white transition-all flex items-center justify-center space-x-2"
            >
              <Zap className="h-4 w-4" />
              <span>INJECT PERIMETER ANOMALY BURST</span>
            </button>

            <button
              onClick={handleUnlockAll}
              disabled={loading}
              className="w-full border border-[#1b2129] bg-[#12161d] py-2.5 font-mono text-xs text-[#00f0ff] hover:border-[#00f0ff] transition-all flex items-center justify-center space-x-2"
            >
              <Unlock className="h-4 w-4" />
              <span>FORCE UNLOCK ALL 18 NODES</span>
            </button>
          </div>
        </div>

        {/* 3. Team Progress Reset */}
        <div className="border border-[#1b2129] bg-[#0c0f14] p-6 space-y-4">
          <div className="flex items-center space-x-2 font-mono text-xs font-bold text-gray-300">
            <RotateCcw className="h-4 w-4 text-[#6b7280]" />
            <span>SESSION RESET</span>
          </div>
          <p className="text-xs text-[#9ca3af]">
            Reset team progress back to pristine factory state for a fresh participant run.
          </p>

          <button
            onClick={handleResetTeam}
            disabled={loading}
            className="w-full border border-red-900 bg-red-950/40 py-2.5 font-mono text-xs text-red-300 hover:bg-red-900 hover:text-white transition-all"
          >
            RESET ACTIVE TEAM PROGRESS
          </button>
        </div>

        {/* 4. Report & Telemetry Export */}
        <div className="border border-[#1b2129] bg-[#0c0f14] p-6 space-y-4">
          <div className="flex items-center space-x-2 font-mono text-xs font-bold text-[#ccff00]">
            <Download className="h-4 w-4" />
            <span>AUDIT EXPORT</span>
          </div>
          <p className="text-xs text-[#9ca3af]">
            Download comprehensive incident report, team solves, and timestamps as JSON.
          </p>

          <button
            onClick={handleExportData}
            className="w-full border border-[#1b2129] bg-[#12161d] py-2.5 font-mono text-xs text-[#ccff00] hover:border-[#ccff00] transition-all flex items-center justify-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>EXPORT RANGE TELEMETRY (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
