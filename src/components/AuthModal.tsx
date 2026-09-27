import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, User, KeyRound, Shield, AlertCircle, Eye, EyeOff, CheckCircle2, Terminal } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, openAuthModal, login, register } = useApp();
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Close with Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const isLogin = authModalMode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = teamName.trim();
    if (!trimmedName || !password) {
      setError('Please provide both team callsign and security passphrase.');
      return;
    }

    if (!isLogin && trimmedName.length < 3) {
      setError('Unit callsign must be at least 3 characters.');
      return;
    }

    if (!isLogin && password.length < 4) {
      setError('Passphrase must be at least 4 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await login(trimmedName, password);
      } else {
        await register(trimmedName, password);
      }
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (name: string) => {
    setTeamName(name);
    setPassword('kmct2026');
    setLoading(true);
    setError(null);
    try {
      await login(name, 'kmct2026');
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm cursor-pointer"
    >
      <div 
        id="auth-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md border border-[#1b2129] bg-[#090c10] shadow-2xl overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1b2129] bg-[#0e1217] px-5 py-3">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-[#ccff00]" />
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              ASTRA // OPERATOR GATE
            </span>
          </div>
          <button 
            id="auth-modal-close-btn"
            onClick={closeAuthModal} 
            className="text-[#9ca3af] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 border-b border-[#1b2129] bg-[#07090d]">
          <button
            type="button"
            id="auth-tab-login"
            onClick={() => {
              openAuthModal('login');
              setError(null);
            }}
            className={`py-3 font-mono text-xs font-bold tracking-wider uppercase transition-colors border-b-2 ${
              isLogin 
                ? 'border-[#ccff00] text-[#ccff00] bg-[#0e1217]' 
                : 'border-transparent text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            SIGN IN (EXISTING UNIT)
          </button>
          <button
            type="button"
            id="auth-tab-register"
            onClick={() => {
              openAuthModal('register');
              setError(null);
            }}
            className={`py-3 font-mono text-xs font-bold tracking-wider uppercase transition-colors border-b-2 ${
              !isLogin 
                ? 'border-[#00f0ff] text-[#00f0ff] bg-[#0e1217]' 
                : 'border-transparent text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            REGISTER NEW UNIT
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Instructions banner */}
          <div className="border border-[#1b2129] bg-[#0e1217]/80 p-2.5 font-mono text-[11px] text-[#9ca3af] flex items-start space-x-2">
            <Terminal className="h-3.5 w-3.5 text-[#ccff00] mt-0.5 flex-shrink-0" />
            <div>
              {isLogin ? (
                <span>
                  Enter your registered <strong className="text-white">Callsign</strong> and <strong className="text-white">Passphrase</strong>. Team names are case-insensitive.
                </span>
              ) : (
                <span>
                  Create your unit callsign (3–28 chars) and secure passphrase (min 4 chars). Sessions persist automatically.
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="border border-red-500/50 bg-red-500/10 p-3 font-mono text-xs text-red-400 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-mono text-xs text-[#9ca3af] mb-1">
              TEAM CALLSIGN / IDENTIFIER:
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7280]" />
              <input
                id="auth-team-name-input"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={isLogin ? "e.g. KMCT_ALPHA or your registered unit" : "e.g. SQUAD_OMEGA_01"}
                className="w-full border border-[#1b2129] bg-[#050709] py-2 pl-9 pr-3 font-mono text-xs text-white placeholder-gray-600 focus:border-[#ccff00] focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs text-[#9ca3af] mb-1">
              SECURITY PASSPHRASE:
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7280]" />
              <input
                id="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#1b2129] bg-[#050709] py-2 pl-9 pr-10 font-mono text-xs text-white placeholder-gray-600 focus:border-[#ccff00] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#6b7280] hover:text-[#9ca3af]"
                title={showPassword ? 'Hide passphrase' : 'Show passphrase'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-all border ${
              isLogin
                ? 'border-[#ccff00] bg-[#ccff00] text-black hover:bg-transparent hover:text-[#ccff00]'
                : 'border-[#00f0ff] bg-[#00f0ff] text-black hover:bg-transparent hover:text-[#00f0ff]'
            } disabled:opacity-40`}
          >
            {loading ? 'PROCESSING AUTHENTICATION...' : isLogin ? 'AUTHENTICATE & ENTER RANGE' : 'ENROLL UNIT & BEGIN'}
          </button>

          {/* Quick Demo Login Preset for Evaluators */}
          <div className="mt-4 border-t border-[#1b2129] pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-[#6b7280] uppercase tracking-widest">
                Evaluator 1-Click Fast Sign-in:
              </span>
              <span className="font-mono text-[10px] text-[#4b5563]">
                Pass: <code className="text-[#9ca3af]">kmct2026</code>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="auth-demo-kmct-alpha"
                onClick={() => handleQuickDemo('KMCT_ALPHA')}
                className="border border-[#1b2129] bg-[#12161d] p-2 text-left font-mono text-[11px] text-[#ccff00] hover:border-[#ccff00] transition-colors"
              >
                <div className="font-bold flex items-center justify-between">
                  <span>KMCT_ALPHA</span>
                  <span className="text-[9px] text-[#22c55e]">Leader</span>
                </div>
                <div className="text-[9px] text-[#6b7280]">6 Solved · 1,150 pts</div>
              </button>

              <button
                type="button"
                id="auth-demo-null-sector"
                onClick={() => handleQuickDemo('NULL_SECTOR')}
                className="border border-[#1b2129] bg-[#12161d] p-2 text-left font-mono text-[11px] text-[#00f0ff] hover:border-[#00f0ff] transition-colors"
              >
                <div className="font-bold">NULL_SECTOR</div>
                <div className="text-[9px] text-[#6b7280]">4 Solved · 750 pts</div>
              </button>

              <button
                type="button"
                id="auth-demo-zero-day"
                onClick={() => handleQuickDemo('ZERO_DAY_SYNDICATE')}
                className="border border-[#1b2129] bg-[#12161d] p-2 text-left font-mono text-[11px] text-[#f59e0b] hover:border-[#f59e0b] transition-colors"
              >
                <div className="font-bold">ZERO_DAY_SYNDICATE</div>
                <div className="text-[9px] text-[#6b7280]">3 Solved · 520 pts</div>
              </button>

              <button
                type="button"
                id="auth-demo-neural-phantom"
                onClick={() => handleQuickDemo('NEURAL_PHANTOM')}
                className="border border-[#1b2129] bg-[#12161d] p-2 text-left font-mono text-[11px] text-[#ec4899] hover:border-[#ec4899] transition-colors"
              >
                <div className="font-bold">NEURAL_PHANTOM</div>
                <div className="text-[9px] text-[#6b7280]">1 Solved · 100 pts</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
