import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SimulatedFileItem } from '../../types';
import { X, Folder, FileText, ChevronRight, Eye, EyeOff, Lock, HardDrive } from 'lucide-react';

export const FileExplorerModal: React.FC = () => {
  const { activeSimulatedTool, activeToolParams, closeSimulatedTool } = useApp();
  const [fileTree, setFileTree] = useState<SimulatedFileItem[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('/incident');
  const [selectedFile, setSelectedFile] = useState<SimulatedFileItem | null>(null);

  useEffect(() => {
    if (activeSimulatedTool === 'files') {
      fetch('/api/simulated/files')
        .then((res) => res.json())
        .then((data) => {
          setFileTree(data.root || []);
          if (activeToolParams?.path) {
            setCurrentPath(activeToolParams.path);
          }
        });
    }
  }, [activeSimulatedTool, activeToolParams]);

  if (activeSimulatedTool !== 'files') return null;

  // Flatten or resolve items for current directory
  const getItemsInPath = (): SimulatedFileItem[] => {
    const incidentDir = fileTree.find((item) => item.name === 'incident');
    if (!incidentDir || !incidentDir.children) return [];

    let items = incidentDir.children;

    // Check if browsing into .hidden
    if (currentPath.includes('.hidden')) {
      const hiddenDir = incidentDir.children.find((i) => i.name === '.hidden');
      return hiddenDir?.children || [];
    }

    if (!showHidden) {
      items = items.filter((i) => !i.name.startsWith('.'));
    }

    return items;
  };

  const currentItems = getItemsInPath();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div 
        id="simulated-files-dialog"
        className="flex h-[80vh] w-full max-w-5xl flex-col border border-[#1b2129] bg-[#07090b] shadow-2xl"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between border-b border-[#1b2129] bg-[#0d1015] px-4 py-2.5">
          <div className="flex items-center space-x-2">
            <HardDrive className="h-4 w-4 text-[#38bdf8]" />
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              FILESYSTEM CARVER // VOLUME: /dev/sda2 (EXT4)
            </span>
          </div>
          <button onClick={closeSimulatedTool} className="text-[#9ca3af] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Path & Options Bar */}
        <div className="flex items-center justify-between border-b border-[#1b2129] bg-[#0a0d11] px-4 py-2">
          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="text-[#6b7280]">PATH:</span>
            <button
              onClick={() => setCurrentPath('/incident')}
              className="text-[#38bdf8] hover:underline"
            >
              /incident
            </button>
            {currentPath.includes('.hidden') && (
              <>
                <ChevronRight className="h-3 w-3 text-[#6b7280]" />
                <span className="text-[#ccff00]">.hidden</span>
              </>
            )}
          </div>

          <button
            id="toggle-hidden-files-btn"
            onClick={() => setShowHidden(!showHidden)}
            className="flex items-center space-x-1.5 border border-[#1b2129] bg-[#12161d] px-2.5 py-1 font-mono text-[11px] text-[#9ca3af] hover:border-[#ccff00] hover:text-white"
          >
            {showHidden ? <Eye className="h-3.5 w-3.5 text-[#ccff00]" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>{showHidden ? 'SHOWING HIDDEN (ls -a)' : 'HIDE HIDDEN'}</span>
          </button>
        </div>

        {/* File Browser Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* File Grid */}
          <div className="w-1/2 border-r border-[#1b2129] bg-[#090c10] overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {currentPath.includes('.hidden') && (
                <div
                  onClick={() => setCurrentPath('/incident')}
                  className="flex items-center space-x-2 border border-[#1b2129] bg-[#0e1217] p-3 cursor-pointer hover:border-[#38bdf8]"
                >
                  <Folder className="h-5 w-5 text-[#38bdf8]" />
                  <div className="font-mono text-xs text-white">.. (Parent Dir)</div>
                </div>
              )}

              {currentItems.map((item) => {
                const isDir = item.type === 'dir';
                const isSelected = selectedFile?.name === item.name;

                return (
                  <div
                    key={item.name}
                    onClick={() => {
                      if (isDir) {
                        setCurrentPath(`/incident/${item.name}`);
                      } else {
                        setSelectedFile(item);
                      }
                    }}
                    className={`flex items-start space-x-2.5 border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#ccff00] bg-[#ccff00]/10 text-white'
                        : 'border-[#1b2129] bg-[#0e1217] hover:border-[#38bdf8]/60 text-[#d1d5db]'
                    }`}
                  >
                    {isDir ? (
                      <Folder className="h-5 w-5 text-[#38bdf8] flex-shrink-0 mt-0.5" />
                    ) : (
                      <FileText className="h-5 w-5 text-[#a3e635] flex-shrink-0 mt-0.5" />
                    )}

                    <div className="overflow-hidden">
                      <div className="font-mono text-xs font-bold truncate">
                        {item.name}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-[#6b7280]">
                        {item.size} · {item.permissions}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* File Inspector Preview Pane */}
          <div className="flex-1 bg-[#07090b] p-6 overflow-y-auto flex flex-col">
            {selectedFile ? (
              <div className="space-y-4">
                <div className="border border-[#1b2129] bg-[#0c0f14] p-3 font-mono text-xs text-[#9ca3af]">
                  <div className="text-white font-bold mb-1">
                    INSPECTING: {selectedFile.name}
                  </div>
                  <div>PATH: {selectedFile.path}</div>
                  <div>SIZE: {selectedFile.size} | PERMS: {selectedFile.permissions}</div>
                </div>

                <div className="border border-[#1b2129] bg-[#050709] p-4 font-mono text-xs leading-relaxed text-[#ccff00] whitespace-pre-wrap selection:bg-[#ccff00] selection:text-black">
                  {selectedFile.content || '[EMPTY OR BINARY OBJECT]'}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-xs text-[#6b7280]">
                Click a file on the left to inspect carved sector data
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1b2129] bg-[#0d1015] px-4 py-1.5 font-mono text-[10px] text-[#6b7280] flex justify-between">
          <span>FORENSIC FILE EXTRACTION MODULE</span>
          <span>KMCT DIGITAL INVESTIGATION LAB</span>
        </div>
      </div>
    </div>
  );
};
