import React from 'react';
import { useApp } from '../context/AppContext';
import { Award, Lock, CheckCircle2, Zap, Shield, Eye, Flame } from 'lucide-react';

export const AchievementsView: React.FC = () => {
  const { achievements, team } = useApp();

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 border-b border-[#1b2129] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 font-mono text-xs text-[#ccff00]">
              <Award className="h-4 w-4" />
              <span>FIELD ACCOLADES // OPERATIONAL MERIT BADGES</span>
            </div>
            <h1 className="mt-2 font-sans text-3xl font-black tracking-tight text-[#f3f4f6] sm:text-4xl">
              INVESTIGATION ACHIEVEMENTS
            </h1>
            <p className="mt-1 text-sm text-[#9ca3af]">
              Commendations awarded for tactical breakthroughs, forensic precision, and anomaly handling.
            </p>
          </div>

          <div className="border border-[#1b2129] bg-[#0c0f14] p-3 text-right font-mono text-xs">
            <span className="text-[#6b7280]">UNLOCKED BADGES:</span>
            <div className="text-xl font-bold text-[#ccff00]">
              {unlockedCount} <span className="text-xs text-gray-500">/ {achievements.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Badges */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((ach) => {
          const isUnlocked = ach.unlocked;

          return (
            <div
              key={ach.id}
              className={`relative border p-5 transition-all ${
                isUnlocked
                  ? 'border-[#ccff00]/50 bg-[#0d1310]'
                  : 'border-[#1b2129] bg-[#080a0d] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#6b7280]">
                  {ach.id.toUpperCase()}
                </span>
                {isUnlocked ? (
                  <span className="inline-flex items-center space-x-1 font-mono text-xs font-bold text-[#ccff00]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>AWARDED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 font-mono text-xs text-[#6b7280]">
                    <Lock className="h-3.5 w-3.5" />
                    <span>LOCKED</span>
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center space-x-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center border font-mono text-lg font-black ${
                    isUnlocked
                      ? 'border-[#ccff00] bg-[#ccff00]/10 text-[#ccff00]'
                      : 'border-[#1b2129] bg-[#0f141a] text-[#4b5563]'
                  }`}
                >
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-white">
                    {ach.title}
                  </h3>
                  <div className="font-mono text-[10px] text-[#ccff00]">
                    +{ach.pointsAwarded} BONUS PTS
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[#9ca3af]">
                {ach.description}
              </p>

              {isUnlocked && ach.unlockedAt && (
                <div className="mt-4 border-t border-[#1b2129] pt-2 font-mono text-[10px] text-[#6b7280]">
                  AWARDED AT: {ach.unlockedAt}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
