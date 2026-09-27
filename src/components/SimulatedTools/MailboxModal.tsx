import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SimulatedMail } from '../../types';
import { X, Mail, AlertCircle, FileText, ChevronRight, Inbox, ShieldCheck } from 'lucide-react';

export const MailboxModal: React.FC = () => {
  const { activeSimulatedTool, activeToolParams, closeSimulatedTool } = useApp();
  const [emails, setEmails] = useState<SimulatedMail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<SimulatedMail | null>(null);
  const [showRawHeaders, setShowRawHeaders] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeSimulatedTool === 'mailbox') {
      setLoading(true);
      fetch('/api/simulated/mailbox')
        .then((res) => res.json())
        .then((data) => {
          setEmails(data.emails || []);
          if (activeToolParams?.emailId) {
            const found = data.emails?.find((e: SimulatedMail) => e.id === activeToolParams.emailId);
            if (found) setSelectedEmail(found);
            else if (data.emails?.length > 0) setSelectedEmail(data.emails[0]);
          } else if (data.emails?.length > 0) {
            setSelectedEmail(data.emails[0]);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [activeSimulatedTool, activeToolParams]);

  if (activeSimulatedTool !== 'mailbox') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div 
        id="simulated-mailbox-dialog"
        className="flex h-[82vh] w-full max-w-5xl flex-col border border-[#1b2129] bg-[#07090b] shadow-2xl"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between border-b border-[#1b2129] bg-[#0d1015] px-4 py-2.5">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-[#00f0ff]" />
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              MAILBOX // INTERNAL CAMPUS SPOOL
            </span>
          </div>
          <button onClick={closeSimulatedTool} className="text-[#9ca3af] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mailbox Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Email List */}
          <div className="w-1/3 border-r border-[#1b2129] bg-[#0a0d11] overflow-y-auto">
            <div className="border-b border-[#1b2129] p-3 font-mono text-xs text-[#6b7280] flex items-center justify-between">
              <span>INBOX ({emails.length})</span>
              <Inbox className="h-3.5 w-3.5" />
            </div>

            <div className="divide-y divide-[#161c24]">
              {emails.map((m) => {
                const isSelected = selectedEmail?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedEmail(m)}
                    className={`cursor-pointer p-3 transition-colors ${
                      isSelected ? 'bg-[#121820] border-l-2 border-[#00f0ff]' : 'hover:bg-[#0e1217]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-[#e5e7eb] truncate max-w-[160px]">
                        {m.from}
                      </span>
                      {m.isFlagged && (
                        <span className="rounded bg-[#f43f5e]/20 px-1 font-mono text-[9px] text-[#f43f5e]">
                          ANOMALY
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-sans text-xs font-medium text-[#d1d5db] truncate">
                      {m.subject}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-[#6b7280]">
                      {m.date}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Message Detail Pane */}
          <div className="flex-1 bg-[#07090b] flex flex-col overflow-hidden">
            {selectedEmail ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Header Information */}
                <div className="border border-[#1b2129] bg-[#0d1015] p-4 font-mono text-xs">
                  <div className="flex justify-between items-start">
                    <h3 className="font-sans text-lg font-bold text-white mb-2">
                      {selectedEmail.subject}
                    </h3>
                    <button
                      onClick={() => setShowRawHeaders(!showRawHeaders)}
                      className="border border-[#1b2129] bg-[#12161d] px-2 py-1 text-[10px] text-[#00f0ff] hover:border-[#00f0ff]"
                    >
                      {showRawHeaders ? 'HIDE HEADERS' : 'INSPECT RAW HEADERS'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[#9ca3af] text-[11px]">
                    <div>FROM: <span className="text-[#e5e7eb]">{selectedEmail.from}</span></div>
                    <div>TO: <span className="text-[#e5e7eb]">{selectedEmail.to}</span></div>
                    <div>DATE: <span className="text-[#e5e7eb]">{selectedEmail.date}</span></div>
                    <div>ID: <span className="text-[#e5e7eb]">{selectedEmail.id}</span></div>
                  </div>

                  {/* Raw Header Drawer */}
                  {showRawHeaders && (
                    <div className="mt-3 border-t border-[#1b2129] pt-2 text-[10px] text-[#a3e635] bg-[#050709] p-2 overflow-x-auto">
                      <pre className="whitespace-pre">
{`Return-Path: <${selectedEmail.from}>
Received: from mx01.campus.local (mx01 [10.240.4.10])
X-Spam-Status: No, score=-1.0
Message-ID: <${selectedEmail.id}@mail.internal>
Content-Type: text/plain; charset=UTF-8
${selectedEmail.from.includes('unknown') ? 'X-Originating-IP: 198.51.100.42\nX-Agent-Identity: QVNURkF7YWdlbnRfZHJpZnRlcl91bm1hc2tlZH0=' : ''}
${selectedEmail.from.includes('spoofed-relay') ? 'DKIM-Signature: v=1; a=rsa-sha256; d=echo-transit.net; s=astra2026;\nX-Transit-Route-Tag: ASTRA{dkim_spoofed_transit_route}' : ''}`}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div className="border border-[#1b2129] bg-[#0b0e12] p-6 font-mono text-xs leading-relaxed text-[#e5e7eb] whitespace-pre-wrap selection:bg-[#00f0ff] selection:text-black">
                  {selectedEmail.body}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-xs text-[#6b7280]">
                Select an intercepted dispatch to review
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1b2129] bg-[#0d1015] px-4 py-1.5 font-mono text-[10px] text-[#6b7280] flex justify-between">
          <span>CAMPUS MX RECORD AUDIT // SIMULATED SECURE GATEWAY</span>
          <span>TLP:AMBER</span>
        </div>
      </div>
    </div>
  );
};
