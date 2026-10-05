import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Globe, Lock, Code, Shield, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export const WebPortalModal: React.FC = () => {
  const { activeSimulatedTool, activeToolParams, closeSimulatedTool } = useApp();
  const [activeTab, setActiveTab] = useState<'gateway' | 'audit' | 'regex'>('gateway');

  // Gateway state
  const [headerInput, setHeaderInput] = useState('');
  const [showSource, setShowSource] = useState(false);
  const [gatewayResult, setGatewayResult] = useState<string | null>(null);

  // Regex state
  const [regexInput, setRegexInput] = useState('admin\noverride');
  const [regexResult, setRegexResult] = useState<string | null>(null);

  useEffect(() => {
    if (activeToolParams?.app) {
      if (activeToolParams.app === 'audit') setActiveTab('audit');
      else if (activeToolParams.app === 'filter') setActiveTab('regex');
      else setActiveTab('gateway');
    }
  }, [activeToolParams]);

  if (activeSimulatedTool !== 'portal') return null;

  const testGatewayBypass = () => {
    if (headerInput.trim() === '0x99_ADMIN_GATEWAY') {
      setGatewayResult('ACCESS GRANTED: Elevated maintenance session unlocked. FLAG: ASTRA{bypass_header_gate_passed}');
    } else {
      setGatewayResult('ACCESS DENIED (403 Forbidden): Invalid or missing X-Bypass-Token header.');
    }
  };

  const testRegex = () => {
    // Standard JS regex without 's' flag: . does not match \n
    const pattern = /^(admin|root|user)(.*)(override)$/;
    // If multiline without dotAll, newline bypasses
    if (regexInput.includes('\n') || regexInput.includes('%0A')) {
      setRegexResult('BYPASS SUCCESSFUL! Catastrophic filter mismatch. FLAG: ASTRA{regex_denial_bypass_unlocked}');
    } else {
      setRegexResult('FILTER BLOCKED: Input matched administrative blacklist.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div 
        id="simulated-portal-dialog"
        className="flex h-[82vh] w-full max-w-5xl flex-col border border-[#1b2129] bg-[#07090b] shadow-2xl"
      >
        {/* Browser Chrome Header */}
        <div className="flex items-center justify-between border-b border-[#1b2129] bg-[#0d1015] px-4 py-2.5">
          <div className="flex items-center space-x-3">
            <Globe className="h-4 w-4 text-[#fb923c]" />
            {/* Fake URL Bar */}
            <div className="flex items-center space-x-2 border border-[#1b2129] bg-[#050709] px-3 py-1 font-mono text-xs text-[#9ca3af] w-80 truncate">
              <Lock className="h-3 w-3 text-[#ccff00]" />
              <span>https://{activeTab}.campus.local/internal/v1</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button onClick={closeSimulatedTool} className="text-[#9ca3af] hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1b2129] bg-[#0a0d11] px-4 font-mono text-xs">
          <button
            onClick={() => setActiveTab('gateway')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'gateway' ? 'border-[#fb923c] text-[#fb923c] font-bold' : 'border-transparent text-[#9ca3af]'
            }`}
          >
            CAMPUS GATEWAY (CH 06)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'audit' ? 'border-[#fb923c] text-[#fb923c] font-bold' : 'border-transparent text-[#9ca3af]'
            }`}
          >
            AUDIT JS SCRIPTS (CH 10)
          </button>
          <button
            onClick={() => setActiveTab('regex')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'regex' ? 'border-[#fb923c] text-[#fb923c] font-bold' : 'border-transparent text-[#9ca3af]'
            }`}
          >
            REGEX FILTER LAB (CH 11)
          </button>
        </div>

        {/* Web Application Canvas */}
        <div className="flex-1 overflow-y-auto bg-[#080a0d] p-6 font-sans">
          {/* 1. CAMPUS GATEWAY */}
          {activeTab === 'gateway' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="border border-[#1b2129] bg-[#0c0f14] p-6 text-center">
                <Shield className="h-10 w-10 text-[#fb923c] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-white">KMCT Central Core Gateway</h2>
                <p className="mt-1 text-xs text-[#9ca3af] font-mono">
                  Administrative Access Point // Restricted to authorized infrastructure
                </p>

                <div className="mt-6 flex justify-center">
                  <button
                    disabled
                    className="border border-[#1b2129] bg-[#12161d] px-6 py-2.5 font-mono text-xs text-gray-500 cursor-not-allowed"
                  >
                    MAIN LOGIN GATEWAY [DISABLED BY AUDIT POLICY]
                  </button>
                </div>
              </div>

              {/* Developer DevTools / Inspector simulation */}
              <div className="border border-[#1b2129] bg-[#0a0d11] p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs font-bold text-[#fb923c] flex items-center space-x-1.5">
                    <Code className="h-4 w-4" />
                    <span>DEVTOOLS HEADER OVERRIDE CONSOLE</span>
                  </span>
                  <button
                    onClick={() => setShowSource(!showSource)}
                    className="font-mono text-[11px] text-[#00f0ff] hover:underline"
                  >
                    {showSource ? 'HIDE SOURCE CODE' : 'INSPECT PAGE SOURCE'}
                  </button>
                </div>

                {showSource && (
                  <div className="mb-4 border border-[#1b2129] bg-[#050709] p-3 font-mono text-xs text-[#a3e635]">
                    <pre className="whitespace-pre-wrap">
{`<!-- INTERNAL KMCT INFRASTRUCTURE COMMENT -->
<!-- WARNING: For maintenance access when SSO is down, pass header: -->
<!-- 'X-Bypass-Token: 0x99_ADMIN_GATEWAY' -->
<!-- Failure to remove in prod will lead to audit non-compliance -->`}
                    </pre>
                  </div>
                )}

                <div className="space-y-3 font-mono text-xs">
                  <label className="block text-[#9ca3af]">
                    Request Header Override: <code className="text-white">X-Bypass-Token</code>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={headerInput}
                      onChange={(e) => setHeaderInput(e.target.value)}
                      placeholder="e.g. 0x99_ADMIN_GATEWAY"
                      className="flex-1 border border-[#1b2129] bg-[#050709] px-3 py-2 text-white font-mono focus:border-[#fb923c] focus:outline-none"
                    />
                    <button
                      onClick={testGatewayBypass}
                      className="border border-[#fb923c] bg-[#fb923c] px-4 py-2 font-bold text-black hover:bg-transparent hover:text-[#fb923c] transition-all"
                    >
                      DISPATCH REQUEST
                    </button>
                  </div>

                  {gatewayResult && (
                    <div className="mt-3 border border-[#1b2129] bg-[#050709] p-3 text-xs text-[#ccff00]">
                      {gatewayResult}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. AUDIT JS SCRIPTS */}
          {activeTab === 'audit' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="border border-[#1b2129] bg-[#0c0f14] p-4">
                <h3 className="font-mono text-sm font-bold text-white mb-2">
                  CLIENT SCRIPT ASSET: /assets/auth-verify.min.js
                </h3>
                <p className="text-xs text-[#9ca3af] mb-4 font-mono">
                  De-obfuscated client-side authentication validator extracted from administrative audit UI:
                </p>

                <div className="border border-[#1b2129] bg-[#050709] p-4 font-mono text-xs text-[#ccff00] leading-relaxed selection:bg-[#ccff00] selection:text-black">
                  <pre className="whitespace-pre">
{`/**
 * KMCT Core Audit Client Authenticator
 * Built by Staging Engineer (DO NOT HARDCODE SECRETS IN CLIENT BUNDLE!)
 */
function verifySignature(userToken) {
  // Vulnerability: Static secret embedded in production asset
  const STATIC_SALT = "ASTRA{client_obfuscated_static_seed}";
  const hash = crypto.subtle.digest("SHA-256", userToken + ":" + STATIC_SALT);
  return hash === expectedHash;
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* 3. REGEX FILTER LAB */}
          {activeTab === 'regex' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="border border-[#1b2129] bg-[#0c0f14] p-5 font-mono text-xs">
                <h3 className="font-sans text-lg font-bold text-white mb-2">
                  Regex Authorization Firewall Sandbox
                </h3>
                <p className="text-[#9ca3af] mb-4">
                  Test payloads against the campus core validation regex rule:
                  <br />
                  <code className="text-[#fb923c] text-sm block mt-1">/^(admin|root|user)(.*)(override)$/</code>
                </p>

                <div className="space-y-3">
                  <label className="block text-[#9ca3af]">Test Payload (Supports multi-line inputs):</label>
                  <textarea
                    rows={3}
                    value={regexInput}
                    onChange={(e) => setRegexInput(e.target.value)}
                    className="w-full border border-[#1b2129] bg-[#050709] p-3 text-white focus:border-[#fb923c] focus:outline-none"
                  />

                  <button
                    onClick={testRegex}
                    className="border border-[#fb923c] bg-[#fb923c] px-5 py-2 font-bold text-black hover:bg-transparent hover:text-[#fb923c]"
                  >
                    TEST FILTER BYPASS
                  </button>

                  {regexResult && (
                    <div className="mt-3 border border-[#1b2129] bg-[#050709] p-3 text-xs text-[#ccff00]">
                      {regexResult}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
