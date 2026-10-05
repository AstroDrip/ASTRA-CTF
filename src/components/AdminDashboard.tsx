import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Flame,
  Lock,
  LogIn,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ToggleLeft,
  Unlock,
  Users,
  Zap,
} from 'lucide-react';
import { EchoState } from '../types';

interface AdminTeam {
  id: string;
  name: string;
  score: number;
  solvedCount: number;
  solvedChallengeIds: string[];
  echoState: EchoState;
  threatLevel: number;
  wrongAttemptsCount: number;
  activePlayerCount: number;
  activeSessions: Array<{ id: string; createdAt: string }>;
  lastSolveAt?: string;
  createdAt: string;
}

interface ChallengeStat {
  id: string;
  nodeIndex: number;
  title: string;
  difficulty: string;
  difficultyRating: number;
  solvedTeams: number;
  totalSubmissions: number;
  incorrectSubmissions: number;
  successRate: number;
}

interface AdminOverview {
  teamsCount: number;
  activeTeamsCount: number;
  completedTeamsCount: number;
  totalSolved: number;
  submissionsCount: number;
  teams: AdminTeam[];
  submissions: Array<{
    id: string;
    teamId: string;
    teamName: string;
    challengeId: string;
    challengeTitle: string;
    isCorrect: boolean;
    timestamp: string;
    pointsDelta: number;
    attemptedFlag: string;
  }>;
  challengeStats: ChallengeStat[];
  systemEvents: Array<{
    id: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    eventType: string;
    message: string;
    teamId?: string | null;
    createdAt: string;
  }>;
}

const PASSCODE_KEY = 'astra_admin_passcode';

