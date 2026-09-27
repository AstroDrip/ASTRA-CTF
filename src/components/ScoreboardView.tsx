import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, RefreshCw, Shield, Users, Award, TrendingUp, CheckCircle2 } from 'lucide-react';

interface ScoreboardEntry {
  rank: number;
  id: string;
  name: string;
  score: number;
  solvedCount: number;
  threatLevel: number;
  echoState: string;
  lastSolveAt: string;
  badges: string[];
}

export const ScoreboardView: React.FC = () => {
  const { team } = useApp();
  const [leaderboard, setLeaderboard] = useState<ScoreboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchScoreboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scoreboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScoreboard();
    const interval = setInterval(fetchScoreboard, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 border-b border-[#1b2129] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 font-mono text-xs text-[#ccff00]">
              <Trophy className="h-4 w-4" />
              <span>COMPETITIVE TELEMETRY // GLOBAL LEADERBOARD</span>
            </div>
            <h1 className="mt-2 font-sans text-3xl font-black tracking-tight text-[#f3f4f6] sm:text-4xl">
              FIELD SCOREBOARD
            </h1>
            <p className="mt-1 text-sm text-[#9ca3af]">
              Live ranking computed across all participating units. Tie-breaking governed by timestamp of last verified flag.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchScoreboard}
              disabled={loading}
              className="flex items-center space-x-2 border border-[#1b2129] bg-[#0c0f14] px-4 py-2 font-mono text-xs text-[#9ca3af] hover:border-[#ccff00] hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#ccff00]' : ''}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Highlights */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {leaderboard.slice(0, 3).map((item, idx) => {
          const isUserTeam = team?.id === item.id;
          const medals = ['01 // GOLD', '02 // SILVER', '03 // BRONZE'];
          const colors = ['#ccff00', '#00f0ff', '#38bdf8'];

          return (
            <div
              key={item.id}
              className={`border p-5 relative overflow-hidden ${
                isUserTeam ? 'border-[#ccff00] bg-[#0f141a]' : 'border-[#1b2129] bg-[#0c0f14]'
              }`}
            >
              <div
                className="font-mono text-xs font-bold tracking-widest mb-2"
                style={{ color: colors[idx] }}
              >
                {medals[idx]}
              </div>

              <h3 className="font-sans text-xl font-bold text-white truncate">
                {item.name}
              </h3>

              <div className="mt-4 flex items-baseline space-x-2">
                <span className="font-mono text-2xl font-black text-white">{item.score}</span>
                <span className="font-mono text-xs text-[#6b7280]">PTS</span>
              </div>

              <div className="mt-2 flex items-center justify-between font-mono text-xs text-[#9ca3af]">
                <span>{item.solvedCount} / 18 NODES</span>
                <span className="text-[#ccff00]">{item.echoState}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Leaderboard Table */}
      <div className="border border-[#1b2129] bg-[#0a0d11] overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="border-b border-[#1b2129] bg-[#0e1217] text-[#6b7280]">
            <tr>
              <th className="px-4 py-3 w-16">RANK</th>
              <th className="px-4 py-3">UNIT / TEAM</th>
              <th className="px-4 py-3 text-right">SCORE</th>
              <th className="px-4 py-3 text-center">SOLVED</th>
              <th className="px-4 py-3 text-center">THREAT</th>
              <th className="px-4 py-3 text-center">ECHO STATE</th>
              <th className="px-4 py-3 text-right">LAST CAPTURE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141922]">
            {leaderboard.map((row) => {
              const isUserTeam = team?.id === row.id;

              return (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    isUserTeam ? 'bg-[#0f141a] text-[#ccff00]' : 'hover:bg-[#0d1015] text-[#d1d5db]'
                  }`}
                >
                  <td className="px-4 py-3 font-bold text-[#ccff00]">
                    #{row.rank < 10 ? `0${row.rank}` : row.rank}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{row.name}</span>
                      {isUserTeam && (
                        <span className="border border-[#ccff00] bg-[#ccff00]/10 px-1.5 py-0.5 text-[9px] text-[#ccff00]">
                          YOU
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-white">
                    {row.score}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[#00f0ff]">{row.solvedCount}</span>
                    <span className="text-[#4b5563]"> / 18</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-[#f43f5e]">
                    LVL {row.threatLevel}
                  </td>
                  <td className="px-4 py-3 text-center text-[#ccff00]">
                    {row.echoState}
                  </td>
                  <td className="px-4 py-3 text-right text-[#6b7280]">
                    {row.lastSolveAt}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
