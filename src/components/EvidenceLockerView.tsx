import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EvidenceArtifact } from '../types';
import { FolderLock, Shield, Search, Hash, Clock, FileText, Cpu, Database, Eye } from 'lucide-react';

export const EvidenceLockerView: React.FC = () => {
  const { evidence, challenges, setActiveView, setSelectedChallenge } = useApp();
  const [selectedArtifact, setSelectedArtifact] = useState<EvidenceArtifact | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredEvidence = typeFilter === 'ALL' 
    ? evidence 
    : evidence.filter((e) => e.type === typeFilter);

  const getTypeBadgeColor = (type: EvidenceArtifact['type']) => {
    switch (type) {
      case 'DOCUMENT': return '#38bdf8';
      case 'NETWORK_DUMP': return '#a78bfa';
      case 'CRYPTOGRAPHIC_KEY': return '#00f0ff';
      case 'MEMORY_SLICE': return '#f43f5e';
      case 'IDENTITY_RECORD': return '#4ade80';
      case 'SYSTEM_CORE': return '#ccff00';
      default: return '#ccff00';
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 border-b border-[#1b2129] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 font-mono text-xs text-[#ccff00]">
              <FolderLock className="h-4 w-4" />
              <span>FORENSIC RECONSTRUCTION // CHAIN OF CUSTODY</span>
            </div>
            <h1 className="mt-2 font-sans text-3xl font-black tracking-tight text-[#f3f4f6] sm:text-4xl">
              EVIDENCE LOCKER
            </h1>
            <p className="mt-1 text-sm text-[#9ca3af]">
              Recovered cryptographic fragments, memory dumps, and intelligence logs from the 03:12 breach.
            </p>
          </div>

          <div className="border border-[#1b2129] bg-[#0c0f14] p-3 text-right font-mono text-xs">
            <span className="text-[#6b7280]">ACCUMULATED ARTIFACTS:</span>
            <div className="text-xl font-bold text-[#ccff00]">
              {evidence.length} <span className="text-xs text-gray-500">/ 18 RECOVERED</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {['ALL', 'DOCUMENT', 'NETWORK_DUMP', 'CRYPTOGRAPHIC_KEY', 'MEMORY_SLICE', 'IDENTITY_RECORD', 'SYSTEM_CORE'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 font-mono text-[11px] uppercase transition-all ${
                typeFilter === t
                  ? 'border border-[#ccff00] bg-[#ccff00] font-bold text-black'
                  : 'border border-[#1b2129] bg-[#0e1217] text-[#9ca3af] hover:text-white'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Investigation Board Layout */}
      {evidence.length === 0 ? (
        <div className="border border-dashed border-[#1b2129] p-16 text-center">
          <FolderLock className="h-12 w-12 text-[#6b7280] mx-auto mb-4" />
          <h3 className="font-sans text-lg font-bold text-white">No evidence artifacts recovered yet</h3>
          <p className="mt-2 max-w-md mx-auto text-sm text-[#9ca3af]">
            Begin by investigating Node 01 (THE SIGNAL) in the War Room. Each submitted flag secures verified evidence into this vault.
          </p>
          <button
            onClick={() => setActiveView('warroom')}
            className="mt-6 border border-[#ccff00] bg-[#ccff00] px-5 py-2.5 font-mono text-xs font-bold text-black hover:bg-transparent hover:text-[#ccff00] transition-all"
          >
            OPEN WAR ROOM →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Artifact Cards Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredEvidence.map((art) => {
              const isSelected = selectedArtifact?.id === art.id;
              const color = getTypeBadgeColor(art.type);

              return (
                <div
                  key={art.id}
                  id={`evidence-${art.id}`}
                  onClick={() => setSelectedArtifact(art)}
                  className={`group relative cursor-pointer border p-5 transition-all ${
                    isSelected
                      ? 'border-[#ccff00] bg-[#0f141a]'
                      : 'border-[#1b2129] bg-[#0a0d11] hover:border-[#ccff00]/50 hover:bg-[#0e1217]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#ccff00]">
                      {art.artifactNumber}
                    </span>
                    <span
                      className="border px-2 py-0.5 font-mono text-[9px] font-bold uppercase"
                      style={{ borderColor: `${color}40`, color, backgroundColor: `${color}10` }}
                    >
                      {art.type.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="mt-3 font-sans text-base font-bold text-white group-hover:text-[#ccff00]">
                    {art.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 font-mono text-xs text-[#9ca3af]">
                    {art.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-[#1b2129] pt-3 font-mono text-[10px] text-[#6b7280]">
                    <span>{art.sourceNodeTitle}</span>
                    <span>{art.recoveredAt}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Forensic Inspector Column */}
          <div className="lg:col-span-5">
            {selectedArtifact ? (
              <div className="sticky top-20 border border-[#1b2129] bg-[#0c0f14] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#1b2129] pb-3">
                  <div className="font-mono text-xs text-[#ccff00] font-bold">
                    {selectedArtifact.artifactNumber} // EVIDENCE DETAIL
                  </div>
                  <span
                    className="border px-2 py-0.5 font-mono text-[10px] font-bold"
                    style={{ borderColor: getTypeBadgeColor(selectedArtifact.type), color: getTypeBadgeColor(selectedArtifact.type) }}
                  >
                    {selectedArtifact.type.replace('_', ' ')}
                  </span>
                </div>

                <h2 className="font-sans text-xl font-bold text-white">
                  {selectedArtifact.title}
                </h2>

                <p className="text-sm leading-relaxed text-[#d1d5db]">
                  {selectedArtifact.description}
                </p>

                <div className="border border-[#1b2129] bg-[#07090b] p-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-[#9ca3af]">
                    <span>RECOVERED:</span>
                    <span className="text-white">{selectedArtifact.recoveredAt}</span>
                  </div>
                  <div className="flex justify-between text-[#9ca3af]">
                    <span>SOURCE NODE:</span>
                    <span className="text-[#ccff00]">{selectedArtifact.sourceNodeTitle}</span>
                  </div>
                  <div className="text-[#9ca3af] break-all">
                    <span>HASH:</span>
                    <span className="text-[#00f0ff] block mt-0.5">{selectedArtifact.hash}</span>
                  </div>
                </div>

                {/* Raw Preview Data */}
                <div>
                  <span className="font-mono text-xs font-bold text-[#9ca3af] block mb-2">
                    EXTRACTED TELEMETRY BUFFER:
                  </span>
                  <div className="border border-[#1b2129] bg-[#050709] p-3 font-mono text-xs text-[#a3e635] break-all whitespace-pre-wrap selection:bg-[#ccff00] selection:text-black">
                    {selectedArtifact.previewData}
                  </div>
                </div>

                {/* Signature mechanic note */}
                <div className="border-l-2 border-[#ccff00] bg-[#090d12] p-3 font-mono text-[11px] text-[#9ca3af]">
                  <span className="text-[#ccff00] font-bold">ECHO MEMORY &gt;</span> This evidence artifact may be required to solve advanced correlation nodes like Split Key (Ch 08) or Evidence Merge (Ch 15).
                </div>
              </div>
            ) : (
              <div className="border border-[#1b2129] bg-[#0c0f14] p-8 text-center font-mono text-xs text-[#6b7280]">
                Select an artifact from the investigation board to inspect full forensic metadata
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
