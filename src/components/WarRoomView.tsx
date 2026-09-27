import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Challenge, ChallengeCategory } from '../types';
import { 
  Terminal, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  Grid, 
  Eye, 
  Zap, 
  Radio, 
  Sparkles 
} from 'lucide-react';

interface NodePosition {
  x: number;
  y: number;
  ring: number;
  angle: number;
}

export const WarRoomView: React.FC = () => {
  const { 
    team, 
    challenges, 
    setSelectedChallenge, 
    echoMessage, 
    motionEnabled,
    openAuthModal
  } = useApp();

  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Map coordinate calculations in a 1000x1000 virtual space
  const nodeCoordinates = useMemo(() => {
    const coords: Record<string, NodePosition> = {};
    const cx = 500;
    const cy = 500;

    challenges.forEach((ch) => {
      // Node 18 is the central core
      if (ch.id === 'ch-18') {
        coords[ch.id] = { x: cx, y: cy, ring: 0, angle: 0 };
        return;
      }

      let r = 380;
      let angle = 0;
      const idx = ch.nodeIndex;

      if (idx <= 4) {
        // Outer Intro Ring
        r = 390;
        const offset = -Math.PI / 2;
        angle = offset + ((idx - 1) / 4) * (Math.PI * 2);
      } else if (idx <= 9) {
        // Easy Ring
        r = 300;
        const offset = -Math.PI / 3;
        angle = offset + ((idx - 5) / 5) * (Math.PI * 2);
      } else if (idx <= 14) {
        // Medium Ring
        r = 210;
        const offset = 0;
        angle = offset + ((idx - 10) / 5) * (Math.PI * 2);
      } else if (idx <= 17) {
        // Hard Inner Gate
        r = 130;
        const offset = Math.PI / 4;
        angle = offset + ((idx - 15) / 3) * (Math.PI * 2);
      }

      coords[ch.id] = {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        ring: r,
        angle,
      };
    });

    return coords;
  }, [challenges]);

  // Filtered challenges for grid view
  const filteredChallenges = useMemo(() => {
    if (filterCategory === 'ALL') return challenges;
    return challenges.filter((c) => c.category === filterCategory);
  }, [challenges, filterCategory]);

  const solvedCount = team ? team.solvedChallengeIds.length : 0;
  const totalPoints = challenges.reduce((acc, c) => acc + c.points, 0);

  const getCategoryColor = (cat: ChallengeCategory) => {
    switch (cat) {
      case 'RECON': return '#ccff00';
      case 'CRYPTO': return '#00f0ff';
      case 'FORENSICS': return '#38bdf8';
      case 'NETWORK': return '#a78bfa';
      case 'WEB': return '#fb923c';
      case 'REVERSING': return '#f43f5e';
      case 'OSINT': return '#4ade80';
      case 'FINAL': return '#ff3344';
      default: return '#ccff00';
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* 1. HUD TOP TELEMETRY BAR */}
      <div className="mb-6 border border-[#1b2129] bg-[#0c0f14]/90 p-4 backdrop-blur-md">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 items-center">
          {/* Unit / Team */}
          <div>
            <div className="font-mono text-[10px] text-[#6b7280]">TEAM / UNIT</div>
            <div className="font-mono text-sm font-bold text-[#f3f4f6] truncate">
              {team ? team.name : (
                <button onClick={() => openAuthModal('login')} className="text-[#ccff00] underline">
                  GUEST (LOGIN)
                </button>
              )}
            </div>
          </div>

          {/* Time elapsed */}
          <div>
            <div className="font-mono text-[10px] text-[#6b7280]">SIMULATION CLOCK</div>
            <div className="font-mono text-sm font-bold text-[#ccff00]">
              03:50:18 UTC
            </div>
          </div>

          {/* Score */}
          <div>
            <div className="font-mono text-[10px] text-[#6b7280]">SCORE</div>
            <div className="font-mono text-sm font-bold text-white">
              {team ? team.score : 0} <span className="text-[10px] text-gray-500">/ {totalPoints}</span>
            </div>
          </div>

          {/* Solved */}
          <div>
            <div className="font-mono text-[10px] text-[#6b7280]">NODES RECOVERED</div>
            <div className="font-mono text-sm font-bold text-[#00f0ff]">
              {solvedCount} / {challenges.length}
            </div>
          </div>

          {/* Threat level */}
          <div>
            <div className="font-mono text-[10px] text-[#6b7280]">THREAT LEVEL</div>
            <div className="flex items-center space-x-1 font-mono text-sm font-bold text-[#f43f5e]">
              <ShieldAlert className="h-4 w-4" />
              <span>LVL {team ? team.threatLevel : 1}</span>
            </div>
          </div>

          {/* ECHO State */}
          <div>
            <div className="font-mono text-[10px] text-[#6b7280]">ECHO STATUS</div>
            <div className="flex items-center space-x-1.5 font-mono text-sm font-bold text-[#ccff00]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#ccff00]" />
              <span>{team ? team.echoState : 'OBSERVING'}</span>
            </div>
          </div>
        </div>

        {/* Dynamic ECHO Message Broadcast Bar */}
        <div className="mt-3 flex items-center space-x-2 border-t border-[#1b2129] pt-2 font-mono text-xs text-[#9ca3af]">
          <span className="text-[#ccff00] font-bold">ECHO_FEED &gt;</span>
          <span className="text-white tracking-wide">{echoMessage}</span>
        </div>
      </div>

      {/* 2. WAR ROOM CONTROLS */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'RECON', 'OSINT', 'CRYPTO', 'FORENSICS', 'NETWORK', 'WEB', 'REVERSING', 'FINAL'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 font-mono text-[11px] uppercase transition-all ${
                filterCategory === cat
                  ? 'border border-[#ccff00] bg-[#ccff00] font-bold text-black'
                  : 'border border-[#1b2129] bg-[#0e1217] text-[#9ca3af] hover:border-[#ccff00]/40 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-1 border border-[#1b2129] bg-[#0c0f13] p-1">
          <button
            id="view-toggle-map-btn"
            onClick={() => setViewMode('map')}
            className={`flex items-center space-x-1.5 px-3 py-1 font-mono text-xs transition-colors ${
              viewMode === 'map' ? 'bg-[#ccff00] font-bold text-black' : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>NETWORK MAP</span>
          </button>
          <button
            id="view-toggle-grid-btn"
            onClick={() => setViewMode('grid')}
            className={`flex items-center space-x-1.5 px-3 py-1 font-mono text-xs transition-colors ${
              viewMode === 'grid' ? 'bg-[#ccff00] font-bold text-black' : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span>MATRIX GRID</span>
          </button>
        </div>
      </div>

      {/* 3. IMMERSIVE NETWORK MAP VIEW */}
      {viewMode === 'map' && (
        <div className="relative overflow-hidden border border-[#1b2129] bg-[#080a0d] p-4">
          {/* Radial Grid & Scanner overlay */}
          <div className="relative mx-auto aspect-square w-full max-w-[840px] select-none">
            <svg
              viewBox="0 0 1000 1000"
              className="h-full w-full"
            >
              <defs>
                {/* Active pulse gradient */}
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ccff00" stopOpacity="0.15" />
                  <stop offset="70%" stopColor="#00f0ff" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#080a0d" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="lineGradActive" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ccff00" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Background Concentric Radar Rings */}
              <circle cx="500" cy="500" r="480" fill="none" stroke="#1b2129" strokeWidth="1" strokeDasharray="4 8" />
              <circle cx="500" cy="500" r="390" fill="none" stroke="#1b2129" strokeWidth="1" strokeDasharray="2 6" />
              <circle cx="500" cy="500" r="300" fill="none" stroke="#1b2129" strokeWidth="1" strokeDasharray="4 8" />
              <circle cx="500" cy="500" r="210" fill="none" stroke="#1b2129" strokeWidth="1" strokeDasharray="2 6" />
              <circle cx="500" cy="500" r="130" fill="none" stroke="#1b2129" strokeWidth="1.5" />
              <circle cx="500" cy="500" r="300" fill="url(#centerGlow)" />

              {/* Axis Crosshairs */}
              <line x1="500" y1="20" x2="500" y2="980" stroke="#161c24" strokeWidth="1" strokeDasharray="3 6" />
              <line x1="20" y1="500" x2="980" y2="500" stroke="#161c24" strokeWidth="1" strokeDasharray="3 6" />

              {/* Interconnection Lines between Prerequisite Nodes */}
              {challenges.map((ch) => {
                const targetCoord = nodeCoordinates[ch.id];
                if (!targetCoord) return null;

                return ch.prerequisites.map((prereqId) => {
                  const srcCoord = nodeCoordinates[prereqId];
                  if (!srcCoord) return null;

                  const isSolved = ch.isSolved;
                  const isAvailable = !ch.isLocked;

                  return (
                    <g key={`${prereqId}-${ch.id}`}>
                      <line
                        x1={srcCoord.x}
                        y1={srcCoord.y}
                        x2={targetCoord.x}
                        y2={targetCoord.y}
                        stroke={isSolved ? 'url(#lineGradActive)' : isAvailable ? 'rgba(204, 255, 0, 0.25)' : '#192029'}
                        strokeWidth={isSolved ? 2 : 1}
                        strokeDasharray={isSolved ? 'none' : '4 4'}
                        className={motionEnabled && isSolved ? 'animate-pulse' : ''}
                      />
                      {/* Active data packet flow on solved lines */}
                      {motionEnabled && isSolved && (
                        <circle r="2.5" fill="#ccff00">
                          <animateMotion
                            path={`M ${srcCoord.x} ${srcCoord.y} L ${targetCoord.x} ${targetCoord.y}`}
                            dur="3s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                    </g>
                  );
                });
              })}

              {/* Central ECHO CORE representation */}
              <g
                id="node-ch-18"
                onClick={() => setSelectedChallenge(challenges.find((c) => c.id === 'ch-18') || null)}
                className="cursor-pointer"
              >
                <circle
                  cx="500"
                  cy="500"
                  r="42"
                  fill="#0c0f14"
                  stroke={challenges.find((c) => c.id === 'ch-18')?.isSolved ? '#ccff00' : '#ff3344'}
                  strokeWidth="2.5"
                  className={motionEnabled ? 'animate-pulse' : ''}
                />
                <circle cx="500" cy="500" r="32" fill="none" stroke="#ff3344" strokeWidth="1" strokeDasharray="4 4" />
                <polygon
                  points="500,476 524,516 476,516"
                  fill="#ff3344"
                  fillOpacity="0.25"
                  stroke="#ff3344"
                  strokeWidth="1.5"
                />
                <text
                  x="500"
                  y="556"
                  textAnchor="middle"
                  fill="#ff3344"
                  className="font-mono text-[11px] font-bold tracking-widest"
                >
                  ECHO CORE
                </text>
              </g>

              {/* Individual Interactive Nodes */}
              {challenges.map((ch) => {
                if (ch.id === 'ch-18') return null; // rendered in center
                const pos = nodeCoordinates[ch.id];
                if (!pos) return null;

                const isSolved = ch.isSolved;
                const isLocked = ch.isLocked;
                const isHovered = hoveredNodeId === ch.id;
                const catColor = getCategoryColor(ch.category);

                return (
                  <g
                    key={ch.id}
                    id={`node-${ch.id}`}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedChallenge(ch)}
                    onMouseEnter={() => setHoveredNodeId(ch.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-pointer transition-transform duration-200"
                  >
                    {/* Outer halo */}
                    {isSolved && (
                      <circle
                        r="24"
                        fill="none"
                        stroke={catColor}
                        strokeWidth="1"
                        strokeDasharray="2 4"
                        className={motionEnabled ? 'animate-spin' : ''}
                        style={{ animationDuration: '12s' }}
                      />
                    )}

                    {/* Node Hexagon / Box */}
                    <rect
                      x="-16"
                      y="-16"
                      width="32"
                      height="32"
                      fill={isSolved ? `${catColor}20` : isLocked ? '#0a0d11' : '#12161d'}
                      stroke={isSolved ? catColor : isLocked ? '#1e242d' : isHovered ? '#ccff00' : '#334155'}
                      strokeWidth={isHovered ? 2 : 1.2}
                      transform="rotate(45)"
                    />

                    {/* Node Icon Status */}
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={isSolved ? '#ccff00' : isLocked ? '#475569' : '#f3f4f6'}
                      className="font-mono text-[10px] font-bold select-none pointer-events-none"
                    >
                      {ch.nodeIndex < 10 ? `0${ch.nodeIndex}` : ch.nodeIndex}
                    </text>

                    {/* Floating Technical Label */}
                    <g transform="translate(0, 30)">
                      <rect
                        x="-48"
                        y="-10"
                        width="96"
                        height="18"
                        fill="#07090b"
                        fillOpacity="0.85"
                        stroke={isSolved ? `${catColor}60` : '#1b2129'}
                        strokeWidth="0.8"
                      />
                      <text
                        x="0"
                        y="2"
                        textAnchor="middle"
                        fill={isSolved ? '#ffffff' : isLocked ? '#64748b' : '#9ca3af'}
                        className="font-mono text-[9px] font-medium tracking-tight select-none pointer-events-none"
                      >
                        {ch.title.length > 13 ? ch.title.slice(0, 12) + '…' : ch.title}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Map Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between border-t border-[#1b2129] pt-3 font-mono text-[11px] text-[#6b7280]">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <span className="h-2.5 w-2.5 bg-[#ccff00]" />
                <span className="text-[#9ca3af]">SOLVED</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="h-2.5 w-2.5 border border-[#ccff00]/60 bg-[#12161d]" />
                <span className="text-[#9ca3af]">AVAILABLE</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="h-2.5 w-2.5 border border-[#1e242d] bg-[#0a0d11]" />
                <span className="text-[#9ca3af]">LOCKED</span>
              </span>
            </div>
            <div className="text-[10px] text-[#4b5563]">
              CLICK ANY NODE TO INSPECT TELEMETRY & SUBMIT FLAG
            </div>
          </div>
        </div>
      )}

      {/* 4. MATRIX GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredChallenges.map((ch) => {
            const isSolved = ch.isSolved;
            const isLocked = ch.isLocked;
            const catColor = getCategoryColor(ch.category);

            return (
              <div
                key={ch.id}
                id={`card-${ch.id}`}
                onClick={() => setSelectedChallenge(ch)}
                className={`group relative cursor-pointer border p-5 transition-all ${
                  isSolved
                    ? 'border-[#ccff00]/40 bg-[#0c120c]/60 hover:border-[#ccff00]'
                    : isLocked
                    ? 'border-[#1b2129] bg-[#090b0e]/70 opacity-60'
                    : 'border-[#1b2129] bg-[#0d1015] hover:border-[#ccff00]/50 hover:bg-[#10141a]'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-[#6b7280]">
                      #{ch.nodeIndex < 10 ? `0${ch.nodeIndex}` : ch.nodeIndex}
                    </span>
                    <span
                      className="border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase"
                      style={{ borderColor: `${catColor}50`, color: catColor, backgroundColor: `${catColor}10` }}
                    >
                      {ch.category}
                    </span>
                  </div>

                  <div className="font-mono text-xs font-bold text-[#ccff00]">
                    {ch.points} PTS
                  </div>
                </div>

                {/* Title */}
                <h3 className="mt-3 font-sans text-lg font-bold text-[#f3f4f6] group-hover:text-[#ccff00]">
                  {ch.title}
                </h3>

                {/* Story preview */}
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#9ca3af]">
                  {ch.story}
                </p>

                {/* Footer status */}
                <div className="mt-4 flex items-center justify-between border-t border-[#1b2129] pt-3 font-mono text-[11px]">
                  <span className="text-[#6b7280]">
                    DIFF: <span className="text-gray-300">{ch.difficulty}</span>
                  </span>

                  <div>
                    {isSolved ? (
                      <span className="flex items-center space-x-1 text-[#ccff00]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>CLEARED</span>
                      </span>
                    ) : isLocked ? (
                      <span className="flex items-center space-x-1 text-gray-500">
                        <Lock className="h-3.5 w-3.5" />
                        <span>LOCKED</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-[#00f0ff]">
                        <Unlock className="h-3.5 w-3.5" />
                        <span>AVAILABLE</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