export const AdminDashboard: React.FC = () => {
  const [passcode, setPasscode] = useState(() => sessionStorage.getItem(PASSCODE_KEY) || '');
  const [authorized, setAuthorized] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedEchoState, setSelectedEchoState] = useState<EchoState>('AWAKE');
  const [selectedThreatLevel, setSelectedThreatLevel] = useState(3);
  const [toggleChallengeId, setToggleChallengeId] = useState('');
  const [toggleDisabled, setToggleDisabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [teamPassword, setTeamPassword] = useState('');

  const adminFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {});
    headers.set('x-admin-passcode', passcode);
    return fetch(url, { ...init, headers, cache: 'no-store' });
  }, [passcode]);

  const loadOverview = useCallback(async () => {
    if (!authorized || !passcode) return;
    try {
      const res = await adminFetch('/api/admin/overview');
      const data = await res.json();
      if (res.status === 401) {
        setAuthorized(false);
        setAuthError(data.error || 'Admin authorization expired.');
        return;
      }
      if (!res.ok) {
        setOverviewError(data.details || data.error || 'Unable to load admin overview.');
        return;
      }
      setOverview(data);
      setOverviewError(null);
      if (!selectedTeamId && data.teams?.length) setSelectedTeamId(data.teams[0].id);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to reach the range monitoring API.');
    }
  }, [adminFetch, authorized, passcode, selectedTeamId]);

  useEffect(() => {
    if (passcode) {
      adminFetch('/api/admin/overview').then(async (res) => {
        if (res.ok) {
          setAuthorized(true);
          setAuthError(null);
          const data = await res.json();
          if (!res.ok) {
            setOverviewError(data.details || data.error || 'Unable to load admin overview.');
            return;
          }
          setOverview(data);
          setOverviewError(null);
          if (!selectedTeamId && data.teams?.length) setSelectedTeamId(data.teams[0].id);
        } else {
          setAuthorized(false);
          const data = await res.json().catch(() => ({}));
          if (res.status === 401) {
            setAuthError('Stored admin credential is not valid.');
          } else {
            setAuthorized(true);
            setOverviewError(data.details || data.error || 'Unable to load admin overview.');
          }
        }
      }).catch((error) => {
        setAuthorized(true);
        setOverviewError(error instanceof Error ? error.message : 'Unable to reach the range monitoring API.');
      });
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    const timer = window.setInterval(loadOverview, 2500);
    return () => window.clearInterval(timer);
  }, [authorized, loadOverview]);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok || !data.authorized) {
        setAuthError(data.error || 'Admin authorization rejected.');
        return;
      }
      sessionStorage.setItem(PASSCODE_KEY, passcode);
      setAuthorized(true);
      setMessage('ADMIN CHANNEL AUTHENTICATED.');
      await loadOverview();
    } catch {
      setAuthError('Admin authentication service unavailable.');
    } finally {
      setBusy(false);
    }
  };

  const runAdminAction = async (url: string, body: Record<string, unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await adminFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Admin action failed.');
      setMessage(data.message || success);
      await loadOverview();
      return true;
    } catch (err: any) {
      setMessage(err.message || 'Admin action failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const exportOverview = () => {
    if (!overview) return;
    const blob = new Blob([JSON.stringify(overview, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ASTRA_RANGE_MONITOR_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedTeam = useMemo(
    () => overview?.teams.find((team) => team.id === selectedTeamId) || null,
    [overview, selectedTeamId],
  );

  if (!authorized) {
    return (
      <div className="relative z-10 mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="border border-[#1b2129] bg-[#0c0f14] p-7">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#f43f5e]">
            <ShieldAlert className="h-4 w-4" />
            <span>INSTRUCTOR CONTROL SUITE</span>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">ADMIN ACCESS</h1>
          <p className="mt-2 text-sm text-[#9ca3af]">
            The event operator dashboard is isolated from player progress and requires the server-side ADMIN_SECRET.
          </p>
          <form onSubmit={handleAuthorize} className="mt-6 space-y-3">
            <label className="block font-mono text-xs text-[#9ca3af]">ADMIN SECRET</label>
            <input
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full border border-[#1b2129] bg-[#050709] px-3 py-2.5 font-mono text-sm text-white focus:border-[#ccff00] focus:outline-none"
              placeholder="Configured by event developer"
            />
            {authError && (
              <div className="flex items-center gap-2 border border-red-500/40 bg-red-500/10 p-3 font-mono text-xs text-red-300">
                <AlertTriangle className="h-4 w-4" />
                <span>{authError}</span>
              </div>
            )}
            <button
              disabled={busy || !passcode}
              className="flex w-full items-center justify-center gap-2 border border-[#ccff00] bg-[#ccff00] py-2.5 font-mono text-xs font-bold text-black disabled:opacity-40"
            >
              <LogIn className="h-4 w-4" />
              {busy ? 'AUTHENTICATING...' : 'ENTER MONITORING CONSOLE'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="border border-[#1b2129] bg-[#0c0f14] p-6 font-mono text-xs text-[#9ca3af]">
          {overviewError ? (
            <>
              <p className="text-red-300">{overviewError}</p>
              <button onClick={loadOverview} className="mt-4 border border-[#1b2129] px-3 py-2 text-[#ccff00] hover:border-[#ccff00]">
                RETRY
              </button>
            </>
          ) : 'LOADING RANGE TELEMETRY...'}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-7 flex flex-col gap-4 border-b border-[#1b2129] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#f43f5e]"><ShieldAlert className="h-4 w-4" />INSTRUCTOR CONTROL SUITE</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">RANGE MONITOR</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">Live team progress, challenge health, errors and event controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadOverview} className="flex items-center gap-2 border border-[#1b2129] bg-[#0e1217] px-3 py-2 font-mono text-xs text-[#9ca3af] hover:border-[#ccff00]/40 hover:text-white"><RefreshCw className="h-3.5 w-3.5" />REFRESH</button>
          <button onClick={exportOverview} className="flex items-center gap-2 border border-[#1b2129] bg-[#0e1217] px-3 py-2 font-mono text-xs text-[#ccff00] hover:border-[#ccff00]"><Download className="h-3.5 w-3.5" />EXPORT</button>
          <button onClick={() => { sessionStorage.removeItem(PASSCODE_KEY); setAuthorized(false); }} className="flex items-center gap-2 border border-[#1b2129] bg-[#0e1217] px-3 py-2 font-mono text-xs text-[#9ca3af] hover:text-white"><Lock className="h-3.5 w-3.5" />LOCK</button>
        </div>
      </div>

      {message && <div className="mb-5 flex items-center gap-2 border border-[#ccff00]/40 bg-[#ccff00]/10 p-3 font-mono text-xs text-[#ccff00]"><CheckCircle2 className="h-4 w-4" />{message}</div>}
      {overviewError && <div className="mb-5 flex items-center justify-between gap-3 border border-red-500/40 bg-red-500/10 p-3 font-mono text-xs text-red-300"><span>{overviewError}</span><button onClick={loadOverview} className="shrink-0 border border-red-500/40 px-2 py-1 hover:border-red-300">RETRY</button></div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['TEAMS', overview.teamsCount, Users],
          ['ACTIVE', overview.activeTeamsCount, Eye],
          ['COMPLETED', overview.completedTeamsCount, CheckCircle2],
          ['SOLVES', overview.totalSolved, ToggleLeft],
          ['SUBMISSIONS', overview.submissionsCount, Zap],
        ].map(([label, value, Icon]: any) => (
          <div key={label} className="border border-[#1b2129] bg-[#0c0f14] p-4">
            <div className="flex items-center gap-2 text-[#6b7280]"><Icon className="h-3.5 w-3.5" /><span className="font-mono text-[10px]">{label}</span></div>
            <div className="mt-2 font-mono text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <section className="border border-[#1b2129] bg-[#0c0f14] p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-mono text-sm font-bold text-white">LIVE TEAM MONITOR</h2><p className="mt-1 text-xs text-[#6b7280]">Two-player shared progress state.</p></div><Users className="h-4 w-4 text-[#00f0ff]" /></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] font-mono text-xs">
              <thead className="border-b border-[#1b2129] text-left text-[#6b7280]"><tr><th className="py-2">TEAM</th><th>SCORE</th><th>PROGRESS</th><th>PLAYERS</th><th>ECHO</th><th>LAST SOLVE</th><th>ACTIONS</th></tr></thead>
              <tbody className="divide-y divide-[#151a20]">
                {overview.teams.map((teamRow) => (
                  <tr key={teamRow.id} className={teamRow.id === selectedTeamId ? 'bg-[#11161b]' : ''}>
                    <td className="py-3"><button onClick={() => setSelectedTeamId(teamRow.id)} className="text-left text-white hover:text-[#ccff00]"><div className="font-bold">{teamRow.name}</div><div className="text-[9px] text-[#4b5563]">{teamRow.id}</div></button></td>
                    <td className="text-[#ccff00]">{teamRow.score}</td>
                    <td className="text-white">{teamRow.solvedCount}/18</td>
                    <td><span className={teamRow.activePlayerCount > 0 ? 'text-[#22c55e]' : 'text-[#6b7280]'}>{teamRow.activePlayerCount}/2</span></td>
                    <td className="text-[#00f0ff]">{teamRow.echoState} / {teamRow.threatLevel}</td>
                    <td className="text-[#9ca3af]">{teamRow.lastSolveAt ? new Date(teamRow.lastSolveAt).toLocaleTimeString() : '—'}</td>
                    <td><button onClick={() => setSelectedTeamId(teamRow.id)} className="border border-[#1b2129] px-2 py-1 text-[10px] text-[#9ca3af] hover:border-[#ccff00]/40 hover:text-white">FOCUS</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border border-[#1b2129] bg-[#0c0f14] p-5">
          <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-[#f59e0b]" /><h2 className="font-mono text-sm font-bold text-white">TEAM CONTROLS</h2></div>
          <div className="mt-4 space-y-3">
            <label className="block font-mono text-[10px] text-[#6b7280]">TARGET TEAM</label>
            <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="w-full border border-[#1b2129] bg-[#07090b] px-3 py-2 font-mono text-xs text-white">
              {overview.teams.map((teamRow) => <option key={teamRow.id} value={teamRow.id}>{teamRow.name}</option>)}
            </select>
            {selectedTeam && <div className="border border-[#1b2129] bg-[#07090b] p-3 font-mono text-xs"><div className="text-white">{selectedTeam.name}</div><div className="mt-1 text-[#6b7280]">{selectedTeam.solvedCount}/18 solved · {selectedTeam.score} pts · {selectedTeam.activePlayerCount}/2 player sessions</div></div>}
            <div className="border border-[#1b2129] bg-[#07090b] p-3">
              <label htmlFor="admin-team-password" className="block font-mono text-[10px] text-[#6b7280]">SET NEW TEAM PASSPHRASE</label>
              <div className="mt-2 flex gap-2">
                <input id="admin-team-password" type="password" minLength={4} maxLength={128} autoComplete="new-password" value={teamPassword} onChange={(event) => setTeamPassword(event.target.value)} className="min-w-0 flex-1 border border-[#1b2129] bg-[#050709] px-2 py-2 font-mono text-xs text-white" placeholder="New passphrase" />
                <button disabled={busy || !selectedTeamId || teamPassword.length < 4} onClick={async () => {
                  const password = teamPassword;
                  if (await runAdminAction('/api/admin/change-team-password', { teamId: selectedTeamId, password }, 'Team passphrase changed.')) {
                    setTeamPassword('');
                  }
                }} className="border border-[#f59e0b]/40 px-2 py-2 font-mono text-[10px] text-[#f59e0b] hover:border-[#f59e0b] disabled:opacity-40">CHANGE</button>
              </div>
              <p className="mt-2 font-mono text-[9px] text-[#6b7280]">Existing sessions stay connected. Passwords cannot be viewed; only reset.</p>
            </div>
            <div className="border border-[#1b2129] bg-[#07090b] p-3">
              <div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] text-[#6b7280]">ACTIVE PLAYER SESSIONS</span><span className="font-mono text-[10px] text-[#9ca3af]">{selectedTeam?.activeSessions.length || 0}/2</span></div>
              <div className="space-y-2">
                {selectedTeam?.activeSessions.length ? selectedTeam.activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between gap-2 border border-[#151a20] px-2 py-2">
                    <span className="font-mono text-[10px] text-[#9ca3af]">SESSION {session.id} · {new Date(session.createdAt).toLocaleString()}</span>
                    <button disabled={busy} onClick={() => runAdminAction('/api/admin/revoke-session', { teamId: selectedTeam.id, sessionId: session.id }, 'Player session disconnected.')} className="shrink-0 border border-red-900/80 px-2 py-1 font-mono text-[9px] text-red-300 hover:border-red-400 disabled:opacity-40">DISCONNECT</button>
                  </div>
                )) : <div className="font-mono text-[10px] text-[#6b7280]">NO ACTIVE SESSIONS</div>}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button disabled={busy} onClick={() => runAdminAction('/api/admin/reset-team', { teamId: selectedTeamId }, 'Team reset.')} className="flex items-center justify-center gap-2 border border-red-900/80 bg-red-950/30 px-3 py-2 font-mono text-[10px] text-red-300 hover:bg-red-950/60 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />RESET TEAM</button>
              <button disabled={busy} onClick={() => runAdminAction('/api/admin/unlock-all-nodes', { teamId: selectedTeamId }, 'All nodes unlocked for testing.')} className="flex items-center justify-center gap-2 border border-[#00f0ff]/30 bg-[#00f0ff]/5 px-3 py-2 font-mono text-[10px] text-[#00f0ff] hover:border-[#00f0ff] disabled:opacity-40"><Unlock className="h-3.5 w-3.5" />UNLOCK ALL</button>
            </div>
            <div className="border-t border-[#1b2129] pt-3">
              <label className="block font-mono text-[10px] text-[#6b7280]">ECHO OVERRIDE</label>
              <div className="mt-2 grid grid-cols-2 gap-2"><select value={selectedEchoState} onChange={(e) => setSelectedEchoState(e.target.value as EchoState)} className="border border-[#1b2129] bg-[#07090b] px-2 py-2 font-mono text-xs text-white">{['OBSERVING','ADAPTING','AWAKE','CORE'].map((value) => <option key={value}>{value}</option>)}</select><input value={selectedThreatLevel} onChange={(e) => setSelectedThreatLevel(Number(e.target.value))} type="number" min="1" max="5" className="border border-[#1b2129] bg-[#07090b] px-2 py-2 font-mono text-xs text-white" /></div>
              <button disabled={busy} onClick={() => runAdminAction('/api/admin/override-echo', { teamId: selectedTeamId, echoState: selectedEchoState, threatLevel: selectedThreatLevel }, 'ECHO override applied.')} className="mt-2 w-full border border-[#ccff00]/40 bg-[#ccff00]/5 px-3 py-2 font-mono text-[10px] text-[#ccff00] hover:border-[#ccff00] disabled:opacity-40"><Flame className="mr-2 inline h-3.5 w-3.5" />APPLY OVERRIDE</button>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="border border-[#1b2129] bg-[#0c0f14] p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-mono text-sm font-bold text-white">CHALLENGE HEALTH</h2><p className="mt-1 text-xs text-[#6b7280]">Find unexpected bottlenecks during the event.</p></div><AlertTriangle className="h-4 w-4 text-[#f59e0b]" /></div>
          <div className="space-y-2">
            {overview.challengeStats.map((stat) => (
              <div key={stat.id} className="grid grid-cols-[70px_1fr_60px_60px_60px] items-center gap-2 border-b border-[#151a20] py-2 font-mono text-[10px]">
                <div className="text-[#6b7280]">{stat.id.toUpperCase()}</div>
                <div className="truncate text-white">{stat.title}<span className="ml-2 text-[#6b7280]">{stat.difficultyRating}/10</span></div>
                <div className="text-[#22c55e]">{stat.solvedTeams}S</div><div className="text-red-300">{stat.incorrectSubmissions}F</div><div className="text-[#9ca3af]">{stat.successRate}%</div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-[#1b2129] bg-[#0c0f14] p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-mono text-sm font-bold text-white">CHALLENGE TOGGLE / TEST MODE</h2><p className="mt-1 text-xs text-[#6b7280]">Temporarily disable or re-enable a node.</p></div><ToggleLeft className="h-4 w-4 text-[#00f0ff]" /></div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <select value={toggleChallengeId} onChange={(e) => setToggleChallengeId(e.target.value)} className="border border-[#1b2129] bg-[#07090b] px-3 py-2 font-mono text-xs text-white"><option value="">Select challenge</option>{overview.challengeStats.map((stat) => <option key={stat.id} value={stat.id}>{stat.id.toUpperCase()} — {stat.title}</option>)}</select>
            <button onClick={() => runAdminAction('/api/admin/challenge-toggle', { challengeId: toggleChallengeId, disable: true }, 'Challenge disabled.')} disabled={!toggleChallengeId || busy} className="border border-red-900/70 px-3 py-2 font-mono text-[10px] text-red-300 disabled:opacity-40">DISABLE</button>
            <button onClick={() => runAdminAction('/api/admin/challenge-toggle', { challengeId: toggleChallengeId, disable: false }, 'Challenge enabled.')} disabled={!toggleChallengeId || busy} className="border border-[#22c55e]/30 px-3 py-2 font-mono text-[10px] text-[#22c55e] disabled:opacity-40">ENABLE</button>
          </div>
          <button onClick={() => { if (confirm('Reset the entire competition? All team progress will be deleted.')) runAdminAction('/api/admin/reset', {}, 'Competition reset.'); }} disabled={busy} className="mt-4 w-full border border-[#f43f5e]/40 bg-[#f43f5e]/5 px-3 py-2 font-mono text-[10px] text-[#f43f5e] hover:border-[#f43f5e] disabled:opacity-40">RESET ENTIRE COMPETITION</button>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="border border-[#1b2129] bg-[#0c0f14] p-5">
          <div className="mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-[#ccff00]" /><h2 className="font-mono text-sm font-bold text-white">LIVE SUBMISSION STREAM</h2></div>
          <div className="max-h-[390px] overflow-y-auto space-y-1">{overview.submissions.slice(0, 100).map((item) => <div key={item.id} className="grid grid-cols-[74px_1fr_56px] gap-2 border-b border-[#151a20] py-2 font-mono text-[10px]"><div className="text-[#6b7280]">{new Date(item.timestamp).toLocaleTimeString()}</div><div><span className="text-white">{item.teamName}</span><span className="mx-1 text-[#4b5563]">→</span><span className={item.isCorrect ? 'text-[#22c55e]' : 'text-red-300'}>{item.challengeId}</span></div><div className={item.isCorrect ? 'text-[#22c55e]' : 'text-red-300'}>{item.isCorrect ? `+${item.pointsDelta}` : '-5'}</div></div>)}</div>
        </section>
        <section className="border border-[#1b2129] bg-[#0c0f14] p-5">
          <div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[#f59e0b]" /><h2 className="font-mono text-sm font-bold text-white">ERROR / HICCUP LOG</h2></div>
          <div className="max-h-[390px] overflow-y-auto space-y-1">{overview.systemEvents.length === 0 ? <div className="py-10 text-center font-mono text-xs text-[#6b7280]">NO EVENTS RECORDED</div> : overview.systemEvents.map((event) => <div key={event.id} className="border-b border-[#151a20] py-2 font-mono text-[10px]"><div className="flex items-center justify-between gap-3"><span className={event.level === 'ERROR' ? 'text-red-300' : event.level === 'WARN' ? 'text-[#f59e0b]' : 'text-[#22c55e]'}>{event.level}</span><span className="text-[#4b5563]">{new Date(event.createdAt).toLocaleTimeString()}</span></div><div className="mt-1 text-white">{event.eventType}</div><div className="mt-1 text-[#9ca3af]">{event.message}</div>{event.teamId && <div className="mt-1 text-[#4b5563]">TEAM: {event.teamId}</div>}</div>)}</div>
        </section>
      </div>
    </div>
  );
};
