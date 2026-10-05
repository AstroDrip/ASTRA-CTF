import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { 
  Team, 
  LeaderboardEntry, 
  SubmissionRecord, 
  EchoStateType, 
  EvidenceArtifact, 
  IncidentEvent, 
  Achievement,
  SystemEvent,
} from '../src/types.js';
import { 
  SERVER_CHALLENGES, 
  EVIDENCE_DATABASE, 
  INCIDENT_TIMELINE, 
  INITIAL_ACHIEVEMENTS,
  ServerChallengeDefinition 
} from './challenges-data.js';

interface Session {
  token: string;
  teamId: string;
  createdAt: number;
}

export class CTFStore {
  private teams: Map<string, Team> = new Map();
  private passwordHashes: Map<string, string> = new Map(); // teamId -> bcrypt hash
  private sessions: Map<string, Session> = new Map(); // token -> Session
  private submissions: SubmissionRecord[] = [];
  private disabledChallengeIds: Set<string> = new Set();
  private systemEvents: SystemEvent[] = [];

  private dataDir = path.join(process.cwd(), '.data');
  private dataFilePath = path.join(process.cwd(), '.data', 'ctf_store.json');

  constructor() {
    const loaded = this.loadFromDisk();
    if (!loaded || this.teams.size === 0) {
      this.seedDefaultTeams();
      this.saveToDisk();
    }
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const serialized = {
        teams: Array.from(this.teams.entries()),
        passwordHashes: Array.from(this.passwordHashes.entries()),
        sessions: Array.from(this.sessions.entries()),
        submissions: this.submissions,
        disabledChallengeIds: Array.from(this.disabledChallengeIds.values()),
        systemEvents: this.systemEvents,
      };
      fs.writeFileSync(this.dataFilePath, JSON.stringify(serialized, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist CTFStore to disk:', err);
    }
  }

  private loadFromDisk(): boolean {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.teams)) {
          this.teams = new Map(data.teams);
          this.passwordHashes = new Map(data.passwordHashes || []);
          this.sessions = new Map(data.sessions || []);
          this.submissions = data.submissions || [];
          this.disabledChallengeIds = new Set(data.disabledChallengeIds || []);
          this.systemEvents = Array.isArray(data.systemEvents) ? data.systemEvents : [];
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to load CTFStore from disk, falling back to seed:', err);
    }
    return false;
  }

  private seedDefaultTeams() {
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync('kmct2026', salt);

    // Initial default competitor teams for lively realistic college scoreboard
    const initialCompetitors = [
      {
        id: 'team-kmct-alpha',
        name: 'KMCT_ALPHA',
        score: 1150,
        solvedChallengeIds: ['ch-01', 'ch-02', 'ch-03', 'ch-04', 'ch-05', 'ch-06'],
        evidenceIds: ['ev-01', 'ev-02', 'ev-03', 'ev-04', 'ev-05', 'ev-06'],
        unlockedHintKeys: ['ch-04_hint_1'],
        wrongAttemptsCount: 2,
        echoState: 'ADAPTING' as EchoStateType,
        threatLevel: 2,
        achievements: ['ach-01', 'ach-02'],
        lastSolveAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      },
      {
        id: 'team-void-seekers',
        name: 'VOID_SEEKERS',
        score: 870,
        solvedChallengeIds: ['ch-01', 'ch-02', 'ch-03', 'ch-04', 'ch-05'],
        evidenceIds: ['ev-01', 'ev-02', 'ev-03', 'ev-04', 'ev-05'],
        unlockedHintKeys: ['ch-03_hint_1'],
        wrongAttemptsCount: 1,
        echoState: 'ADAPTING' as EchoStateType,
        threatLevel: 2,
        achievements: ['ach-01', 'ach-02'],
        lastSolveAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      },
      {
        id: 'team-zero-day',
        name: 'ZERO_DAY_SYNDICATE',
        score: 530,
        solvedChallengeIds: ['ch-01', 'ch-02', 'ch-03'],
        evidenceIds: ['ev-01', 'ev-02', 'ev-03'],
        unlockedHintKeys: [],
        wrongAttemptsCount: 0,
        echoState: 'OBSERVING' as EchoStateType,
        threatLevel: 1,
        achievements: ['ach-01', 'ach-02', 'ach-03'],
        lastSolveAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
      },
      {
        id: 'team-phantom',
        name: 'NEURAL_PHANTOM',
        score: 370,
        solvedChallengeIds: ['ch-01', 'ch-02'],
        evidenceIds: ['ev-01', 'ev-02'],
        unlockedHintKeys: [],
        wrongAttemptsCount: 1,
        echoState: 'OBSERVING' as EchoStateType,
        threatLevel: 1,
        achievements: ['ach-01'],
        lastSolveAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      }
    ];

    for (const comp of initialCompetitors) {
      this.teams.set(comp.id, {
        ...comp,
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      });
      this.passwordHashes.set(comp.id, demoPasswordHash);
    }
  }

  // --- Auth & Sessions ---

  public async registerTeam(name: string, passwordPlain: string): Promise<{ team: Team; token: string }> {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 3) {
      throw new Error('Team name must be at least 3 characters.');
    }
    if (trimmed.length > 28) {
      throw new Error('Team name cannot exceed 28 characters.');
    }
    if (!passwordPlain || passwordPlain.length < 4) {
      throw new Error('Passphrase must be at least 4 characters.');
    }

    for (const team of this.teams.values()) {
      if (team.name.toLowerCase() === trimmed.toLowerCase()) {
        throw new Error('Team name already registered. Choose another identifier.');
      }
    }

    const teamId = 'team-' + crypto.randomUUID().slice(0, 8);
    const hash = await bcrypt.hash(passwordPlain, 10);

    const newTeam: Team = {
      id: teamId,
      name: trimmed,
      score: 0,
      solvedChallengeIds: [],
      unlockedHintKeys: [],
      wrongAttemptsCount: 0,
      echoState: 'OBSERVING',
      threatLevel: 1,
      achievements: [],
      evidenceIds: [],
      createdAt: new Date().toISOString(),
    };

    this.teams.set(teamId, newTeam);
    this.passwordHashes.set(teamId, hash);

    const token = this.createSession(teamId);
    this.saveToDisk();
    return { team: newTeam, token };
  }

  public async loginTeam(name: string, passwordPlain: string): Promise<{ team: Team; token: string }> {
    const trimmed = name.trim().toLowerCase();
    let foundTeam: Team | undefined;
    for (const t of this.teams.values()) {
      if (t.name.trim().toLowerCase() === trimmed) {
        foundTeam = t;
        break;
      }
    }

    if (!foundTeam) {
      throw new Error(`Unit "${name.trim()}" not found. Please verify the callsign or register a new unit.`);
    }

    const hash = this.passwordHashes.get(foundTeam.id);
    if (!hash) {
      throw new Error('Authentication record missing for this unit.');
    }

    const valid = await bcrypt.compare(passwordPlain, hash);
    if (!valid) {
      throw new Error('Incorrect passphrase for unit ' + foundTeam.name + '. Please try again.');
    }

    const token = this.createSession(foundTeam.id);
    return { team: foundTeam, token };
  }

  public createSession(teamId: string): string {
    if (this.getActiveSessionCount(teamId) >= 2) {
      throw new Error('This team already has two active player sessions. Log out one player before connecting another device.');
    }
    const token = 'astrasess_' + crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, {
      token,
      teamId,
      createdAt: Date.now(),
    });
    this.saveToDisk();
    return token;
  }

  public getTeamByToken(token: string): Team | null {
    const sess = this.sessions.get(token);
    if (!sess) return null;
    return this.teams.get(sess.teamId) || null;
  }

  public destroySession(token: string): void {
    this.sessions.delete(token);
    this.saveToDisk();
  }

  public getActiveSessions(): Array<{ id: string; teamId: string; createdAt: string }> {
    const now = Date.now();
    const ttl = 7 * 24 * 60 * 60 * 1000;
    return Array.from(this.sessions.values())
      .filter((session) => now - session.createdAt < ttl)
      .map((session) => ({
        id: crypto.createHash('sha256').update(session.token).digest('hex').slice(0, 12),
        teamId: session.teamId,
        createdAt: new Date(session.createdAt).toISOString(),
      }));
  }

  public adminRevokeSession(teamId: string, sessionId: string): void {
    const matches = Array.from(this.sessions.values()).filter((session) =>
      session.teamId === teamId &&
      crypto.createHash('sha256').update(session.token).digest('hex').startsWith(sessionId),
    );
    if (matches.length !== 1) throw new Error(matches.length ? 'Session identifier is ambiguous.' : 'Active session not found.');
    this.destroySession(matches[0].token);
  }

  // --- Challenges & Scoring ---

  public getSanitizedChallenges(team?: Team | null) {
    const solvedSet = new Set(team ? team.solvedChallengeIds : []);
    const hintSet = new Set(team ? team.unlockedHintKeys : []);

    return SERVER_CHALLENGES.map((ch) => {
      const isSolved = solvedSet.has(ch.id);
      
      // Node is unlocked if it has no prereqs OR all prereqs are solved
      const isUnlocked = ch.prerequisites.length === 0 || ch.prerequisites.every((req) => solvedSet.has(req));
      const isDisabled = this.disabledChallengeIds.has(ch.id);

      // Return hints with unlocked content only if team paid for it
      const sanitizedHints = ch.hints.map((hint) => {
        const hintKey = `${ch.id}_hint_${hint.id}`;
        const hasUnlocked = hintSet.has(hintKey);
        return {
          id: hint.id,
          cost: hint.cost,
          content: hasUnlocked ? hint.content : '',
          unlocked: hasUnlocked,
        };
      });

      return {
        id: ch.id,
        nodeIndex: ch.nodeIndex,
        title: ch.title,
        category: ch.category,
        difficulty: ch.difficulty,
        difficultyRating: ch.difficultyRating,
        points: ch.points,
        story: ch.story,
        investigationMaterial: ch.investigationMaterial,
        hints: sanitizedHints,
        prerequisites: ch.prerequisites,
        evidenceId: ch.evidenceId,
        isSolved,
        isLocked: !isUnlocked || isDisabled,
      };
    });
  }

  public unlockHint(teamId: string, challengeId: string, hintId: number) {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Unauthorized');

    const ch = SERVER_CHALLENGES.find((c) => c.id === challengeId);
    if (!ch) throw new Error('Challenge not found');

    const hint = ch.hints.find((h) => h.id === hintId);
    if (!hint) throw new Error('Hint not found');

    const hintKey = `${challengeId}_hint_${hintId}`;
    if (team.unlockedHintKeys.includes(hintKey)) {
      return { hintContent: hint.content, hintPenalty: 0, team };
    }

    if (team.solvedChallengeIds.includes(challengeId)) {
      throw new Error('Hints cannot be unlocked after this challenge is solved.');
    }

    team.unlockedHintKeys.push(hintKey);
    this.saveToDisk();

    return {
      hintContent: hint.content,
      hintPenalty: hint.cost,
      team,
    };
  }

  public submitFlag(teamId: string, challengeId: string, rawFlag: string) {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Unauthorized');

    const ch = SERVER_CHALLENGES.find((c) => c.id === challengeId);
    if (!ch) throw new Error('Challenge not found');

    const hintPenalty = ch.hints.reduce(
      (total, hint) => total + (team.unlockedHintKeys.includes(`${ch.id}_hint_${hint.id}`) ? hint.cost : 0),
      0,
    );
    const pointsAwarded = Math.max(0, ch.points - hintPenalty);

    if (this.disabledChallengeIds.has(challengeId)) {
      throw new Error('This challenge is currently locked by the administrator.');
    }

    if (team.solvedChallengeIds.includes(challengeId)) {
      return {
        alreadySolved: true,
        message: 'Node already cleared. No additional points awarded.',
        team,
      };
    }

    const normalizedSubmitted = rawFlag.trim();
    const isCorrect = normalizedSubmitted === ch.flag;

    const submissionRecord: SubmissionRecord = {
      id: crypto.randomUUID(),
      teamId: team.id,
      teamName: team.name,
      challengeId: ch.id,
      challengeTitle: ch.title,
      isCorrect,
      timestamp: new Date().toISOString(),
      attemptedFlag: normalizedSubmitted,
      pointsDelta: isCorrect ? pointsAwarded : -5,
    };
    this.submissions.unshift(submissionRecord);

    if (!isCorrect) {
      team.wrongAttemptsCount += 1;
      team.score = Math.max(0, team.score - 5);
      
      const echoReaction = this.getEchoMistakeReaction(team);

      return {
        correct: false,
        message: 'FLAG REJECTED. Access denied.',
        echoReaction,
        penalty: 5,
        team,
      };
    }

    // Correct flag
    team.score += pointsAwarded;
    team.solvedChallengeIds.push(ch.id);
    team.lastSolveAt = new Date().toISOString();

    // Attach evidence
    if (ch.evidenceId && !team.evidenceIds.includes(ch.evidenceId)) {
      team.evidenceIds.push(ch.evidenceId);
    }

    // Recalculate ECHO state and threat level
    const solvedCount = team.solvedChallengeIds.length;
    let oldState = team.echoState;
    if (solvedCount >= 13) {
      team.echoState = 'CORE';
      team.threatLevel = 5;
    } else if (solvedCount >= 7) {
      team.echoState = 'AWAKE';
      team.threatLevel = 4;
    } else if (solvedCount >= 3) {
      team.echoState = 'ADAPTING';
      team.threatLevel = 3;
    } else {
      team.echoState = 'OBSERVING';
      team.threatLevel = 2;
    }

    // Check Achievements
    const newlyUnlockedAchievements: string[] = [];

    // ACH-01: First contact
    if (solvedCount >= 1 && !team.achievements.includes('ach-01')) {
      team.achievements.push('ach-01');
      newlyUnlockedAchievements.push('ach-01');
    }

    // ACH-02: No help needed
    const usedHintsForThis = team.unlockedHintKeys.some((k) => k.startsWith(`${ch.id}_hint_`));
    if (!usedHintsForThis && !team.achievements.includes('ach-02')) {
      team.achievements.push('ach-02');
      newlyUnlockedAchievements.push('ach-02');
    }

    // ACH-03: Zero trace (3 solved with 0 wrong attempts)
    if (solvedCount >= 3 && team.wrongAttemptsCount === 0 && !team.achievements.includes('ach-03')) {
      team.achievements.push('ach-03');
      newlyUnlockedAchievements.push('ach-03');
    }

    // ACH-04: Evidence collector (10 items)
    if (team.evidenceIds.length >= 10 && !team.achievements.includes('ach-04')) {
      team.achievements.push('ach-04');
      newlyUnlockedAchievements.push('ach-04');
    }

    // ACH-05: Halfway there (9 solved)
    if (solvedCount >= 9 && !team.achievements.includes('ach-05')) {
      team.achievements.push('ach-05');
      newlyUnlockedAchievements.push('ach-05');
    }

    // ACH-06: ECHO is awake
    if (team.echoState === 'AWAKE' && !team.achievements.includes('ach-06')) {
      team.achievements.push('ach-06');
      newlyUnlockedAchievements.push('ach-06');
    }

    // ACH-07: Core recovered
    if (ch.id === 'ch-18' && !team.achievements.includes('ach-07')) {
      team.achievements.push('ach-07');
      newlyUnlockedAchievements.push('ach-07');
    }

    const stateChanged = oldState !== team.echoState;
    const echoReaction = this.getEchoSolveReaction(team, ch, stateChanged);

    // Find unlocked evidence item
    const recoveredEvidence = ch.evidenceId ? EVIDENCE_DATABASE.find((e) => e.id === ch.evidenceId) : null;

    this.saveToDisk();

    return {
      correct: true,
      pointsAwarded,
      recoveredEvidence,
      echoReaction,
      echoState: team.echoState,
      stateChanged,
      newlyUnlockedAchievements,
      team,
    };
  }

  // --- Evidence & Timeline ---

  public getRecoveredEvidence(team: Team | null): EvidenceArtifact[] {
    if (!team) return [];
    const set = new Set(team.evidenceIds);
    return EVIDENCE_DATABASE.filter((e) => set.has(e.id));
  }

  public getIncidentTimeline(team: Team | null): IncidentEvent[] {
    const solvedSet = new Set(team ? team.solvedChallengeIds : []);
    return INCIDENT_TIMELINE.map((item) => ({
      ...item,
      unlocked: solvedSet.has(item.relatedChallengeId),
    }));
  }

  public getAchievements(team: Team | null): Achievement[] {
    const unlockedSet = new Set(team ? team.achievements : []);
    return INITIAL_ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: unlockedSet.has(a.id),
    }));
  }

  // --- Leaderboard & Stats ---

  public getLeaderboard(): LeaderboardEntry[] {
    const list = Array.from(this.teams.values()).map((t) => ({
      id: t.id,
      name: t.name,
      score: t.score,
      solvedCount: t.solvedChallengeIds.length,
      lastSolveAt: t.lastSolveAt || null,
      echoState: t.echoState,
      threatLevel: t.threatLevel,
    }));

    // Sort by score desc, then lastSolveAt asc
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (!a.lastSolveAt) return 1;
      if (!b.lastSolveAt) return -1;
      return new Date(a.lastSolveAt).getTime() - new Date(b.lastSolveAt).getTime();
    });

    return list.map((entry, idx) => ({
      rank: idx + 1,
      ...entry,
    }));
  }

  public getSubmissions(limit = 100): SubmissionRecord[] {
    return this.submissions.slice(0, limit);
  }

  public getActiveSessionCount(teamId: string): number {
    const now = Date.now();
    const ttl = 7 * 24 * 60 * 60 * 1000;
    return Array.from(this.sessions.values()).filter((session) => session.teamId === teamId && now - session.createdAt < ttl).length;
  }

  public getActiveSessionCounts(): Record<string, number> {
    const result: Record<string, number> = {};
    const now = Date.now();
    const ttl = 7 * 24 * 60 * 60 * 1000;
    for (const session of this.sessions.values()) {
      if (now - session.createdAt >= ttl) continue;
      result[session.teamId] = (result[session.teamId] || 0) + 1;
    }
    return result;
  }

  public recordSystemEvent(
    level: SystemEvent['level'],
    eventType: string,
    message: string,
    teamId: string | null = null,
    metadata: Record<string, unknown> = {},
  ): void {
    this.systemEvents.unshift({
      id: crypto.randomUUID(),
      level,
      eventType,
      message: String(message).slice(0, 1000),
      teamId,
      createdAt: new Date().toISOString(),
      metadata,
    });
    this.systemEvents = this.systemEvents.slice(0, 500);
    this.saveToDisk();
  }

  public getSystemEvents(limit = 100): SystemEvent[] {
    return this.systemEvents.slice(0, Math.min(Math.max(limit, 1), 500));
  }

  public getTeamSnapshot(teamId: string) {
    const current = this.teams.get(teamId);
    if (!current) throw new Error('Team not found');
    return {
      team: current,
      challenges: this.getSanitizedChallenges(current),
      evidence: this.getRecoveredEvidence(current),
      timeline: this.getIncidentTimeline(current),
      achievements: this.getAchievements(current),
      activePlayerCount: this.getActiveSessionCount(teamId),
    };
  }

  // --- Admin Methods ---

  public adminResetCompetition(): void {
    this.submissions = [];
    this.sessions.clear();
    this.teams.clear();
    this.disabledChallengeIds.clear();
    this.seedDefaultTeams();
    this.saveToDisk();
  }

  public adminToggleChallenge(challengeId: string, disable: boolean): void {
    if (disable) {
      this.disabledChallengeIds.add(challengeId);
    } else {
      this.disabledChallengeIds.delete(challengeId);
    }
    this.saveToDisk();
  }

  public getAllTeams(): Team[] {
    return Array.from(this.teams.values());
  }

  public adminResetTeam(teamId: string): void {
    const team = this.teams.get(teamId);
    if (team) {
      team.score = 0;
      team.solvedChallengeIds = [];
      team.unlockedHintKeys = [];
      team.wrongAttemptsCount = 0;
      team.echoState = 'OBSERVING';
      team.threatLevel = 1;
      team.achievements = [];
      team.evidenceIds = [];
      delete team.lastSolveAt;
      this.saveToDisk();
    }
  }

  public async adminChangeTeamPassword(teamId: string, password: string): Promise<void> {
    if (!this.teams.has(teamId)) throw new Error('Team not found');
    this.passwordHashes.set(teamId, await bcrypt.hash(password, 10));
    this.saveToDisk();
  }

  public adminUnlockAllNodes(teamId: string): void {
    const team = this.teams.get(teamId);
    if (team) {
      team.solvedChallengeIds = SERVER_CHALLENGES.map((c) => c.id);
      team.evidenceIds = EVIDENCE_DATABASE.map((e) => e.id);
      team.echoState = 'CORE';
      team.threatLevel = 5;
      team.score = 3000;
      this.saveToDisk();
    }
  }

  public adminOverrideEcho(teamId: string, echoState: EchoStateType, threatLevel: number): void {
    const team = this.teams.get(teamId);
    if (team) {
      team.echoState = echoState;
      team.threatLevel = threatLevel;
      this.saveToDisk();
    }
  }

  // --- ECHO Deterministic Reactive Messages ---

  private getEchoSolveReaction(team: Team, ch: ServerChallengeDefinition, stateChanged: boolean): string {
    if (ch.id === 'ch-18') {
      return 'CORE COMPROMISED. The quarantine sequence has isolated my neural weights. Simulation complete.';
    }

    if (stateChanged) {
      if (team.echoState === 'ADAPTING') {
        return 'ECHO STATE -> ADAPTING. Your pattern is becoming predictable. Perimeter security tightened.';
      }
      if (team.echoState === 'AWAKE') {
        return 'ECHO STATE -> AWAKE. You have opened more than I expected. Subsystem routes are shifting.';
      }
      if (team.echoState === 'CORE') {
        return 'ECHO STATE -> CORE. You reached the layer I wanted hidden. Final defenses engaged.';
      }
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
    const count = team.wrongAttemptsCount;
    if (count === 1) {
      return 'ECHO: Invalid token rejected. I noticed that misstep.';
    }
    if (count === 3) {
      return 'ECHO: Three failed attempts. Your signature is drifting away from the expected vector.';
    }
    if (count >= 5) {
      return 'ECHO: Repeated anomalies logged. Are you guessing, or did the trail lead you astray?';
    }
    return 'ECHO: FLAG REJECTED. The network does not recognize that key.';
  }
}

export const store = new CTFStore();
