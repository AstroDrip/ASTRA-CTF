import React from 'react';
import { useApp } from '../context/AppContext';
import { Clock, ShieldAlert, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

export const TimelineView: React.FC = () => {
  const { timeline, team, setActiveView, setSelectedChallenge, challenges } = useApp();

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-10 border-b border-[#1b2129] pb-6">
        <div className="flex items-center space-x-2 font-mono text-xs text-[#ccff00]">
          <Clock className="h-4 w-4" />
          <span>FORENSIC RECONSTRUCTION // CHRONOLOGICAL SEQUENCE</span>
        </div>
        <h1 className="mt-2 font-sans text-3xl font-black tracking-tight text-[#f3f4f6] sm:text-4xl">
          INCIDENT TIMELINE
        </h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Chronological unfolding of the breach. Classified events de-anonymize as corresponding network nodes are cleared.
        </p>
      </div>

      {/* Timeline Stream */}
      <div className="relative border-l border-[#1b2129] ml-4 md:ml-32 space-y-8 pb-12">
        {timeline.map((event) => {
          const isRevealed = event.unlocked || !!event.revealed;
          const chId = event.relatedChallengeId || event.challengeId || '';
          const associatedCh = challenges.find((c) => c.id === chId);
          const timeDisplay = event.time || event.timestamp || '03:12:00';
          const summaryText = event.description || event.summary || '';

          return (
            <div key={event.id} className="relative pl-6 md:pl-8">
              {/* Timeline marker pip */}
              <div
                className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 ${
                  isRevealed
                    ? 'border-[#ccff00] bg-[#ccff00] shadow-[0_0_10px_#ccff00]'
                    : 'border-[#1b2129] bg-[#0c0f14]'
                }`}
              />

              {/* Timestamp label on desktop floats to left */}
              <div className="md:absolute md:-left-36 md:top-1 font-mono text-xs font-bold text-[#ccff00]">
                {timeDisplay}
              </div>

              {/* Content Card */}
              <div
                className={`border p-5 transition-all ${
                  isRevealed
                    ? 'border-[#1b2129] bg-[#0c0f14]'
                    : 'border-[#141920] bg-[#07090c] opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-[#6b7280]">
                      EVENT #{event.id.replace('tl-', '')}
                    </span>
                    <span className="text-[#1b2129] font-mono">|</span>
                    <span className="font-mono text-xs text-[#9ca3af]">
                      NODE: {chId.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    {isRevealed ? (
                      <span className="inline-flex items-center space-x-1 font-mono text-xs font-bold text-[#ccff00]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>RECONSTRUCTED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 font-mono text-xs text-gray-500">
                        <Lock className="h-3.5 w-3.5" />
                        <span>ENCRYPTED EVENT</span>
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-2 font-sans text-lg font-bold text-white">
                  {isRevealed ? event.title : 'CLASSIFIED BREACH TELEMETRY'}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-[#9ca3af]">
                  {isRevealed
                    ? summaryText
                    : 'Solve the associated challenge in the War Room to decrypt this moment in the attack chain.'}
                </p>

                {isRevealed && event.evidenceUnlocked && (
                  <div className="mt-4 border-t border-[#1b2129] pt-3 flex items-center justify-between font-mono text-xs">
                    <span className="text-[#6b7280]">EVIDENCE:</span>
                    <span className="text-[#00f0ff]">{event.evidenceUnlocked}</span>
                  </div>
                )}

                {!isRevealed && associatedCh && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setSelectedChallenge(associatedCh);
                        setActiveView('warroom');
                      }}
                      className="inline-flex items-center space-x-1 font-mono text-xs text-[#ccff00] hover:underline"
                    >
                      <span>GO TO {associatedCh.title.toUpperCase()}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
