import React from 'react';
import { useApp } from '../context/AppContext';
import { EchoCoreVisual } from './EchoCoreVisual';
import { Shield, ArrowRight, Terminal, User, Sparkles, Cpu, Lock, Eye, AlertTriangle } from 'lucide-react';

export const LandingView: React.FC = () => {
  const { 
    team, 
    setActiveView, 
    openAuthModal, 
    setIsFieldBriefingOpen,
    login 
  } = useApp();

  const handleQuickDemoLogin = async (teamName: string) => {
    try {
      await login(teamName, 'kmct2026');
      setActiveView('warroom');
    } catch {
      // fallback
      setActiveView('warroom');
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-16">
      {/* 1. HERO SECTION */}
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Editorial & Brutalist Typography */}
        <div className="lg:col-span-7">
          {/* Eyebrow */}
          <div className="mb-4 inline-flex items-center space-x-2 border border-[#ccff00]/30 bg-[#ccff00]/5 px-3 py-1 font-mono text-xs tracking-widest text-[#ccff00]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ccff00]" />
            <span>KMCT CYBER SECURITY · FIELD SIMULATION</span>
          </div>

          {/* Huge Typography */}
          <h1 className="font-sans text-5xl font-black leading-[0.95] tracking-tighter text-[#f3f4f6] sm:text-7xl lg:text-8xl">
            THE SYSTEM
            <br />
            <span className="text-stroke-lime font-black">IS WATCHING.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#9ca3af] sm:text-xl font-light">
            Enter a living investigation where every flag changes the network, every mistake leaves a trace, and ECHO remembers.
          </p>

          {/* Active Operator Status Callout (if authenticated) */}
          {team && (
            <div className="mt-6 inline-flex flex-wrap items-center gap-3 border border-[#ccff00]/40 bg-[#ccff00]/10 px-4 py-2.5 font-mono text-xs text-[#ccff00]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ccff00] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ccff00]" />
              </span>
              <span className="text-white font-bold tracking-wider">UNIT: {team.name}</span>
              <span className="text-[#6b7280]">|</span>
              <span className="text-[#00f0ff] font-bold">{team.score} PTS</span>
              <span className="text-[#6b7280]">|</span>
              <span className="text-emerald-400">ECHO: {team.echoState}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              id="hero-enter-system-btn"
              onClick={() => setActiveView('warroom')}
              className="group flex items-center space-x-3 border border-[#ccff00] bg-[#ccff00] px-6 py-3.5 font-mono text-sm font-bold tracking-wider text-black transition-all hover:bg-transparent hover:text-[#ccff00] active:scale-[0.98]"
            >
              <span>{team ? 'ENTER WAR ROOM & RANGE' : 'ENTER THE SYSTEM'}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            {!team && (
              <button
                id="hero-team-login-btn"
                onClick={() => openAuthModal('login')}
                className="flex items-center space-x-2 border border-[#1b2129] bg-[#0e1217] px-5 py-3.5 font-mono text-sm font-medium tracking-wider text-[#e5e7eb] transition-all hover:border-[#ccff00]/60 hover:text-white"
              >
                <User className="h-4 w-4 text-[#ccff00]" />
                <span>TEAM LOGIN</span>
              </button>
            )}

            <button
              id="hero-field-briefing-btn"
              onClick={() => setIsFieldBriefingOpen(true)}
              className="flex items-center space-x-2 border border-dashed border-[#1b2129] px-4 py-3.5 font-mono text-xs text-[#9ca3af] hover:border-[#9ca3af] hover:text-[#f3f4f6]"
            >
              <span>READ BRIEFING</span>
            </button>
          </div>

          {/* Safety Disclaimer */}
          <div className="mt-8 flex items-center space-x-2 border-l-2 border-[#ccff00]/40 pl-3 font-mono text-[11px] uppercase tracking-wider text-[#6b7280]">
            <Shield className="h-3.5 w-3.5 text-[#ccff00]" />
            <span>FICTIONAL ENVIRONMENT · SAFE TRAINING SIMULATION · NO REAL TARGETS</span>
          </div>

          {/* Fast Demo Accounts Bar (Convenience for testing) */}
          <div className="mt-8 border border-[#1b2129] bg-[#0c0f13]/80 p-3">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#9ca3af]">
              Quick Access Demo Unit (Evaluator Preset):
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                id="demo-login-alpha-btn"
                onClick={() => handleQuickDemoLogin('KMCT_ALPHA')}
                className="border border-[#1b2129] bg-[#141920] px-2.5 py-1 font-mono text-xs text-[#ccff00] transition-colors hover:border-[#ccff00]"
              >
                KMCT_ALPHA (6 solved · 1,150 pts)
              </button>
              <button
                id="demo-register-new-btn"
                onClick={() => openAuthModal('register')}
                className="border border-[#1b2129] bg-[#141920] px-2.5 py-1 font-mono text-xs text-[#00f0ff] transition-colors hover:border-[#00f0ff]"
              >
                + Register New Team (Clean State)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive ECHO CORE */}
        <div className="relative flex items-center justify-center lg:col-span-5">
          <div className="relative">
            <EchoCoreVisual size={460} />
            <div className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap border border-[#1b2129] bg-[#090c10]/95 px-4 py-1.5 font-mono text-[11px] tracking-widest text-[#ccff00]">
              ECHO // AUTONOMOUS CYBER INTELLIGENCE
            </div>
          </div>
        </div>
      </div>

      {/* 2. FIELD BRIEFING SECTION */}
      <div className="mt-24 border-t border-[#1b2129] pt-16">
        <div className="mb-12 max-w-3xl">
          <p className="font-mono text-xs tracking-widest text-[#ccff00]">FIELD BRIEFING // ORIENTATION</p>
          <h2 className="mt-2 font-sans text-3xl font-bold tracking-tight text-[#f3f4f6] sm:text-5xl">
            YOU’RE NOT OPENING A WEBSITE.
            <br />
            <span className="text-[#9ca3af]">YOU’RE ENTERING A SYSTEM.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 01 */}
          <div className="relative border border-[#1b2129] bg-[#0c0f14] p-6 transition-all hover:border-[#ccff00]/40">
            <div className="font-mono text-xs font-bold text-[#ccff00]">01</div>
            <h3 className="mt-3 font-sans text-xl font-bold text-[#f3f4f6]">INVESTIGATE</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#9ca3af]">
              Explore fictional digital systems, evidence, traces and hidden clues. Utilize the simulated terminal, internal mailbox, packet stream analyzer, and file inspector.
            </p>
            <div className="mt-6 flex items-center space-x-2 font-mono text-[11px] text-[#6b7280]">
              <Terminal className="h-3.5 w-3.5 text-[#ccff00]" />
              <span>INTERACTIVE RECONNAISSANCE</span>
            </div>
          </div>

          {/* Card 02 */}
          <div className="relative border border-[#1b2129] bg-[#0c0f14] p-6 transition-all hover:border-[#ccff00]/40">
            <div className="font-mono text-xs font-bold text-[#ccff00]">02</div>
            <h3 className="mt-3 font-sans text-xl font-bold text-[#f3f4f6]">RECOVER</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#9ca3af]">
              Submit flags to prove what you discovered and unlock deeper nodes. Each solve locks in real evidence artifacts and advances the incident timeline.
            </p>
            <div className="mt-6 flex items-center space-x-2 font-mono text-[11px] text-[#6b7280]">
              <Lock className="h-3.5 w-3.5 text-[#ccff00]" />
              <span>PROGRESSIVE UNLOCKING</span>
            </div>
          </div>

          {/* Card 03 */}
          <div className="relative border border-[#1b2129] bg-[#0c0f14] p-6 transition-all hover:border-[#ccff00]/40">
            <div className="font-mono text-xs font-bold text-[#ccff00]">03</div>
            <h3 className="mt-3 font-sans text-xl font-bold text-[#f3f4f6]">ADAPT</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#9ca3af]">
              ECHO observes the investigation and changes its behavior. As your team solves challenges, the intelligence transitions from OBSERVING to ADAPTING, AWAKE, and CORE.
            </p>
            <div className="mt-6 flex items-center space-x-2 font-mono text-[11px] text-[#6b7280]">
              <Eye className="h-3.5 w-3.5 text-[#ccff00]" />
              <span>REACTIVE STATE ENGINE</span>
            </div>
          </div>
        </div>

        {/* Big Action CTA Banner */}
        <div className="mt-12 flex flex-col items-center justify-between border border-[#ccff00]/30 bg-[#ccff00]/5 p-8 text-center sm:flex-row sm:text-left">
          <div>
            <h4 className="font-sans text-2xl font-bold text-[#f3f4f6]">
              Ready to initialize your investigation?
            </h4>
            <p className="mt-1 text-sm text-[#9ca3af]">
              18 interconnected challenges spanning Recon, OSINT, Crypto, Forensics, Network, Web, and Reversing.
            </p>
          </div>
          <button
            id="briefing-init-btn"
            onClick={() => setActiveView('warroom')}
            className="mt-4 flex items-center space-x-2 border border-[#ccff00] bg-[#ccff00] px-6 py-3 font-mono text-xs font-bold tracking-widest text-black transition-all hover:bg-transparent hover:text-[#ccff00] sm:mt-0"
          >
            <span>INITIALIZE MISSION →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
