import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ParticleBackground } from './components/ParticleBackground';
import { SystemNoticeBanner } from './components/SystemNoticeBanner';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { WarRoomView } from './components/WarRoomView';
import { EvidenceLockerView } from './components/EvidenceLockerView';
import { TimelineView } from './components/TimelineView';
import { ScoreboardView } from './components/ScoreboardView';
import { AchievementsView } from './components/AchievementsView';
import { AdminDashboard } from './components/AdminDashboard';
import { ChallengeModal } from './components/ChallengeModal';
import { TerminalModal } from './components/SimulatedTools/TerminalModal';
import { MailboxModal } from './components/SimulatedTools/MailboxModal';
import { NetworkViewerModal } from './components/SimulatedTools/NetworkViewerModal';
import { FileExplorerModal } from './components/SimulatedTools/FileExplorerModal';
import { WebPortalModal } from './components/SimulatedTools/WebPortalModal';
import { AuthModal } from './components/AuthModal';
import { FieldBriefingModal } from './components/FieldBriefingModal';

const MainContent: React.FC = () => {
  const { activeView } = useApp();

  return (
    <main className="relative z-10 flex-1 pb-16">
      {activeView === 'landing' && <LandingView />}
      {activeView === 'warroom' && <WarRoomView />}
      {activeView === 'evidence' && <EvidenceLockerView />}
      {activeView === 'timeline' && <TimelineView />}
      {activeView === 'scoreboard' && <ScoreboardView />}
      {activeView === 'achievements' && <AchievementsView />}
      {activeView === 'admin' && <AdminDashboard />}

      {/* Global Interactive Workstations & Modals */}
      <ChallengeModal />
      <TerminalModal />
      <MailboxModal />
      <NetworkViewerModal />
      <FileExplorerModal />
      <WebPortalModal />
      <AuthModal />
      <FieldBriefingModal />
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="relative min-h-screen bg-[#07090b] text-[#f3f4f6] selection:bg-[#ccff00] selection:text-black flex flex-col font-sans overflow-x-hidden">
        {/* Procedural Particle & Cyber Perspective Grid */}
        <ParticleBackground />

        {/* Dynamic System Notice & Configuration Banner */}
        <SystemNoticeBanner />

        {/* Global Operational HUD Header */}
        <Header />

        {/* Dynamic Views */}
        <MainContent />

        {/* Footer info strip */}
        <footer className="relative z-10 border-t border-[#1b2129] bg-[#07090b] px-4 py-4 font-mono text-[11px] text-[#6b7280]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ccff00]" />
              <span className="text-[#9ca3af]">ASTRA // ECHO CYBER RANGE</span>
              <span className="text-[#374151]">·</span>
              <span>KMCT CYBER DEFENSE LABS</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>FICTIONAL SIMULATION</span>
              <span className="text-[#374151]">·</span>
              <span>100% AIR-GAPPED TRAINING SANDBOX</span>
            </div>
          </div>
        </footer>
      </div>
    </AppProvider>
  );
}
