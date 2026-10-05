import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Team, 
  Challenge, 
  EvidenceArtifact, 
  IncidentEvent, 
  Achievement 
} from '../types';
import { sound } from '../utils/audio';

export type AppView = 'landing' | 'warroom' | 'evidence' | 'timeline' | 'scoreboard' | 'achievements' | 'admin';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'achievement' | 'echo';
  title: string;
  message?: string;
}

interface AppContextType {
  team: Team | null;
  challenges: Challenge[];
  evidence: EvidenceArtifact[];
  timeline: IncidentEvent[];
  achievements: Achievement[];
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  motionEnabled: boolean;
  toggleMotion: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalMode: 'login' | 'register';
  isFieldBriefingOpen: boolean;
  setIsFieldBriefingOpen: (open: boolean) => void;
  selectedChallenge: Challenge | null;
  setSelectedChallenge: React.Dispatch<React.SetStateAction<Challenge | null>>;
  activeSimulatedTool: 'terminal' | 'mailbox' | 'network' | 'files' | 'portal' | null;
  activeToolParams: Record<string, string> | null;
  openSimulatedTool: (tool: 'terminal' | 'mailbox' | 'network' | 'files' | 'portal', params?: Record<string, string>) => void;
  closeSimulatedTool: () => void;
  echoMessage: string;
  setEchoMessage: (msg: string) => void;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  triggerToast: (toast: Omit<ToastItem, 'id'>) => void;
  login: (name: string, pass: string) => Promise<void>;
  register: (name: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAll: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  submitFlag: (challengeId: string, flag: string) => Promise<{ correct: boolean; message: string; pointsAwarded?: number }>;
  unlockHint: (challengeId: string, hintId: number) => Promise<string>;
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  isMissionCompleteOpen: boolean;
  liveSyncAt: string | null;
  setIsMissionCompleteOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

let memorySessionToken: string | null = null;

export const getStoredToken = (): string | null => {
  if (memorySessionToken) return memorySessionToken;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const t = window.localStorage.getItem('astra_token');
      if (t) {
        memorySessionToken = t;
        return t;
      }
    }
  } catch {
    // iframe sandbox protection fallback
  }
  return null;
};

