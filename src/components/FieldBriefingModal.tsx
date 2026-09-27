import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Shield, Terminal, Mail, Radio, FileText, Globe, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const FieldBriefingModal: React.FC = () => {
  const { isFieldBriefingOpen, setIsFieldBriefingOpen, setActiveView } = useApp();

  // Close with Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFieldBriefingOpen) {
        setIsFieldBriefingOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFieldBriefingOpen, setIsFieldBriefingOpen]);

  if (!isFieldBriefingOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsFieldBriefingOpen(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-sm cursor-pointer"
    >
      <div 
        id="field-briefing-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] border border-[#1b2129] bg-[#090c10] shadow-2xl overflow-hidden cursor-default"
      >
        {/* Header - Stays fixed at the top */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#1b2129] bg-[#0e1217] px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-[#ccff00]" />
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              KMCT CYBER RANGE // MISSION ORIENTATION BRIEFING
            </span>
          </div>
          <button onClick={() => setIsFieldBriefingOpen(false)} className="text-[#9ca3af] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm">
          {/* Mission Context */}
          <div>
            <span className="font-mono text-xs font-bold text-[#ccff00] uppercase tracking-widest">
              INCIDENT SYNOPSIS
            </span>
            <h2 className="mt-1 font-sans text-2xl font-bold text-white">
              03:12 UTC Campus Core Anomaly
            </h2>
            <p className="mt-2 leading-relaxed text-[#d1d5db]">
              At 03:12 UTC, automated surveillance detected an unscheduled synchronization pulse originating from the core campus subnet. The anomaly, codenamed <strong className="text-[#ccff00]">ECHO</strong>, has woven itself into our network fabrics, locking subsystems behind progressive cryptographic and forensic barriers.
            </p>
          </div>

          {/* Standard Flag Protocol */}
          <div className="border-l-2 border-[#ccff00] bg-[#0c0f14] p-4 font-mono">
            <div className="text-xs font-bold text-[#ccff00]">FLAG SUBMISSION STANDARD:</div>
            <div className="mt-1 text-base font-bold text-white">
              ASTRA{'{'}lowercase_alphanumeric_or_tokens{'}'}
            </div>
            <p className="mt-1 text-xs text-[#9ca3af]">
              Example: <code className="text-[#00f0ff]">ASTRA{'{'}radio_beacon_located{'}'}</code>. Submissions are strictly verified server-side.
            </p>
          </div>

          {/* Sandbox Instruments */}
          <div className="space-y-3">
            <span className="font-mono text-xs font-bold text-[#9ca3af] uppercase tracking-widest">
              VIRTUAL LAB CAPABILITIES
            </span>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 font-mono text-xs">
              <div className="border border-[#1b2129] bg-[#07090b] p-3">
                <div className="flex items-center space-x-2 text-[#ccff00] font-bold mb-1">
                  <Terminal className="h-4 w-4" />
                  <span>VIRTUAL SHELL</span>
                </div>
                <p className="text-[#9ca3af] text-[11px]">
                  Simulated Unix environment with commands like <code>ls</code>, <code>cat</code>, <code>grep</code>, <code>strings</code>, and <code>echo-quarantine</code>.
                </p>
              </div>

              <div className="border border-[#1b2129] bg-[#07090b] p-3">
                <div className="flex items-center space-x-2 text-[#00f0ff] font-bold mb-1">
                  <Mail className="h-4 w-4" />
                  <span>INTERNAL MAILBOX</span>
                </div>
                <p className="text-[#9ca3af] text-[11px]">
                  Browse intercepted email threads, administrative memos, and inspect raw MIME / DKIM headers.
                </p>
              </div>

              <div className="border border-[#1b2129] bg-[#07090b] p-3">
                <div className="flex items-center space-x-2 text-[#a78bfa] font-bold mb-1">
                  <Radio className="h-4 w-4" />
                  <span>PACKET ANALYZER</span>
                </div>
                <p className="text-[#9ca3af] text-[11px]">
                  Inspect live PCAP frame captures, hexadecimal streams, and decode protocol payloads.
                </p>
              </div>

              <div className="border border-[#1b2129] bg-[#07090b] p-3">
                <div className="flex items-center space-x-2 text-[#38bdf8] font-bold mb-1">
                  <FileText className="h-4 w-4" />
                  <span>FORENSIC CARVER</span>
                </div>
                <p className="text-[#9ca3af] text-[11px]">
                  Examine recovered sector directories, inspect raw logs, and reveal hidden files.
                </p>
              </div>
            </div>
          </div>

          {/* Safety & Isolation Guarantee */}
          <div className="border border-[#1b2129] bg-[#050709] p-4 flex items-start space-x-3 text-xs text-[#9ca3af]">
            <CheckCircle2 className="h-4 w-4 text-[#ccff00] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">100% Client & Server Safe:</strong> All systems, networks, and tokens are simulated and contained within this application sandbox. No real external hosts or systems are probed or targeted.
            </div>
          </div>

          {/* Enter Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setIsFieldBriefingOpen(false);
                setActiveView('warroom');
              }}
              className="border border-[#ccff00] bg-[#ccff00] px-6 py-2.5 font-mono text-xs font-bold text-black hover:bg-transparent hover:text-[#ccff00] transition-all flex items-center space-x-2"
            >
              <span>ACKNOWLEDGE & ENTER WAR ROOM</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
