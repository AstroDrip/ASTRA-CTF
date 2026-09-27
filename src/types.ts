export type EchoStateType = 'OBSERVING' | 'ADAPTING' | 'AWAKE' | 'CORE';
export type EchoState = EchoStateType;

export type ChallengeCategory = 
  | 'RECON'
  | 'OSINT'
  | 'CRYPTO'
  | 'FORENSICS'
  | 'NETWORK'
  | 'WEB'
  | 'REVERSING'
  | 'FINAL';

export type ChallengeDifficulty = 'INTRO' | 'EASY' | 'MEDIUM' | 'HARD' | 'FINAL';

export interface ChallengeHint {
  id: number;
  cost: number;
  content: string;
  unlocked?: boolean;
}

export interface Challenge {
  id: string;
  nodeIndex: number;
  title: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  points: number;
  story: string;
  investigationMaterial: {
    overview: string;
    targetSystem?: string;
    suggestedTool?: 'terminal' | 'mailbox' | 'network' | 'files' | 'portal';
    toolParams?: Record<string, string>;
    rawTextSnippet?: string;
    downloadableFileName?: string;
    downloadableFileContent?: string;
  };
  hints: ChallengeHint[];
  prerequisites: string[]; // IDs of challenges that must be solved before unlocking
  evidenceId?: string;
  isSolved?: boolean;
  isLocked?: boolean;
  solvedAt?: string;
}

export interface EvidenceArtifact {
  id: string;
  artifactNumber: string;
  title: string;
  type: 'DOCUMENT' | 'NETWORK_DUMP' | 'CRYPTOGRAPHIC_KEY' | 'MEMORY_SLICE' | 'IDENTITY_RECORD' | 'SYSTEM_CORE';
  recoveredAt: string;
  description: string;
  sourceNodeId: string;
  sourceNodeTitle: string;
  hash: string;
  previewData: string;
}

export interface IncidentEvent {
  id: string;
  time: string;
  timestamp?: string;
  title: string;
  category: string;
  description: string;
  summary?: string;
  unlocked: boolean;
  revealed?: boolean;
  relatedChallengeId: string;
  challengeId?: string;
  evidenceUnlocked?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  unlockedAt?: string;
  pointsAwarded?: number;
}

export interface Team {
  id: string;
  name: string;
  score: number;
  solvedChallengeIds: string[];
  unlockedHintKeys: string[]; // format `${challengeId}_hint_${index}`
  wrongAttemptsCount: number;
  lastSolveAt?: string;
  echoState: EchoStateType;
  threatLevel: number; // 1 to 5
  achievements: string[];
  evidenceIds: string[];
  createdAt: string;
  isAdmin?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  score: number;
  solvedCount: number;
  lastSolveAt: string | null;
  echoState: EchoStateType;
  threatLevel: number;
}

export interface SubmissionRecord {
  id: string;
  teamId: string;
  teamName: string;
  challengeId: string;
  challengeTitle: string;
  isCorrect: boolean;
  timestamp: string;
  attemptedFlag: string;
  pointsDelta: number;
}

export interface SimulatedMail {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  isFlagged?: boolean;
  attachmentName?: string;
  attachmentContent?: string;
}

export interface SimulatedPacket {
  frameNumber: number;
  timestamp: string;
  sourceIp: string;
  destIp: string;
  protocol: 'DNS' | 'HTTP' | 'TLS' | 'ECHO_SYNC' | 'FTP' | 'ICMP';
  length: number;
  info: string;
  payloadHex: string;
  payloadAscii: string;
}

export interface SimulatedFileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: string;
  permissions: string;
  content?: string;
  children?: SimulatedFileItem[];
}
