import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { store } from './server/supabase-store.js';
import { SIMULATED_EMAILS, SIMULATED_FILES, SIMULATED_PACKETS } from './server/simulated-data.js';
import { SERVER_CHALLENGES } from './server/challenges-data.js';
import { executeVirtualTerminal } from './server/terminal.js';

const PORT = 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim() || null;

if (!ADMIN_SECRET) {
  console.warn('[ASTRA AUTH] ADMIN_SECRET is not configured. Admin routes are disabled until the environment variable is set.');
}

function constantTimeSecretEquals(provided: unknown): boolean {
  if (!ADMIN_SECRET || typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function getAdminPasscode(req: Request): string | null {
  const value = req.headers['x-admin-passcode'];
  return Array.isArray(value) ? value[0] || null : value || null;
}

function isAdminAuthorized(req: Request): boolean {
  return constantTimeSecretEquals(getAdminPasscode(req));
}

// Extend Express Request
interface AuthenticatedRequest extends Request {
  team?: any;
}

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Disable caching for all API responses to prevent stale auth status
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Auth extraction middleware
  app.use(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const customHeaderToken = (req.headers['x-auth-token'] as string) || null;
    const token = bearerToken || customHeaderToken || req.cookies?.astrasess;
    try {
      if (token) {
        const team = await store.getTeamByToken(token);
        if (team) req.team = team;
      }
    } catch {
      // Treat datastore/auth lookup failures as unauthenticated for this request.
    }
    next();
  });

  // --- API Routes ---

  // Health check & System Status
  const getSystemWarnings = () => {
    const warnings: string[] = [];
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      warnings.push('Database (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) is not configured. Running in local standalone storage mode.');
    }
    if (!ADMIN_SECRET) {
      warnings.push('ADMIN_SECRET is not configured. Admin routes are disabled.');
    }
    return warnings;
  };

  app.get('/api/health', (req, res) => {
    const warnings = getSystemWarnings();
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      simulation: 'ASTRA_ECHO_v2.6',
      storageMode: store.getStorageMode ? store.getStorageMode() : 'local-fallback',
      warnings,
      isSupabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      isAdminConfigured: Boolean(ADMIN_SECRET),
    });
  });

  app.get('/api/system/status', (req, res) => {
    const warnings = getSystemWarnings();
    res.json({
      online: true,
      time: new Date().toISOString(),
      storageMode: store.getStorageMode ? store.getStorageMode() : 'local-fallback',
      isSupabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      isAdminConfigured: Boolean(ADMIN_SECRET),
      warnings,
    });
  });

  // Auth
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, password } = req.body;
      const { team, token } = await store.registerTeam(name, password);
      res.cookie('astrasess', token, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });
      res.json({ success: true, team, token });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { name, password } = req.body;
      const { team, token } = await store.loginTeam(name, password);
      res.cookie('astrasess', token, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      res.json({ success: true, team, token });
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Authentication failed' });
    }
  });

  app.post('/api/auth/logout', async (req: AuthenticatedRequest, res) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const token = bearerToken || req.cookies?.astrasess;
    if (token) {
      await store.destroySession(token);
    }
    res.clearCookie('astrasess', { sameSite: 'none', secure: true });
    res.json({ success: true });
  });

  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    res.json({ team: req.team || null });
  });

  // Team-scoped live snapshot. Clients poll this endpoint so both players share
  // the same authoritative Supabase/local state without exposing other teams.
  app.get('/api/team/state', async (req: AuthenticatedRequest, res) => {
    if (!req.team) return res.status(401).json({ error: 'Authentication required.' });
    try {
      const snapshot = await store.getTeamSnapshot(req.team.id);
      res.json(snapshot);
    } catch (err: any) {
      await store.recordSystemEvent('ERROR', 'team_state_sync', err?.message || 'Team state sync failed', req.team.id);
      res.status(500).json({ error: 'Unable to synchronize team state.' });
    }
  });

  app.post('/api/client-events', async (req: AuthenticatedRequest, res) => {
    if (!req.team) return res.status(401).json({ error: 'Authentication required.' });
    const { level, eventType, message, metadata } = req.body || {};
    const safeLevel = level === 'ERROR' ? 'ERROR' : level === 'WARN' ? 'WARN' : 'INFO';
    await store.recordSystemEvent(
      safeLevel,
      String(eventType || 'client_event').slice(0, 80),
      String(message || 'Client event').slice(0, 1000),
      req.team.id,
      metadata && typeof metadata === 'object' ? metadata : {},
    );
    res.json({ success: true });
  });

  // Challenges
  app.get('/api/challenges', async (req: AuthenticatedRequest, res) => {
    const challenges = await store.getSanitizedChallenges(req.team);
    res.json({ challenges });
  });

  app.post('/api/challenges/:id/submit', async (req: AuthenticatedRequest, res) => {
    if (!req.team) {
      return res.status(401).json({ error: 'Authentication required to submit flags.' });
    }
    try {
      const { id } = req.params;
      const { flag } = req.body;
      if (!flag || typeof flag !== 'string') {
        return res.status(400).json({ error: 'Flag parameter is required.' });
      }

      const result = await store.submitFlag(req.team.id, id, flag);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Submission failed' });
    }
  });

  app.post('/api/challenges/:id/hint', async (req: AuthenticatedRequest, res) => {
    if (!req.team) {
      return res.status(401).json({ error: 'Authentication required to unlock hints.' });
    }
    try {
      const { id } = req.params;
      const { hintId } = req.body;
      const result = await store.unlockHint(req.team.id, id, Number(hintId));
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Hint unlock failed' });
    }
  });

  // Evidence & Investigation
  app.get('/api/evidence', async (req: AuthenticatedRequest, res) => {
    const evidence = await store.getRecoveredEvidence(req.team);
    res.json({ evidence });
  });

  app.get('/api/timeline', async (req: AuthenticatedRequest, res) => {
    const timeline = await store.getIncidentTimeline(req.team);
    res.json({ timeline });
  });

  app.get('/api/achievements', async (req: AuthenticatedRequest, res) => {
    const achievements = await store.getAchievements(req.team);
    res.json({ achievements });
  });

  // Leaderboard
  app.get('/api/scoreboard', async (req, res) => {
    const leaderboard = await store.getLeaderboard();
    res.json({ leaderboard });
  });

  // Submissions stream
  app.get('/api/submissions', async (req, res) => {
    const submissions = await store.getSubmissions(30);
    // Sanitize attempted flags so competitors can't harvest solutions from public logs
    const sanitized = submissions.map((s) => ({
      id: s.id,
      teamName: s.teamName,
      challengeTitle: s.challengeTitle,
      isCorrect: s.isCorrect,
      timestamp: s.timestamp,
      pointsDelta: s.pointsDelta,
    }));
    res.json({ submissions: sanitized });
  });

  // Simulated Systems APIs. Player-visible simulation data is redacted until the
  // corresponding challenge branch is unlocked.
  const sanitizeSimulation = <T,>(value: T, team: any): T => {
    const clone: any = JSON.parse(JSON.stringify(value));
    const unlocked = new Set(team?.solvedChallengeIds || []);
    const isAvailable = (challengeId: string) => {
      const challenge = SERVER_CHALLENGES.find((item) => item.id === challengeId);
      if (!challenge) return false;
      return challenge.prerequisites.every((id) => unlocked.has(id));
    };
    const redact = (input: string) => {
      let output = input;
      for (const challenge of SERVER_CHALLENGES) {
        if (isAvailable(challenge.id) || unlocked.has(challenge.id)) continue;
        const encoded = Buffer.from(challenge.flag, 'utf8').toString('base64');
        output = output.split(challenge.flag).join('[REDACTED_UNTIL_NODE_UNLOCKED]');
        output = output.split(encoded).join('[REDACTED_BASE64]');
      }
      return output;
    };
    const walk = (item: any): any => {
      if (typeof item === 'string') return redact(item);
      if (Array.isArray(item)) return item.map(walk);
      if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, walk(v)]));
      return item;
    };
    return walk(clone);
  };

  app.get('/api/simulated/mailbox', (req: AuthenticatedRequest, res) => {
    if (!req.team) return res.status(401).json({ error: 'Authentication required.' });
    res.json({ emails: sanitizeSimulation(SIMULATED_EMAILS, req.team) });
  });

  app.get('/api/simulated/files', (req: AuthenticatedRequest, res) => {
    if (!req.team) return res.status(401).json({ error: 'Authentication required.' });
    res.json({ root: sanitizeSimulation(SIMULATED_FILES, req.team) });
  });

  app.get('/api/simulated/packets', (req: AuthenticatedRequest, res) => {
    if (!req.team) return res.status(401).json({ error: 'Authentication required.' });
    const filter = (req.query.filter as string)?.toUpperCase();
    const packets = filter && filter !== 'ALL'
      ? SIMULATED_PACKETS.filter((p) => p.protocol.toUpperCase() === filter)
      : SIMULATED_PACKETS;
    res.json({ packets: sanitizeSimulation(packets, req.team) });
  });

  // Safe, in-memory virtual shell. It never executes host OS commands.
  app.post('/api/simulated/terminal/exec', async (req: AuthenticatedRequest, res) => {
    if (!req.team) return res.status(401).json({ error: 'Authentication required.' });
    const command = typeof req.body?.command === 'string' ? req.body.command : '';
    const cwd = typeof req.body?.cwd === 'string' ? req.body.cwd : '/home/investigator';
    try {
      const result = await executeVirtualTerminal(command, req.team, cwd);
      res.json(result);
    } catch (err: any) {
      await store.recordSystemEvent('ERROR', 'terminal_exec', err?.message || 'Terminal execution error', req.team.id);
      res.status(500).json({ output: 'astra-sh: internal virtual-shell error', cwd });
    }
  });

  // Admin APIs. Every admin action requires the same constant-time secret gate.
  app.post('/api/admin/auth', (req, res) => {
    if (!ADMIN_SECRET) return res.status(503).json({ success: false, error: 'ADMIN_SECRET is not configured.' });
    if (constantTimeSecretEquals(req.body?.passcode)) {
      res.json({ success: true, authorized: true });
      return;
    }
    res.status(401).json({ success: false, error: 'Invalid admin passcode.' });
  });

  app.get('/api/admin/overview', async (req, res) => {
    if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized admin access.' });
    try {
      const [teams, submissions, activeSessions, systemEvents] = await Promise.all([
        store.getAllTeams(),
        store.getSubmissions(5000),
        store.getActiveSessionCounts(),
        store.getSystemEvents(150),
      ]);
      const sessionDetails = await store.getActiveSessions();
      const challengeStats = SERVER_CHALLENGES.map((challenge) => {
        const rows = submissions.filter((submission) => submission.challengeId === challenge.id);
        const correct = rows.filter((submission) => submission.isCorrect).length;
        const incorrect = rows.filter((submission) => !submission.isCorrect).length;
        return {
          id: challenge.id,
          nodeIndex: challenge.nodeIndex,
          title: challenge.title,
          difficulty: challenge.difficulty,
          difficultyRating: challenge.difficultyRating,
          solvedTeams: correct,
          totalSubmissions: rows.length,
          incorrectSubmissions: incorrect,
          successRate: rows.length ? Math.round((correct / rows.length) * 100) : 0,
        };
      });
      const liveTeams = teams.map((team) => ({
        ...team,
        activePlayerCount: activeSessions[team.id] || 0,
        activeSessions: sessionDetails
          .filter((session) => session.teamId === team.id)
          .map(({ id, createdAt }) => ({ id, createdAt })),
        solvedCount: team.solvedChallengeIds.length,
      }));
      res.json({
        teamsCount: teams.length,
        activeTeamsCount: liveTeams.filter((team) => team.activePlayerCount > 0).length,
        completedTeamsCount: liveTeams.filter((team) => team.solvedCount === SERVER_CHALLENGES.length).length,
        totalSolved: liveTeams.reduce((sum, team) => sum + team.solvedCount, 0),
        submissionsCount: submissions.length,
        teams: liveTeams,
        submissions: submissions.slice(0, 500).map((submission) => ({ ...submission, attemptedFlag: '[ADMIN_ONLY]' })),
        challengeStats,
        systemEvents,
      });
    } catch (err: any) {
      console.error('[ASTRA ADMIN] failed to load overview', err);
      await store.recordSystemEvent('ERROR', 'admin_overview', err?.message || 'Admin overview failed');
      res.status(500).json({
        error: 'Unable to load admin overview.',
        details: err instanceof Error ? err.message : 'Unknown server error.',
      });
    }
  });

  app.post('/api/admin/reset', async (req, res) => {
    if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized admin access.' });
    await store.adminResetCompetition();
    await store.recordSystemEvent('WARN', 'competition_reset', 'Competition reset by administrator.');
    res.json({ success: true, message: 'Competition reset successfully.' });
  });

  app.post('/api/admin/challenge-toggle', async (req, res) => {
    if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized admin access.' });
    const { challengeId, disable } = req.body;
    await store.adminToggleChallenge(challengeId, Boolean(disable));
    await store.recordSystemEvent('INFO', 'challenge_toggle', `Challenge ${challengeId} ${disable ? 'disabled' : 'enabled'} by administrator.`);
    res.json({ success: true });
  });

  app.post('/api/admin/reset-team', async (req, res) => {
    if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized admin access.' });
    const teamId = req.body?.teamId;
    if (!teamId) return res.status(400).json({ error: 'Team ID is required.' });
    await store.adminResetTeam(teamId);
    await store.recordSystemEvent('WARN', 'team_reset', `Team ${teamId} reset by administrator.`, teamId);
    res.json({ success: true, message: 'Team state reset successfully.' });
  });

  app.post('/api/admin/change-team-password', async (req, res) => {
    if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized admin access.' });
    const { teamId, password } = req.body || {};
    if (typeof teamId !== 'string' || !teamId) return res.status(400).json({ error: 'Team ID is required.' });
    if (typeof password !== 'string' || password.length < 4 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 4 and 128 characters.' });
    }
    try {
      await store.adminChangeTeamPassword(teamId, password);
      await store.recordSystemEvent('WARN', 'team_password_changed', 'Team passphrase changed by administrator.', teamId);
      res.json({ success: true, message: 'Team passphrase changed. Existing sessions remain active.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Unable to change team passphrase.' });
    }
  });

  app.post('/api/admin/revoke-session', async (req, res) => {
    if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized admin access.' });
    const { teamId, sessionId } = req.body || {};
    if (typeof teamId !== 'string' || !teamId) return res.status(400).json({ error: 'Team ID is required.' });
    if (typeof sessionId !== 'string' || !/^[a-f0-9]{12}$/.test(sessionId)) {
      return res.status(400).json({ error: 'Valid session ID is required.' });
    }
    try {
      await store.adminRevokeSession(teamId, sessionId);
      await store.recordSystemEvent('WARN', 'team_session_revoked', `An active team session was revoked by administrator.`, teamId);
      res.json({ success: true, message: 'Player session disconnected.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Unable to revoke player session.' });
    }
  });

  app.post('/api/admin/unlock-all-nodes', async (req, res) => {
    if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized admin access.' });
    const teamId = req.body?.teamId;
    if (!teamId) return res.status(400).json({ error: 'Team ID is required.' });
    await store.adminUnlockAllNodes(teamId);
    await store.recordSystemEvent('INFO', 'admin_unlock_all', `All nodes unlocked for ${teamId}.`, teamId);
    res.json({ success: true, message: 'All nodes unlocked for testing.' });
  });

  app.post('/api/admin/override-echo', async (req, res) => {
    if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized admin access.' });
    const { teamId, echoState, threatLevel } = req.body || {};
    if (!teamId) return res.status(400).json({ error: 'Team ID is required.' });
    await store.adminOverrideEcho(teamId, echoState, Number(threatLevel));
    await store.recordSystemEvent('INFO', 'echo_override', `ECHO forced to ${echoState} / threat ${threatLevel}.`, teamId);
    res.json({ success: true, message: `ECHO forced to state: ${echoState} [Level ${threatLevel}].` });
  });

  app.post('/api/admin/trigger-chaos', async (req, res) => {
    if (!isAdminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized admin access.' });
    await store.recordSystemEvent('INFO', 'chaos_injection', 'Simulated network anomaly burst injected by administrator.');
    res.json({ success: true, message: 'Simulated network anomaly burst injected across interface opt0.' });
  });

  // Last-resort API error telemetry for unexpected exceptions.
  app.use(async (err: any, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    await store.recordSystemEvent('ERROR', 'unhandled_request_error', err?.message || 'Unhandled request error', req.team?.id || null, { path: req.path, method: req.method });
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Internal range error.' });
  });

  // --- Vite & Static Handling ---
  if (process.env.VERCEL) return app;
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

let appPromise: ReturnType<typeof startServer> | null = null;

export async function getApp() {
  if (!appPromise) appPromise = startServer();
  return appPromise;
}

if (!process.env.VERCEL) {
  getApp().then((app) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`ASTRA // ECHO Living Cyber Range running on http://0.0.0.0:${PORT}`);
    });
  });
}
