import React from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Radio, Volume2, VolumeX, Sparkles, User, Terminal, FolderLock, Clock, Trophy } from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    team, 
    activeView, 
    setActiveView, 
    motionEnabled, 
    toggleMotion, 
    soundEnabled, 
    toggleSound, 
    openAuthModal, 
    logout,
    evidence,
    openSimulatedTool,
    liveSyncAt
  } = useApp();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1b2129] bg-[#07090b]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Left: Brand */}
        <div className="flex items-center space-x-6">
          <button 
            id="brand-home-btn"
            onClick={() => setActiveView('landing')}
            className="group flex items-center space-x-3 text-left focus:outline-none"
          >
            {/* Geometric Triangle Symbol */}
            <div className="relative flex h-8 w-8 items-center justify-center border border-[#ccff00]/40 bg-[#ccff00]/5 transition-transform group-hover:scale-105">
              <svg className="h-5 w-5 fill-none stroke-[#ccff00]" viewBox="0 0 24 24" strokeWidth="2">
                <polygon points="12 2 22 20 2 20" />
                <circle cx="12" cy="14" r="2" fill="#ccff00" />
              </svg>
              <div className="absolute -inset-0.5 animate-pulse bg-[#ccff00]/10 blur-sm" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-bold tracking-widest text-[#f3f4f6]">ASTRA</span>
                <span className="font-mono text-xs text-[#ccff00]">//</span>
                <span className="font-mono text-sm font-bold tracking-widest text-[#ccff00]">ECHO</span>
              </div>
              <p className="font-mono text-[10px] tracking-wider text-[#6b7280]">
                KMCT CYBER RANGE
              </p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden items-center space-x-1 md:flex">
            <button
              id="nav-warroom-btn"
              onClick={() => setActiveView('warroom')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 font-mono text-xs tracking-wider transition-colors ${
                activeView === 'warroom'
                  ? 'border-b-2 border-[#ccff00] text-[#ccff00]'
                  : 'text-[#9ca3af] hover:text-[#f3f4f6]'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>WAR ROOM</span>
            </button>

            <button
              id="nav-evidence-btn"
              onClick={() => setActiveView('evidence')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 font-mono text-xs tracking-wider transition-colors ${
                activeView === 'evidence'
                  ? 'border-b-2 border-[#ccff00] text-[#ccff00]'
                  : 'text-[#9ca3af] hover:text-[#f3f4f6]'
              }`}
            >
              <FolderLock className="h-3.5 w-3.5" />
              <span>EVIDENCE</span>
              {evidence.length > 0 && (
                <span className="ml-1 rounded-sm bg-[#ccff00]/15 px-1 py-0.2 font-mono text-[10px] text-[#ccff00]">
                  {evidence.length}
                </span>
              )}
            </button>

            <button
              id="nav-timeline-btn"
              onClick={() => setActiveView('timeline')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 font-mono text-xs tracking-wider transition-colors ${
                activeView === 'timeline'
                  ? 'border-b-2 border-[#ccff00] text-[#ccff00]'
                  : 'text-[#9ca3af] hover:text-[#f3f4f6]'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>TIMELINE</span>
            </button>

            <button
              id="nav-scoreboard-btn"
              onClick={() => setActiveView('scoreboard')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 font-mono text-xs tracking-wider transition-colors ${
                activeView === 'scoreboard'
                  ? 'border-b-2 border-[#ccff00] text-[#ccff00]'
                  : 'text-[#9ca3af] hover:text-[#f3f4f6]'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>SCOREBOARD</span>
            </button>

            <button
              id="nav-achievements-btn"
              onClick={() => setActiveView('achievements')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 font-mono text-xs tracking-wider transition-colors ${
                activeView === 'achievements'
                  ? 'border-b-2 border-[#ccff00] text-[#ccff00]'
                  : 'text-[#9ca3af] hover:text-[#f3f4f6]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>BADGES</span>
            </button>

          </nav>
        </div>

        {/* Right: Telemetry & Controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Quick Terminal Launcher */}
          <button
            id="quick-terminal-btn"
            onClick={() => openSimulatedTool('terminal')}
            title="Open Simulated Terminal"
            className="flex items-center space-x-1 border border-[#1b2129] bg-[#0e1217] px-2 py-1 font-mono text-xs text-[#9ca3af] hover:border-[#ccff00]/40 hover:text-[#ccff00]"
          >
            <Terminal className="h-3.5 w-3.5 text-[#ccff00]" />
            <span className="hidden sm:inline">SHELL</span>
          </button>

          {/* Audio Toggle */}
          <button
            id="toggle-audio-btn"
            onClick={toggleSound}
            title={soundEnabled ? 'Disable synthetic telemetry audio' : 'Enable synthetic telemetry audio'}
            className="flex h-7 w-7 items-center justify-center border border-[#1b2129] bg-[#0e1217] text-[#9ca3af] transition-colors hover:border-[#ccff00]/50 hover:text-[#ccff00]"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#ccff00]" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          {/* Motion Toggle */}
          <button
            id="toggle-motion-btn"
            onClick={toggleMotion}
            title="Toggle Animations / Reduced Motion"
            className="hidden items-center space-x-1 border border-[#1b2129] bg-[#0e1217] px-2 py-1 font-mono text-[11px] text-[#9ca3af] transition-colors hover:border-[#ccff00]/50 hover:text-[#ccff00] sm:flex"
          >
            <Sparkles className={`h-3 w-3 ${motionEnabled ? 'text-[#ccff00]' : 'text-gray-500'}`} />
            <span>MOTION {motionEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Status Indicator */}
          <div className="hidden items-center space-x-1.5 border border-[#1b2129] bg-[#0e1217] px-2.5 py-1 font-mono text-[11px] text-[#9ca3af] lg:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ccff00] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ccff00]" />
            </span>
            <span className="tracking-wider text-xs">ONLINE</span>
            {team && <span className="text-[9px] text-[#6b7280]">SYNC {liveSyncAt ? 'LIVE' : '...'}</span>}
          </div>

          {/* Team / Auth Badge */}
          {team ? (
            <div className="flex items-center space-x-2">
              <div 
                id="team-profile-pill"
                onClick={() => setActiveView('warroom')}
                className="cursor-pointer border border-[#ccff00]/30 bg-[#ccff00]/10 px-3 py-1 font-mono text-xs text-[#ccff00]"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-bold">{team.name}</span>
                  <span className="text-[#9ca3af]">|</span>
                  <span className="font-bold text-white">{team.score} PTS</span>
                  <span className="hidden text-[10px] text-[#00f0ff] sm:inline">[{team.echoState}]</span>
                  <span className="hidden text-[10px] text-[#9ca3af] md:inline">[{team.activePlayerCount || 1}/2]</span>
                </div>
              </div>

              <button
                id="header-logout-btn"
                onClick={logout}
                title="Log out of this team"
                className="border border-[#1b2129] bg-[#0e1217] px-2 py-1 font-mono text-[11px] text-[#9ca3af] hover:text-white"
              >
                LOG OUT
              </button>
            </div>
          ) : (
            <button
              id="header-login-btn"
              onClick={() => openAuthModal('login')}
              className="flex items-center space-x-1.5 border border-[#ccff00] bg-[#ccff00]/10 px-3 py-1 font-mono text-xs font-semibold tracking-wider text-[#ccff00] transition-all hover:bg-[#ccff00] hover:text-black"
            >
              <User className="h-3 w-3" />
              <span>TEAM LOGIN</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex border-t border-[#1b2129] bg-[#07090b] px-4 py-1.5 md:hidden">
        <div className="flex w-full justify-around font-mono text-[11px]">
          <button 
            onClick={() => setActiveView('warroom')}
            className={`px-2 py-1 ${activeView === 'warroom' ? 'text-[#ccff00] font-bold' : 'text-gray-400'}`}
          >
            WAR ROOM
          </button>
          <button 
            onClick={() => setActiveView('evidence')}
            className={`px-2 py-1 ${activeView === 'evidence' ? 'text-[#ccff00] font-bold' : 'text-gray-400'}`}
          >
            EVIDENCE ({evidence.length})
          </button>
          <button 
            onClick={() => setActiveView('timeline')}
            className={`px-2 py-1 ${activeView === 'timeline' ? 'text-[#ccff00] font-bold' : 'text-gray-400'}`}
          >
            TIMELINE
          </button>
          <button 
            onClick={() => setActiveView('scoreboard')}
            className={`px-2 py-1 ${activeView === 'scoreboard' ? 'text-[#ccff00] font-bold' : 'text-gray-400'}`}
          >
            SCORES
          </button>
        </div>
      </div>
    </header>
  );
};