export const setStoredToken = (tok: string | null) => {
  memorySessionToken = tok;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (tok) {
        window.localStorage.setItem('astra_token', tok);
      } else {
        window.localStorage.removeItem('astra_token');
      }
    }
  } catch {
    // iframe sandbox protection fallback
  }
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [evidence, setEvidence] = useState<EvidenceArtifact[]>([]);
  const [timeline, setTimeline] = useState<IncidentEvent[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeView, setCurrentView] = useState<AppView>(() =>
    typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/admin'
      ? 'admin'
      : 'landing',
  );
  const setActiveView = useCallback((view: AppView) => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
      if (view === 'admin' && currentPath !== '/admin') {
        window.history.pushState({}, '', '/admin');
      } else if (view !== 'admin' && currentPath === '/admin') {
        window.history.replaceState({}, '', '/');
      }
    }
    setCurrentView(view);
  }, []);

  useEffect(() => {
    const syncViewWithLocation = () => {
      setCurrentView(window.location.pathname.replace(/\/+$/, '') === '/admin' ? 'admin' : 'landing');
    };
    window.addEventListener('popstate', syncViewWithLocation);
    return () => window.removeEventListener('popstate', syncViewWithLocation);
  }, []);

  const apiFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const token = getStoredToken();
    const headers = new Headers(init.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('x-auth-token', token);
    }
    return fetch(url, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  }, []);
  
  const [motionEnabled, setMotionEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('astra_motion');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('astra_sound');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isFieldBriefingOpen, setIsFieldBriefingOpen] = useState(false);
  const [isMissionCompleteOpen, setIsMissionCompleteOpen] = useState(false);
  const [liveSyncAt, setLiveSyncAt] = useState<string | null>(null);
  const syncErrorReportedAt = useRef(0);

  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [activeSimulatedTool, setActiveSimulatedTool] = useState<'terminal' | 'mailbox' | 'network' | 'files' | 'portal' | null>(null);
  const [activeToolParams, setActiveToolParams] = useState<Record<string, string> | null>(null);

  const [echoMessage, setEchoMessage] = useState<string>('SYSTEM ARMED. AWAITING TELEMETRY.');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Sound sync
  useEffect(() => {
    sound.enabled = soundEnabled;
    localStorage.setItem('astra_sound', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('astra_motion', String(motionEnabled));
  }, [motionEnabled]);

  const triggerToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch initial state
  const refreshAll = useCallback(async (currentTeam?: Team | null) => {
    try {
      const [meRes, chRes, evRes, tlRes, achRes] = await Promise.all([
        apiFetch('/api/auth/me'),
        apiFetch('/api/challenges'),
        apiFetch('/api/evidence'),
        apiFetch('/api/timeline'),
        apiFetch('/api/achievements'),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.team) {
          setTeam(meData.team);
        } else if (currentTeam) {
          setTeam(currentTeam);
        } else {
          setTeam(null);
        }
      } else if (currentTeam) {
        setTeam(currentTeam);
      }

      if (chRes.ok) {
        const chData = await chRes.json();
        const refreshedChallenges = chData.challenges || [];
        setChallenges(refreshedChallenges);
        setSelectedChallenge((current) =>
          current
            ? refreshedChallenges.find((challenge: Challenge) => challenge.id === current.id) || current
            : null,
        );
      }
      if (evRes.ok) {
        const evData = await evRes.json();
        setEvidence(evData.evidence || []);
      }
      if (tlRes.ok) {
        const tlData = await tlRes.json();
        setTimeline(tlData.timeline || []);
      }
      if (achRes.ok) {
        const achData = await achRes.json();
        setAchievements(achData.achievements || []);
      }
    } catch (err) {
      console.error('Data refresh error:', err);
    }
  }, [apiFetch]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Both players use the same team-scoped state. A lightweight two-second poll
  // keeps a second browser synchronized without exposing another team's state.
  useEffect(() => {
    if (!team) return;
    let disposed = false;
    const syncTeamState = async () => {
      try {
        const res = await apiFetch('/api/team/state');
        if (!res.ok) return;
        const data = await res.json();
        if (disposed) return;
        if (data.team) setTeam({ ...data.team, activePlayerCount: data.activePlayerCount });
        if (Array.isArray(data.challenges)) {
          setChallenges(data.challenges);
          setSelectedChallenge((current) =>
            current
              ? data.challenges.find((challenge: Challenge) => challenge.id === current.id) || current
              : null,
          );
        }
        if (Array.isArray(data.evidence)) setEvidence(data.evidence);
        if (Array.isArray(data.timeline)) setTimeline(data.timeline);
        if (Array.isArray(data.achievements)) setAchievements(data.achievements);
        setLiveSyncAt(new Date().toISOString());
      } catch (error) {
        const now = Date.now();
        if (now - syncErrorReportedAt.current > 15000) {
          syncErrorReportedAt.current = now;
          try {
            await apiFetch('/api/client-events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ level: 'WARN', eventType: 'live_sync_failure', message: 'Team state synchronization failed.', metadata: { error: String(error) } }),
            });
          } catch {
            // Ignore telemetry failures while the main API is unreachable.
          }
        }
      }
    };

    syncTeamState();
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') syncTeamState();
    }, 2000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [team?.id, apiFetch]);

  const toggleMotion = () => {
    setMotionEnabled((prev) => !prev);
    sound.playClick();
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => !prev);
    if (!soundEnabled) {
      sound.enabled = true;
      sound.playClick();
    }
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    sound.playClick();
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openSimulatedTool = (tool: 'terminal' | 'mailbox' | 'network' | 'files' | 'portal', params?: Record<string, string>) => {
    setActiveSimulatedTool(tool);
    setActiveToolParams(params || null);
    sound.playBlip();
  };

  const closeSimulatedTool = () => {
    setActiveSimulatedTool(null);
    setActiveToolParams(null);
  };

  const login = async (name: string, pass: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: pass }),
    });
    let data: any = {};
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      sound.playDenied();
      throw new Error(data.error || `Authentication failed (${res.status})`);
    }
    if (data.token) {
      setStoredToken(data.token);
    }
    setTeam(data.team);
    closeAuthModal();
    sound.playSolve();
    setActiveView('warroom');
    triggerToast({
      type: 'success',
      title: 'OPERATOR AUTHENTICATED',
      message: `Welcome back, ${data.team?.name || name}. ECHO is observing.`,
    });
    setEchoMessage(`ECHO: Session established for ${data.team?.name || name}. Telemetry recording.`);
    await refreshAll(data.team);
  };

  const register = async (name: string, pass: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: pass }),
    });
    let data: any = {};
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      sound.playDenied();
      throw new Error(data.error || `Registration failed (${res.status})`);
    }
    if (data.token) {
      setStoredToken(data.token);
    }
    setTeam(data.team);
    closeAuthModal();
    sound.playSolve();
    setActiveView('warroom');
    triggerToast({
      type: 'success',
      title: 'TEAM ENROLLED',
      message: `Unit ${data.team?.name || name} registered into KMCT Cyber Range.`,
    });
    setEchoMessage(`ECHO: New entity detected: ${data.team?.name || name}. I will track your actions.`);
    await refreshAll(data.team);
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setTeam(null);
    setActiveView('landing');
    sound.playClick();
    triggerToast({
      type: 'info',
      title: 'SESSION TERMINATED',
      message: 'Operator logged out.',
    });
    await refreshAll(null);
  };

  const unlockHint = async (challengeId: string, hintId: number): Promise<string> => {
    const res = await apiFetch(`/api/challenges/${challengeId}/hint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hintId }),
    });
    const data = await res.json();
    if (!res.ok) {
      sound.playDenied();
      throw new Error(data.error || 'Failed to unlock hint');
    }
    sound.playBlip();
    setTeam(data.team);
    triggerToast({
      type: 'info',
      title: 'HINT DECRYPTED',
      message: data.hintPenalty
        ? `${data.hintPenalty} point penalty will reduce this chapter's reward when solved.`
        : 'This hint is already unlocked; no additional penalty applies.',
    });
    await refreshAll();
    return data.hintContent;
  };

  const submitFlag = async (challengeId: string, flag: string) => {
    const res = await apiFetch(`/api/challenges/${challengeId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag }),
    });
    const data = await res.json();
    if (!res.ok) {
      sound.playDenied();
      triggerToast({
        type: 'error',
        title: 'FLAG REJECTED',
        message: data.error || 'Submission declined by security gate.',
      });
      return { correct: false, message: data.error || 'Rejected' };
    }

    if (data.alreadySolved) {
      sound.playBlip();
      triggerToast({
        type: 'info',
        title: 'NODE ALREADY CLEARED',
        message: data.message,
      });
      return { correct: true, message: data.message };
    }

    if (!data.correct) {
      sound.playDenied();
      triggerToast({
        type: 'error',
        title: 'FLAG REJECTED',
        message: `-5 points penalty recorded. ${data.echoReaction || ''}`,
      });
      setEchoMessage(data.echoReaction || 'ECHO: Invalid token rejected.');
      await refreshAll();
      return { correct: false, message: data.message };
    }

    // Solved!
    sound.playSolve();
    if (motionEnabled) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ccff00', '#00f0ff', '#ffffff'],
      });
    }

    if (data.echoReaction) {
      setEchoMessage(data.echoReaction);
    }

    if (data.stateChanged) {
      sound.playEchoAwaken();
      triggerToast({
        type: 'echo',
        title: `ECHO TRANSITION: ${data.echoState}`,
        message: `System defense escalated to state ${data.echoState}.`,
      });
    }

    if (data.newlyUnlockedAchievements && data.newlyUnlockedAchievements.length > 0) {
      triggerToast({
        type: 'achievement',
        title: 'ACHIEVEMENT UNLOCKED',
        message: 'New milestone recognized in cyber telemetry.',
      });
    }

    if (challengeId === 'ch-18') {
      setIsMissionCompleteOpen(true);
    }

    await refreshAll();
    return { correct: true, message: 'FLAG ACCEPTED', pointsAwarded: data.pointsAwarded };
  };

  return (
    <AppContext.Provider
      value={{
        team,
        challenges,
        evidence,
        timeline,
        achievements,
        activeView,
        setActiveView,
        motionEnabled,
        toggleMotion,
        soundEnabled,
        toggleSound,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        isFieldBriefingOpen,
        setIsFieldBriefingOpen,
        selectedChallenge,
        setSelectedChallenge,
        activeSimulatedTool,
        activeToolParams,
        openSimulatedTool,
        closeSimulatedTool,
        echoMessage,
        setEchoMessage,
        toasts,
        dismissToast,
        triggerToast,
        login,
        register,
        logout,
        refreshAll,
        fetchInitialData: refreshAll,
        submitFlag,
        unlockHint,
        apiFetch,
        isMissionCompleteOpen,
        setIsMissionCompleteOpen,
        liveSyncAt,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
