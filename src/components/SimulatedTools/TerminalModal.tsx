import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Terminal as TerminalIcon, CornerDownLeft, Trash2 } from 'lucide-react';

export const TerminalModal: React.FC = () => {
  const { activeSimulatedTool, activeToolParams, closeSimulatedTool, team } = useApp();
  const [history, setHistory] = useState<Array<{ cmd: string; output: string }>>([
    {
      cmd: 'init',
      output: `ASTRA // ECHO VIRTUAL WORKSTATION v2.6 (KMCT Cyber Range)
Session initialized. Safe sandbox active. Type 'help' for available commands.`,
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeSimulatedTool === 'terminal' && activeToolParams?.command) {
      handleRunCommand(activeToolParams.command);
    }
  }, [activeSimulatedTool, activeToolParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (activeSimulatedTool !== 'terminal') return null;

  const handleRunCommand = async (cmdToRun: string) => {
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
        body: JSON.stringify({ command: trimmed }),
      });
      const data = await res.json();
      setHistory((prev) => [...prev, { cmd: trimmed, output: data.output || '' }]);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div 
        id="simulated-terminal-dialog"
        className="flex h-[80vh] w-full max-w-4xl flex-col border border-[#1b2129] bg-[#07090b] shadow-2xl"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between border-b border-[#1b2129] bg-[#0d1015] px-4 py-2.5">
          <div className="flex items-center space-x-2">
            <TerminalIcon className="h-4 w-4 text-[#ccff00]" />
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              ECHO TERMINAL // {team ? team.name : 'OPERATOR'}@kmct-range
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setHistory([])}
              title="Clear display"
              className="text-[#9ca3af] hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={closeSimulatedTool}
              className="text-[#9ca3af] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Commands Strip */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#1b2129] bg-[#0a0d11] px-4 py-1.5 font-mono text-[11px]">
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

        {/* Terminal Screen */}
        <div 
          onClick={() => inputRef.current?.focus()}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs text-[#d1d5db] scanline selection:bg-[#ccff00] selection:text-black"
        >
          {history.map((item, idx) => (
            <div key={idx} className="mb-3 space-y-1">
              {item.cmd !== 'init' && (
                <div className="flex items-center space-x-2 text-[#ccff00]">
                  <span className="text-[#6b7280]">&gt;</span>
                  <span className="font-bold">{item.cmd}</span>
                </div>
              )}
              <pre className="whitespace-pre-wrap leading-relaxed text-[#e5e7eb]">
                {item.output}
              </pre>
            </div>
          ))}

          {/* Active Input Line */}
          <div className="flex items-center space-x-2 pt-2">
            <span className="text-[#ccff00]">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Type command here..."
              className="flex-1 bg-transparent font-mono text-xs text-white placeholder-gray-600 focus:outline-none"
              autoFocus
            />
            {loading && <span className="animate-spin text-[#ccff00]">/</span>}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="border-t border-[#1b2129] bg-[#0d1015] px-4 py-1.5 font-mono text-[10px] text-[#6b7280] flex justify-between">
          <span>SANDBOXED OS SIMULATION · NON-DESTRUCTIVE</span>
          <span>PRESS ENTER TO EXECUTE</span>
        </div>
      </div>
    </div>
  );
};
