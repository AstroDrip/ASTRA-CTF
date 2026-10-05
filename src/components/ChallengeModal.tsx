import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Challenge } from '../types';
import { 
  X, 
  Terminal, 
  Mail, 
  FileText, 
  Globe, 
  Radio, 
  Lock, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  ShieldCheck 
} from 'lucide-react';

export const ChallengeModal: React.FC = () => {
  const { 
    selectedChallenge, 
    setSelectedChallenge, 
    team, 
    submitFlag, 
    unlockHint, 
    openSimulatedTool, 
    openAuthModal 
  } = useApp();

  const [flagInput, setFlagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [pendingHintId, setPendingHintId] = useState<number | null>(null);
  const [unlockingHint, setUnlockingHint] = useState(false);

  // Close with Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedChallenge) {
        setSelectedChallenge(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChallenge, setSelectedChallenge]);

  React.useEffect(() => {
    setFlagInput('');
    setSubmissionFeedback(null);
    setPendingHintId(null);
  }, [selectedChallenge?.id]);

  if (!selectedChallenge) return null;

  const ch = selectedChallenge;
  const isSolved = ch.isSolved;
  const isLocked = ch.isLocked;
  const hintPenalty = ch.hints.reduce((total, hint) => total + (hint.unlocked ? hint.cost : 0), 0);
  const chapterReward = Math.max(0, ch.points - hintPenalty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) {
      openAuthModal('login');
      return;
    }
    if (!flagInput.trim()) return;

    setSubmitting(true);
    setSubmissionFeedback(null);

    try {
      const res = await submitFlag(ch.id, flagInput);
      if (res.correct) {
        setSubmissionFeedback({
          type: 'success',
          message: res.message || 'FLAG ACCEPTED! Evidence recovered.',
        });
        setFlagInput('');
      } else {
        setSubmissionFeedback({
          type: 'error',
          message: res.message || 'FLAG REJECTED. Invalid token.',
        });
      }
    } catch (err: any) {
      setSubmissionFeedback({
        type: 'error',
        message: err.message || 'Submission error.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmHint = async () => {
    if (!pendingHintId) return;
    setUnlockingHint(true);
    try {
      const hintContent = await unlockHint(ch.id, pendingHintId);
      setSelectedChallenge((current) => {
        if (!current || current.id !== ch.id) return current;
        return {
          ...current,
          hints: current.hints.map((hint) =>
            hint.id === pendingHintId
              ? { ...hint, content: hintContent, unlocked: true }
              : hint,
          ),
        };
      });
      setPendingHintId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to decrypt hint');
    } finally {
      setUnlockingHint(false);
    }
  };

  const handleOpenSuggestedTool = () => {
    const tool = ch.investigationMaterial?.suggestedTool;
    const params = ch.investigationMaterial?.toolParams;
    if (tool) {
      openSimulatedTool(tool, params);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedChallenge(null);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-sm cursor-pointer"
    >
      <div 
        id="challenge-workstation-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] border border-[#1b2129] bg-[#090c10] shadow-2xl overflow-hidden cursor-default"
      >
        {/* Header - Stays fixed and always visible at the top */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#1b2129] bg-[#0e1217] px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-bold text-[#ccff00]">
              NODE_{ch.nodeIndex < 10 ? `0${ch.nodeIndex}` : ch.nodeIndex}
            </span>
            <span className="font-mono text-xs text-[#6b7280]">//</span>
            <span className="font-mono text-xs font-semibold text-[#00f0ff]">
              {ch.category}
            </span>
            <span className="font-mono text-xs text-[#6b7280]">[{ch.difficulty} · {ch.difficultyRating}/7]</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="font-mono text-sm font-bold text-[#ccff00]">
              +{chapterReward} PTS
              {hintPenalty > 0 && <span className="ml-1 text-[10px] text-[#9ca3af]">({hintPenalty} HINT PENALTY)</span>}
            </div>
            <button
              id="close-challenge-btn"
              onClick={() => setSelectedChallenge(null)}
              className="text-[#9ca3af] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Challenge Title */}
          <div>
            <h2 className="font-sans text-2xl font-bold tracking-tight text-[#f3f4f6] sm:text-3xl">
              {ch.title}
            </h2>
            {isSolved && (
              <div className="mt-2 inline-flex items-center space-x-1.5 border border-[#ccff00]/40 bg-[#ccff00]/10 px-2.5 py-1 font-mono text-xs font-bold text-[#ccff00]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>NODE CLEARED & EVIDENCE LOCKED</span>
              </div>
            )}
            {isLocked && (
              <div className="mt-2 inline-flex items-center space-x-1.5 border border-red-500/40 bg-red-500/10 px-2.5 py-1 font-mono text-xs font-bold text-red-400">
                <Lock className="h-3.5 w-3.5" />
                <span>LOCKED // PREREQUISITES REQUIRED</span>
              </div>
            )}
          </div>

          {/* Narrative & Field Story */}
          <div className="border-l-2 border-[#ccff00] bg-[#0d1117] p-4 text-sm leading-relaxed text-[#d1d5db]">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#ccff00]">
              INVESTIGATION DISPATCH
            </p>
            <p className="mt-1">{ch.story}</p>
          </div>

          {/* Investigation Material */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold tracking-wider text-[#9ca3af]">
                INVESTIGATION ARTIFACTS & EVIDENCE
              </span>
              {ch.investigationMaterial?.suggestedTool && (
                <button
                  id="launch-suggested-tool-btn"
                  onClick={handleOpenSuggestedTool}
                  className="flex items-center space-x-1.5 border border-[#ccff00]/40 bg-[#ccff00]/10 px-3 py-1 font-mono text-xs text-[#ccff00] hover:bg-[#ccff00] hover:text-black transition-all"
                >
                  <Terminal className="h-3 w-3" />
                  <span>LAUNCH {ch.investigationMaterial.suggestedTool.toUpperCase()} →</span>
                </button>
              )}
            </div>

            <p className="text-xs text-[#9ca3af]">
              {ch.investigationMaterial?.overview}
            </p>

            {ch.investigationMaterial?.rawTextSnippet && (
              <div className="relative border border-[#1b2129] bg-[#050709] p-3 font-mono text-xs text-[#a3e635] overflow-x-auto selection:bg-[#ccff00] selection:text-black">
                <pre className="whitespace-pre">{ch.investigationMaterial.rawTextSnippet}</pre>
              </div>
            )}
          </div>

          {/* Direct Simulated Tool Launchers */}
          <div className="border border-[#1b2129] bg-[#0c0f14] p-3">
            <span className="font-mono text-[10px] text-[#6b7280] uppercase tracking-widest block mb-2">
              Virtual Sandboxed Instruments:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openSimulatedTool('terminal', ch.investigationMaterial?.toolParams)}
                className="flex items-center space-x-1.5 border border-[#1b2129] bg-[#12161d] px-2.5 py-1 font-mono text-xs text-[#e5e7eb] hover:border-[#ccff00]"
              >
                <Terminal className="h-3 w-3 text-[#ccff00]" />
                <span>SHELL</span>
              </button>
              <button
                onClick={() => openSimulatedTool('mailbox')}
                className="flex items-center space-x-1.5 border border-[#1b2129] bg-[#12161d] px-2.5 py-1 font-mono text-xs text-[#e5e7eb] hover:border-[#ccff00]"
              >
                <Mail className="h-3 w-3 text-[#00f0ff]" />
                <span>MAILBOX</span>
              </button>
              <button
                onClick={() => openSimulatedTool('network')}
                className="flex items-center space-x-1.5 border border-[#1b2129] bg-[#12161d] px-2.5 py-1 font-mono text-xs text-[#e5e7eb] hover:border-[#ccff00]"
              >
                <Radio className="h-3 w-3 text-[#a78bfa]" />
                <span>PACKET DUMP</span>
              </button>
              <button
                onClick={() => openSimulatedTool('files')}
                className="flex items-center space-x-1.5 border border-[#1b2129] bg-[#12161d] px-2.5 py-1 font-mono text-xs text-[#e5e7eb] hover:border-[#ccff00]"
              >
                <FileText className="h-3 w-3 text-[#38bdf8]" />
                <span>FILES (/incident)</span>
              </button>
              <button
                onClick={() => openSimulatedTool('portal')}
                className="flex items-center space-x-1.5 border border-[#1b2129] bg-[#12161d] px-2.5 py-1 font-mono text-xs text-[#e5e7eb] hover:border-[#ccff00]"
              >
                <Globe className="h-3 w-3 text-[#fb923c]" />
                <span>WEB PORTALS</span>
              </button>
            </div>
          </div>

          {/* Progressive Hint Decryptor */}
          <div className="border border-[#1b2129] bg-[#0a0d11] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center space-x-1.5 font-mono text-xs font-bold text-[#f3f4f6]">
                <HelpCircle className="h-4 w-4 text-[#ccff00]" />
                <span>PROGRESSIVE HINTS ({ch.hints.length})</span>
              </span>
              <span className="font-mono text-[10px] text-[#6b7280]">
                CHAPTER REWARD PENALTY: −25 / −50 / −75 PTS
              </span>
            </div>

            <div className="space-y-2">
              {ch.hints.map((h, idx) => {
                const isUnlocked = h.unlocked;
                return (
                  <div 
                    key={h.id}
                    className={`border p-3 ${
                      isUnlocked 
                        ? 'border-[#ccff00]/30 bg-[#ccff00]/5' 
                        : 'border-[#1b2129] bg-[#07090b]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#ccff00]">
                        HINT 0{idx + 1}
                      </span>
                      {!isUnlocked && !isSolved ? (
                        <button
                          id={`unlock-hint-${h.id}-btn`}
                          onClick={() => setPendingHintId(h.id)}
                          className="border border-[#1b2129] bg-[#12161d] px-2.5 py-1 font-mono text-[11px] text-[#f43f5e] hover:border-[#f43f5e]"
                        >
                          DECRYPT (−{h.cost} ON SOLVE)
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] text-[#ccff00]">
                          [DECRYPTED]
                        </span>
                      )}
                    </div>
                    {isUnlocked && (
                      <p className="mt-2 text-xs leading-relaxed text-[#e5e7eb] font-mono">
                        {h.content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hint Confirmation Prompt */}
            {pendingHintId && (
              <div className="mt-3 border border-[#f43f5e]/50 bg-[#f43f5e]/10 p-3">
                <p className="font-mono text-xs text-[#f3f4f6]">
                  CONFIRM DECRYPTION: This penalty will reduce this chapter's reward when solved. Continue?
                </p>
                <div className="mt-2 flex space-x-2">
                  <button
                    id="confirm-hint-btn"
                    onClick={handleConfirmHint}
                    disabled={unlockingHint}
                    className="border border-[#f43f5e] bg-[#f43f5e] px-3 py-1 font-mono text-xs font-bold text-white"
                  >
                    {unlockingHint ? 'DECRYPTING...' : 'YES, APPLY CHAPTER PENALTY'}
                  </button>
                  <button
                    onClick={() => setPendingHintId(null)}
                    className="border border-[#1b2129] bg-[#12161d] px-3 py-1 font-mono text-xs text-[#9ca3af]"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Flag Submission Form */}
          <div className="border border-[#1b2129] bg-[#0c0f14] p-4">
            <span className="font-mono text-xs font-bold tracking-wider text-[#9ca3af] block mb-2">
              SUBMIT INVESTIGATION FLAG
            </span>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input
                  id="flag-submission-input"
                  type="text"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  placeholder="ASTRA{...}"
                  disabled={submitting}
                  className="flex-1 border border-[#1b2129] bg-[#050709] px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:border-[#ccff00] focus:outline-none"
                />
                <button
                  id="submit-flag-btn"
                  type="submit"
                  disabled={submitting || !flagInput.trim()}
                  className="border border-[#ccff00] bg-[#ccff00] px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-transparent hover:text-[#ccff00] disabled:opacity-40 transition-all"
                >
                  {submitting ? 'VALIDATING...' : 'SUBMIT FLAG'}
                </button>
              </div>

              {/* Feedback */}
              {submissionFeedback && (
                <div
                  className={`p-3 font-mono text-xs border ${
                    submissionFeedback.type === 'success'
                      ? 'border-[#ccff00] bg-[#ccff00]/10 text-[#ccff00]'
                      : 'border-[#f43f5e] bg-[#f43f5e]/10 text-[#f43f5e]'
                  }`}
                >
                  {submissionFeedback.message}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
