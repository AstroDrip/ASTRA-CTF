import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Terminal as TerminalIcon, Trash2, Copy, Check, CornerDownLeft } from 'lucide-react';

export const TerminalModal: React.FC = () => {
  const { activeSimulatedTool, activeToolParams, closeSimulatedTool, team } = useApp();
  const [history, setHistory] = useState<Array<{ cmd: string; output: string; copied?: boolean }>>([
    {
      cmd: 'init',
      output: `ASTRA // ECHO VIRTUAL WORKSTATION v2.6 (KMCT Cyber Range)
Session initialized. Safe sandbox active. Type 'help' for available commands.`,
    },
  ]);
  const [cwd, setCwd] = useState('/home/investigator');
  const [inputVal, setInputVal] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeSimulatedTool === 'terminal') {
      setCwd('/home/investigator');
      if (activeToolParams?.command) {
        handleRunCommand(activeToolParams.command, '/home/investigator');
      }
    }
  }, [activeSimulatedTool, activeToolParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (activeSimulatedTool !== 'terminal') return null;

  const handleRunCommand = async (cmdToRun: string, commandCwd = cwd) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;

    if (trimmed === 'clear') {
      setHistory([]);
      setInputVal('');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/simulated/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed, cwd: commandCwd }),
      });
      const data = await res.json();
      setHistory((prev) => [...prev, { cmd: trimmed, output: data.output || '' }]);
      if (typeof data.cwd === 'string') setCwd(data.cwd);
      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
    } catch {
      setHistory((prev) => [...prev, { cmd: trimmed, output: 'astra-sh: network telemetry error' }]);
    } finally {
      setLoading(false);
      setInputVal('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRunCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      if (commandHistory.length > 0) {
        const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < commandHistory.length) {
          setHistoryIndex(nextIdx);
          setInputVal(commandHistory[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setInputVal('');
        }
      }
    }
  };

  const handleQuickCmd = (cmd: string) => {
    handleRunCommand(cmd);
  };

  const copyToClipboard = async (text: string, idx?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (typeof idx === 'number') {
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
      } else {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      }
    } catch {
      // Fallback for older browsers / iframe restrictions
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        if (typeof idx === 'number') {
          setCopiedIdx(idx);
          setTimeout(() => setCopiedIdx(null), 2000);
        } else {
          setCopiedAll(true);
          setTimeout(() => setCopiedAll(false), 2000);
        }
      } catch (e) {
        console.error('Copy failed:', e);
      }
      document.body.removeChild(textarea);
    }
  };

  const handleCopyAllOutput = () => {
    const fullText = history.map((item) => `${item.cmd !== 'init' ? '> ' + item.cmd + '\n' : ''}${item.output}`).join('\n\n');
    copyToClipboard(fullText);
  };

  const handleScreenClick = (e: React.MouseEvent) => {
    // Only focus input if user is not currently selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }
    // Ignore clicks on buttons or copy controls
    if ((e.target as HTMLElement).closest('button, input, a')) {
      return;
    }
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div 
        id="simulated-terminal-dialog"
        className="flex h-[80vh] w-full max-w-4xl flex-col border border-[#1b2129] bg-[#07090b] shadow-2xl overflow-hidden"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between border-b border-[#1b2129] bg-[#0d1015] px-4 py-2.5 select-none">
          <div className="flex items-center space-x-2">
            <TerminalIcon className="h-4 w-4 text-[#ccff00]" />
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              ECHO TERMINAL // {team ? team.name : 'OPERATOR'}@kmct-range
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyAllOutput}
              title="Copy entire terminal log"
              className="flex items-center space-x-1 rounded border border-[#1b2129] bg-[#12161f] px-2 py-1 font-mono text-[10px] text-[#9ca3af] hover:border-[#ccff00]/40 hover:text-white transition-colors"
            >
              {copiedAll ? (
                <>
                  <Check className="h-3 w-3 text-[#ccff00]" />
                  <span className="text-[#ccff00]">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>COPY ALL</span>
                </>
              )}
            </button>

            <button
              onClick={() => setHistory([])}
              title="Clear display"
              className="rounded p-1 text-[#9ca3af] hover:bg-[#1b2129] hover:text-white transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={closeSimulatedTool}
              className="rounded p-1 text-[#9ca3af] hover:bg-[#1b2129] hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Commands Strip */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#1b2129] bg-[#0a0d11] px-4 py-1.5 font-mono text-[11px] select-none">
          <span className="text-[#6b7280]">SHORTCUTS:</span>
          <button onClick={() => handleQuickCmd('help')} className="text-[#ccff00] hover:underline">
            help
          </button>
          <span className="text-[#1b2129]">|</span>
          <button onClick={() => handleQuickCmd('ls -la /incident')} className="text-[#9ca3af] hover:text-white">
            ls -la /incident
          </button>
          <span className="text-[#1b2129]">|</span>
          <button onClick={() => handleQuickCmd('cat /var/log/beacon.raw')} className="text-[#9ca3af] hover:text-white">
            cat beacon.raw
          </button>
          <span className="text-[#1b2129]">|</span>
          <button onClick={() => handleQuickCmd('cat /incident/.hidden/sector_recovery.txt')} className="text-[#9ca3af] hover:text-white">
            cat sector_recovery
          </button>
          <span className="text-[#1b2129]">|</span>
          <button onClick={() => handleQuickCmd('strings /memory/dump.raw')} className="text-[#9ca3af] hover:text-white">
            strings dump.raw
          </button>
          <span className="text-[#1b2129]">|</span>
          <button onClick={() => handleQuickCmd('echo-quarantine --status')} className="text-[#f43f5e] hover:underline">
            echo-quarantine
          </button>
        </div>

        {/* Terminal Screen - Full native selection enabled */}
        <div 
          onClick={handleScreenClick}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs text-[#d1d5db] scanline selection:bg-[#ccff00] selection:text-black select-text cursor-text"
        >
          {history.map((item, idx) => (
            <div key={idx} className="group relative mb-3 space-y-1">
              {item.cmd !== 'init' && (
                <div className="flex items-center justify-between text-[#ccff00]">
                  <div className="flex items-center space-x-2">
                    <span className="text-[#6b7280] select-none">{cwd} &gt;</span>
                    <span className="font-bold select-text">{item.cmd}</span>
                  </div>
                  {/* Per-command quick copy button */}
                  {item.output && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item.output, idx);
                      }}
                      title="Copy output to clipboard"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center space-x-1 rounded bg-[#12161f] px-1.5 py-0.5 text-[10px] text-[#9ca3af] hover:text-[#ccff00] border border-[#1b2129] transition-opacity cursor-pointer select-none"
                    >
                      {copiedIdx === idx ? (
                        <>
                          <Check className="h-2.5 w-2.5 text-[#ccff00]" />
                          <span className="text-[#ccff00]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-2.5 w-2.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
              <pre className="whitespace-pre-wrap leading-relaxed text-[#e5e7eb] select-text font-mono">
                {item.output}
              </pre>
            </div>
          ))}

          {/* Active Input Line */}
          <div className="flex items-center space-x-2 pt-2 select-none">
            <span className="text-[#ccff00]">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Type command here..."
              className="flex-1 bg-transparent font-mono text-xs text-white placeholder-gray-600 focus:outline-none select-text cursor-text"
              autoFocus
            />
            {loading && <span className="animate-spin text-[#ccff00]">/</span>}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="border-t border-[#1b2129] bg-[#0d1015] px-4 py-1.5 font-mono text-[10px] text-[#6b7280] flex justify-between select-none">
          <span>SANDBOXED OS SIMULATION · TEXT SELECTION & COPY ENABLED</span>
          <span>PRESS ENTER TO EXECUTE</span>
        </div>
      </div>
    </div>
  );
};
