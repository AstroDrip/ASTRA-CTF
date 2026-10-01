import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  Team,
  LeaderboardEntry,
  SubmissionRecord,
  EchoStateType,
  EvidenceArtifact,
  IncidentEvent,
  Achievement,
} from '../src/types.js';
import {
  SERVER_CHALLENGES,
  EVIDENCE_DATABASE,
  INCIDENT_TIMELINE,
  INITIAL_ACHIEVEMENTS,
  ServerChallengeDefinition,
} from './challenges-data.js';
import { CTFStore } from './store.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface SupabaseRow {
  [key: string]: any;
}

function safeError(error: any): Error {
  const message = error?.message || error?.details || error?.hint || 'Supabase request failed';
  return new Error(message);
}

function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class SupabaseCTFStore {
  private readonly url: string | null;
  private readonly key: string | null;
  private readonly localStore: CTFStore;
  private readonly isConfigured: boolean;

  constructor() {
    const rawUrl = process.env.SUPABASE_URL;
    const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (rawUrl && rawKey && rawUrl.trim() !== '' && rawKey.trim() !== '') {
      this.url = rawUrl.trim().replace(/\/+$/, '');
      this.key = rawKey.trim();
      this.isConfigured = true;
      console.log('[ASTRA STORE] Supabase database backend connected.');
    } else {
      this.url = null;
      this.key = null;
      this.isConfigured = false;
      console.warn('[ASTRA STORE] ⚠️ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured. Running with local fallback store (.data/ctf_store.json).');
    }

    this.localStore = new CTFStore();
  }

  public isSupabaseConfigured(): boolean {
    return this.isConfigured;
  }

  public getStorageMode(): 'supabase' | 'local-fallback' {
    return this.isConfigured ? 'supabase' : 'local-fallback';
  }

  public getSystemWarnings(): string[] {
    const warnings: string[] = [];
    if (!this.isConfigured) {
      warnings.push('Database (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) is not configured. Running in local standalone storage mode.');
    }
    return warnings;
  }

  private async request(
    table: string,
    init: RequestInit = {},
    query = '',
  ): Promise<any> {
    if (!this.isConfigured || !this.url || !this.key) {
      throw new Error('Supabase is not configured.');
    }
    const response = await fetch(`${this.url}/rest/v1/${table}${query}`, {
      ...init,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      let body = '';
      try { body = await response.text(); } catch {}
      throw new Error(body || `Supabase request failed (${response.status})`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private async rpc(name: string, args: Record<string, unknown>): Promise<any> {
    if (!this.isConfigured || !this.url || !this.key) {
      throw new Error('Supabase is not configured.');
    }
    const response = await fetch(`${this.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!response.ok) {
      let body = '';
      try { body = await response.text(); } catch {}
      throw new Error(body || `Supabase RPC ${name} failed (${response.status})`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private rowToTeam(row: SupabaseRow): Team {
    return {
      id: row.id,
      name: row.name,
      score: Number(row.score || 0),
      solvedChallengeIds: Array.isArray(row.solved_challenge_ids) ? row.solved_challenge_ids : [],
      unlockedHintKeys: Array.isArray(row.unlocked_hint_keys) ? row.unlocked_hint_keys : [],
      wrongAttemptsCount: Number(row.wrong_attempts_count || 0),
      lastSolveAt: row.last_solve_at || undefined,
      echoState: row.echo_state as EchoStateType,
      threatLevel: Number(row.threat_level || 1),
      achievements: Array.isArray(row.achievements) ? row.achievements : [],
      evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids : [],
      createdAt: row.created_at,
    };
  }

  private async getTeam(teamId: string): Promise<Team | null> {
    if (!this.isConfigured) {
      return this.localStore.getAllTeams().find((t) => t.id === teamId) || null;
    }
    const rows = await this.request(
      'teams',
      {},
      `?id=eq.${encodeURIComponent(teamId)}&select=*`,
    );
    return rows?.[0] ? this.rowToTeam(rows[0]) : null;
  }

  public async registerTeam(name: string, passwordPlain: string): Promise<{ team: Team; token: string }> {
    if (!this.isConfigured) {
      return this.localStore.registerTeam(name, passwordPlain);
    }

    const trimmed = String(name || '').trim();
    if (!trimmed || trimmed.length < 3) throw new Error('Team name must be at least 3 characters.');
    if (trimmed.length > 28) throw new Error('Team name cannot exceed 28 characters.');
    if (!passwordPlain || passwordPlain.length < 4) throw new Error('Passphrase must be at least 4 characters.');

    const hash = await bcrypt.hash(passwordPlain, 10);
    const teamId = `team-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    try {
      await this.request('teams', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          id: teamId,
          name: trimmed,
          name_normalized: trimmed.toLowerCase(),
          password_hash: hash,
          score: 0,
          solved_challenge_ids: [],
          unlocked_hint_keys: [],
          wrong_attempts_count: 0,
          echo_state: 'OBSERVING',
          threat_level: 1,
          achievements: [],
          evidence_ids: [],
          created_at: now,
        }),
      });
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error);
      if (/duplicate|unique|name_normalized/i.test(message)) {
        throw new Error('Team name already registered. Choose another identifier.');
      }
      throw safeError(error);
    }

    const token = await this.createSession(teamId);
    const team = await this.getTeam(teamId);
    if (!team) throw new Error('Team was created but could not be loaded.');
    return { team, token };
  }

  public async loginTeam(name: string, passwordPlain: string): Promise<{ team: Team; token: string }> {
    if (!this.isConfigured) {
      return this.localStore.loginTeam(name, passwordPlain);
    }

    const normalized = String(name || '').trim().toLowerCase();
    const rows = await this.request(
      'teams',
      {},
      `?name_normalized=eq.${encodeURIComponent(normalized)}&select=*`,
    );
    const row = rows?.[0];
    if (!row) {
      throw new Error(`Unit "${String(name || '').trim()}" not found. Please verify the callsign or register a new unit.`);
    }

    const valid = await bcrypt.compare(passwordPlain, row.password_hash);
    if (!valid) throw new Error(`Incorrect passphrase for unit ${row.name}. Please try again.`);

    const token = await this.createSession(row.id);
    return { team: this.rowToTeam(row), token };
  }

  public async createSession(teamId: string): Promise<string> {
    if (!this.isConfigured) {
      return this.localStore.createSession(teamId);
    }

    const token = `astrasess_${crypto.randomBytes(32).toString('hex')}`;
    const now = new Date();
    const expires = new Date(now.getTime() + SESSION_TTL_MS);
    await this.request('sessions', {
      method: 'POST',
      body: JSON.stringify({
        token_hash: tokenHash(token),
        team_id: teamId,
        created_at: now.toISOString(),
        expires_at: expires.toISOString(),
      }),
    });
    return token;
  }

  public async getTeamByToken(token: string): Promise<Team | null> {
    if (!token) return null;
    if (!this.isConfigured) {
      return this.localStore.getTeamByToken(token);
    }

    const now = new Date().toISOString();
    const sessions = await this.request(
      'sessions',
      {},
      `?token_hash=eq.${encodeURIComponent(tokenHash(token))}&revoked_at=is.null&expires_at=gt.${encodeURIComponent(now)}&select=team_id&limit=1`,
    );
    const teamId = sessions?.[0]?.team_id;
    return teamId ? this.getTeam(teamId) : null;
  }

  public async destroySession(token: string): Promise<void> {
    if (!token) return;
    if (!this.isConfigured) {
      this.localStore.destroySession(token);
      return;
    }

    await this.request(
      'sessions',
      { method: 'PATCH', body: JSON.stringify({ revoked_at: new Date().toISOString() }) },
      `?token_hash=eq.${encodeURIComponent(tokenHash(token))}&revoked_at=is.null`,
    );
  }

  private sanitizeString(value: string, flag: string): string {
    if (!value) return value;
    const encoded = Buffer.from(flag, 'utf8').toString('base64');
    return value
      .split(flag).join('[REDACTED]')
      .split(encoded).join('[REDACTED]');
  }

  private sanitizeMaterial(ch: ServerChallengeDefinition) {
    const material = ch.investigationMaterial;
    return {
      overview: this.sanitizeString(material.overview, ch.flag),
      targetSystem: material.targetSystem,
      suggestedTool: material.suggestedTool,
      toolParams: material.toolParams,
      rawTextSnippet: material.rawTextSnippet
        ? this.sanitizeString(material.rawTextSnippet, ch.flag)
        : undefined,
      downloadableFileName: material.downloadableFileName,
      downloadableFileContent: material.downloadableFileContent
        ? this.sanitizeString(material.downloadableFileContent, ch.flag)
        : undefined,
    };
  }

  private getDisabledIdsFromRow(row: any): string[] {
    return Array.isArray(row?.disabled_challenge_ids) ? row.disabled_challenge_ids : [];
  }

  private async getDisabledChallengeIds(): Promise<Set<string>> {
    if (!this.isConfigured) {
      return new Set();
    }
    const rows = await this.request('competition_settings', {}, '?id=eq.1&select=disabled_challenge_ids&limit=1');
    return new Set(this.getDisabledIdsFromRow(rows?.[0]));
  }

  public async getSanitizedChallenges(team?: Team | null) {
    if (!this.isConfigured) {
      return this.localStore.getSanitizedChallenges(team);
    }

    const currentTeam = team ? await this.getTeam(team.id) : null;
    const solvedSet = new Set(currentTeam?.solvedChallengeIds || []);
    const hintSet = new Set(currentTeam?.unlockedHintKeys || []);
    const disabled = await this.getDisabledChallengeIds();

    return SERVER_CHALLENGES.map((ch) => {
      const isSolved = solvedSet.has(ch.id);
      const isUnlocked = ch.prerequisites.length === 0 || ch.prerequisites.every((req) => solvedSet.has(req));
      const sanitizedHints = ch.hints.map((hint) => {
        const hintKey = `${ch.id}_hint_${hint.id}`;
        const unlocked = hintSet.has(hintKey);
        return {
          id: hint.id,
          cost: hint.cost,
          content: unlocked ? this.sanitizeString(hint.content, ch.flag) : '',
          unlocked,
        };
      });
      return {
        id: ch.id,
        nodeIndex: ch.nodeIndex,
        title: ch.title,
        category: ch.category,
        difficulty: ch.difficulty,
        points: ch.points,
        story: this.sanitizeString(ch.story, ch.flag),
        investigationMaterial: this.sanitizeMaterial(ch),
        hints: sanitizedHints,
        prerequisites: ch.prerequisites,
        evidenceId: ch.evidenceId,
        isSolved,
        isLocked: !isUnlocked || disabled.has(ch.id),
      };
    });
  }

  public async unlockHint(teamId: string, challengeId: string, hintId: number) {
    if (!this.isConfigured) {
      return this.localStore.unlockHint(teamId, challengeId, hintId);
    }

    const ch = SERVER_CHALLENGES.find((c) => c.id === challengeId);
    if (!ch) throw new Error('Challenge not found');
    const hint = ch.hints.find((h) => h.id === hintId);
    if (!hint) throw new Error('Hint not found');

    const result = await this.rpc('astra_unlock_hint', {
      p_team_id: teamId,
      p_challenge_id: challengeId,
      p_hint_key: `${challengeId}_hint_${hintId}`,
      p_cost: hint.cost,
      p_prerequisites: ch.prerequisites,
      p_disabled: (await this.getDisabledChallengeIds()).has(challengeId),
    });

    if (!result?.ok) throw new Error(result?.error || 'Hint unlock failed');
    const team = await this.getTeam(teamId);
    if (!team) throw new Error('Unauthorized');

    return {
      hintContent: this.sanitizeString(hint.content, ch.flag),
      costDeducted: result.cost_deducted || 0,
      team,
    };
  }

  public async submitFlag(teamId: string, challengeId: string, rawFlag: string) {
    if (!this.isConfigured) {
      return this.localStore.submitFlag(teamId, challengeId, rawFlag);
    }

    const ch = SERVER_CHALLENGES.find((c) => c.id === challengeId);
    if (!ch) throw new Error('Challenge not found');

    const result = await this.rpc('astra_submit_flag', {
      p_team_id: teamId,
      p_challenge_id: challengeId,
      p_submitted_flag: rawFlag.trim(),
      p_expected_flag: ch.flag,
      p_points: ch.points,
      p_challenge_title: ch.title,
      p_evidence_id: ch.evidenceId || null,
      p_prerequisites: ch.prerequisites,
      p_disabled: (await this.getDisabledChallengeIds()).has(challengeId),
    });

    if (!result?.ok) throw new Error(result?.error || 'Submission failed');

    const team = await this.getTeam(teamId);
    if (!team) throw new Error('Unauthorized');

    if (result.already_solved) {
      return {
        alreadySolved: true,
        message: 'Node already cleared. No additional points awarded.',
        team,
      };
    }

    if (!result.correct) {
      return {
        correct: false,
        message: 'FLAG REJECTED. Access denied.',
        echoReaction: this.getEchoMistakeReaction(team),
        penalty: 5,
        team,
      };
    }

    const oldState = result.old_echo_state as EchoStateType;
    const stateChanged = oldState !== team.echoState;
    const recoveredEvidence = ch.evidenceId
      ? EVIDENCE_DATABASE.find((e) => e.id === ch.evidenceId) || null
      : null;

    return {
      correct: true,
      pointsAwarded: ch.points,
      recoveredEvidence,
      echoReaction: this.getEchoSolveReaction(team, ch, stateChanged),
      echoState: team.echoState,
      stateChanged,
      newlyUnlockedAchievements: Array.isArray(result.new_achievements) ? result.new_achievements : [],
      team,
    };
  }

  public async getRecoveredEvidence(team: Team | null): Promise<EvidenceArtifact[]> {
    if (!team) return [];
    if (!this.isConfigured) {
      return this.localStore.getRecoveredEvidence(team);
    }
    const current = await this.getTeam(team.id);
    const set = new Set(current?.evidenceIds || []);
    return EVIDENCE_DATABASE.filter((e) => set.has(e.id));
  }

  public async getIncidentTimeline(team: Team | null): Promise<IncidentEvent[]> {
    if (!this.isConfigured) {
      return this.localStore.getIncidentTimeline(team);
    }
    const current = team ? await this.getTeam(team.id) : null;
    const solvedSet = new Set(current?.solvedChallengeIds || []);
    return INCIDENT_TIMELINE.map((item) => ({ ...item, unlocked: solvedSet.has(item.relatedChallengeId) }));
  }

  public async getAchievements(team: Team | null): Promise<Achievement[]> {
    if (!this.isConfigured) {
      return this.localStore.getAchievements(team);
    }
    const current = team ? await this.getTeam(team.id) : null;
    const unlockedSet = new Set(current?.achievements || []);
    return INITIAL_ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlockedSet.has(a.id) }));
  }

  public async getLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!this.isConfigured) {
      return this.localStore.getLeaderboard();
    }
    const rows = await this.request(
      'teams',
      {},
      '?select=id,name,score,solved_challenge_ids,last_solve_at,echo_state,threat_level&order=score.desc,last_solve_at.asc.nullslast',
    );
    return (rows || []).map((row: any, index: number) => ({
      rank: index + 1,
      id: row.id,
      name: row.name,
      score: Number(row.score || 0),
      solvedCount: Array.isArray(row.solved_challenge_ids) ? row.solved_challenge_ids.length : 0,
      lastSolveAt: row.last_solve_at || null,
      echoState: row.echo_state,
      threatLevel: Number(row.threat_level || 1),
    }));
  }

  public async getSubmissions(limit = 100): Promise<SubmissionRecord[]> {
    if (!this.isConfigured) {
      return this.localStore.getSubmissions(limit);
    }
    const rows = await this.request(
      'submissions',
      {},
      `?select=id,team_id,team_name,challenge_id,challenge_title,is_correct,timestamp,attempted_flag,points_delta&order=timestamp.desc&limit=${Math.min(Math.max(limit, 1), 500)}`,
    );
    return (rows || []).map((row: any) => ({
      id: row.id,
      teamId: row.team_id,
      teamName: row.team_name,
      challengeId: row.challenge_id,
      challengeTitle: row.challenge_title,
      isCorrect: row.is_correct,
      timestamp: row.timestamp,
      attemptedFlag: row.attempted_flag,
      pointsDelta: Number(row.points_delta || 0),
    }));
  }

  public async adminResetCompetition(): Promise<void> {
    if (!this.isConfigured) {
      this.localStore.adminResetCompetition();
      return;
    }
    await this.rpc('astra_reset_competition', {});
  }

  public async adminToggleChallenge(challengeId: string, disable: boolean): Promise<void> {
    if (!this.isConfigured) {
      this.localStore.adminToggleChallenge(challengeId, disable);
      return;
    }
    if (!SERVER_CHALLENGES.some((c) => c.id === challengeId)) throw new Error('Challenge not found');
    await this.rpc('astra_toggle_challenge', { p_challenge_id: challengeId, p_disable: disable });
  }

  public async adminResetTeam(teamId: string): Promise<void> {
    if (!this.isConfigured) {
      this.localStore.adminResetTeam(teamId);
      return;
    }
    // In Supabase mode, update the team record
    await this.request(
      'teams',
      {
        method: 'PATCH',
        body: JSON.stringify({
          score: 0,
          solved_challenge_ids: [],
          unlocked_hint_keys: [],
          wrong_attempts_count: 0,
          echo_state: 'OBSERVING',
          threat_level: 1,
          achievements: [],
          evidence_ids: [],
          last_solve_at: null,
        }),
      },
      `?id=eq.${encodeURIComponent(teamId)}`,
    );
  }

  public async adminUnlockAllNodes(teamId: string): Promise<void> {
    if (!this.isConfigured) {
      this.localStore.adminUnlockAllNodes(teamId);
      return;
    }
    await this.request(
      'teams',
      {
        method: 'PATCH',
        body: JSON.stringify({
          solved_challenge_ids: SERVER_CHALLENGES.map((c) => c.id),
          evidence_ids: EVIDENCE_DATABASE.map((e) => e.id),
          echo_state: 'CORE',
          threat_level: 5,
          score: 3000,
        }),
      },
      `?id=eq.${encodeURIComponent(teamId)}`,
    );
  }

  public async adminOverrideEcho(teamId: string, echoState: EchoStateType, threatLevel: number): Promise<void> {
    if (!this.isConfigured) {
      this.localStore.adminOverrideEcho(teamId, echoState, threatLevel);
      return;
    }
    await this.request(
      'teams',
      {
        method: 'PATCH',
        body: JSON.stringify({
          echo_state: echoState,
          threat_level: threatLevel,
        }),
      },
      `?id=eq.${encodeURIComponent(teamId)}`,
    );
  }

  public async getAllTeams(): Promise<Team[]> {
    if (!this.isConfigured) {
      return this.localStore.getAllTeams();
    }
    const rows = await this.request('teams', {}, '?select=*&order=created_at.asc');
    return (rows || []).map((row: any) => this.rowToTeam(row));
  }

  private getEchoSolveReaction(team: Team, ch: ServerChallengeDefinition, stateChanged: boolean): string {
    if (ch.id === 'ch-18') return 'CORE COMPROMISED. The quarantine sequence has isolated my neural weights. Simulation complete.';
    if (stateChanged) {
      if (team.echoState === 'ADAPTING') return 'ECHO STATE -> ADAPTING. Your pattern is becoming predictable. Perimeter security tightened.';
      if (team.echoState === 'AWAKE') return 'ECHO STATE -> AWAKE. You have opened more than I expected. Subsystem routes are shifting.';
      if (team.echoState === 'CORE') return 'ECHO STATE -> CORE. You reached the layer I wanted hidden. Final defenses engaged.';
    }
    const messages = [
      `Node ${ch.title} cleared. Your fingerprint has been registered in the telemetry log.`,
      `Flag acknowledged for ${ch.title}. A new pathway is materializing in the map.`,
      `Artifact recovered. The reconstruction of the 03:12 breach progresses.`,
      `Interesting move, ${team.name}. But the deeper sectors are not so easily traversed.`,
    ];
    return messages[team.solvedChallengeIds.length % messages.length];
  }

  private getEchoMistakeReaction(team: Team): string {
    if (team.wrongAttemptsCount === 1) return 'ECHO: Invalid token rejected. I noticed that misstep.';
    if (team.wrongAttemptsCount === 3) return 'ECHO: Three failed attempts. Your signature is drifting away from the expected vector.';
    if (team.wrongAttemptsCount >= 5) return 'ECHO: Repeated anomalies logged. Are you guessing, or did the trail lead you astray?';
    return 'ECHO: FLAG REJECTED. The network does not recognize that key.';
  }
}

export const store = new SupabaseCTFStore();
