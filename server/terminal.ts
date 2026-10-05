import crypto from 'crypto';
import { posix } from 'path';
import { SERVER_CHALLENGES } from './challenges-data.js';
import { SIMULATED_FILES } from './simulated-data.js';
import { Team } from '../src/types.js';

export interface TerminalResult {
  output: string;
  cwd: string;
}

interface ShellContext {
  cwd: string;
  team: Team;
  stdin?: string;
}

function normalizePath(input: string, cwd: string): string {
  const candidate = input === '~' ? '/home/investigator' : input.startsWith('/') ? input : posix.join(cwd, input);
  const normalized = posix.normalize(candidate);
  return normalized === '.' ? '/' : normalized;
}

function challengeUnlocked(team: Team, challengeId: string): boolean {
  const challenge = SERVER_CHALLENGES.find((item) => item.id === challengeId);
  if (!challenge) return false;
  const solved = new Set(team.solvedChallengeIds || []);
  return challenge.prerequisites.every((id) => solved.has(id));
}

function redactLockedFlags(content: string, team: Team): string {
  let output = content;
  for (const challenge of SERVER_CHALLENGES) {
    if (!challengeUnlocked(team, challenge.id) && !team.solvedChallengeIds.includes(challenge.id)) {
      output = output.split(challenge.flag).join('[REDACTED_UNTIL_NODE_UNLOCKED]');
    }
  }
  return output;
}

function walkFiles(items: any[], path: string): any | null {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = walkFiles(item.children, path);
      if (found) return found;
    }
  }
  return null;
}

function directoryExists(path: string): boolean {
  if (path === '/') return true;
  const item = walkFiles(SIMULATED_FILES as any[], path);
  return Boolean(item && item.type === 'dir');
}

function readFile(path: string, team: Team): string | null {
  const item = walkFiles(SIMULATED_FILES as any[], path);
  if (!item || item.type !== 'file') return null;
  return redactLockedFlags(item.content || '', team);
}

function listDirectory(path: string, showAll: boolean, team: Team): string {
  const target = normalizePath(path, '/');
  const item = target === '/' ? { children: SIMULATED_FILES } : walkFiles(SIMULATED_FILES as any[], target);
  if (!item || item.type === 'file') return `ls: cannot access '${path}': No such file or directory`;
  const children = item.children || [];
  const visible = showAll ? children : children.filter((child: any) => !child.name.startsWith('.'));
  if (showAll) {
    return [
      'total ' + visible.length,
      ...visible.map((child: any) => `${child.type === 'dir' ? 'drwxr-xr-x' : child.permissions} ${child.size.padStart(8)} ${child.name}`),
    ].join('\n');
  }
  return visible.map((child: any) => child.name).join('  ') || '';
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (escaped) current += '\\';
  if (current) tokens.push(current);
  return tokens;
}

function splitPipeline(command: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;
  let escaped = false;
  for (const char of command) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      current += char;
      escaped = true;
      continue;
    }
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      current += char;
      quote = char;
    } else if (char === '|') {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

function flagFor(id: string): string {
  const challenge = SERVER_CHALLENGES.find((item) => item.id === id);
  return challenge?.flag || '';
}

function requireUnlocked(team: Team, challengeId: string): string | null {
  if (!challengeUnlocked(team, challengeId)) {
    return 'astra-sh: command unavailable until the corresponding node is unlocked.';
  }
  return null;
}

async function executeSingle(raw: string, ctx: ShellContext): Promise<TerminalResult> {
  const args = tokenize(raw);
  if (!args.length) return { output: '', cwd: ctx.cwd };
  const cmd = args[0].toLowerCase();
  const values = args.slice(1);

  switch (cmd) {
    case 'help':
      return {
        output: `ASTRA // ECHO VIRTUAL WORKSTATION (SANDBOX SHELL)
COMMANDS
  help                         "List available commands and usage."
  clear                        "Clear the terminal display."
  pwd                          "Show the current virtual directory."
  cd <path>                    "Change to a virtual directory."
  ls [-la] [path]              "List directory contents; -a includes hidden files."
  cat <file>                   "Display a file's contents."
  head [-n N] <file>           "Display the first N lines (10 by default)."
  tail [-n N] <file>           "Display the last N lines (10 by default)."
  grep [-i] <pattern> [file]   "Find matching lines; -i ignores case."
  strings <file>               "Extract readable text from a simulated binary."
  file <path>                  "Identify a simulated file's type."
  xxd -r -p [hex]              "Decode hexadecimal bytes; accepts piped input."
  base64 -d [text]             "Decode Base64; --decode is an alias for -d."
  sha256sum [file]             "Show a SHA-256 digest for a file or piped input."
  rev [text]                   "Reverse text or piped input."
  echo [-n] <text>             "Print text; -n omits the newline."
  printf <text>                 "Print text without adding a newline."
  uname -a                     "Show virtual system information."
  whoami                       "Show the simulated operator identity."

INVESTIGATION KEYWORDS
  astra-vm verify <token>      "Validate the VM token and recover its fragment."
  evidence-merge --verify
    <timestamp:pid:cluster>    "Verify a tuple assembled from evidence."
  tls-inspect --session <tag>  "Validate a TLS session tag and reveal its route."
  hash-hall verify <password>  "Verify the recovered HASH HALL credential."
  echo-quarantine --status     "Inspect quarantine state and the required sequence."
  echo-quarantine --engage
    <sequence>                 "Attempt isolation with the recovered fragments."

SYNTAX
  Use | to pass one command's output to the next, for example:
    cat /var/log/beacon.raw | grep -i payload
  Quote text containing spaces, for example: echo "incident report"
  Investigation commands become available as their challenge nodes unlock.
  This is a fictional sandbox; commands only access simulated range data.`,
        cwd: ctx.cwd,
      };
    case 'clear':
      return { output: '', cwd: ctx.cwd };
    case 'pwd':
      return { output: ctx.cwd, cwd: ctx.cwd };
    case 'cd': {
      const requested = values[0] || '/home/investigator';
      const next = normalizePath(requested, ctx.cwd);
      if (!directoryExists(next)) return { output: `-bash: cd: ${requested}: No such file or directory`, cwd: ctx.cwd };
      return { output: '', cwd: next };
    }
    case 'ls': {
      const showAll = values.some((value) => /^-[^-]*a/.test(value) || value === '-a' || value === '-la' || value === '-al');
      const target = values.find((value) => !value.startsWith('-')) || ctx.cwd;
      return { output: listDirectory(normalizePath(target, ctx.cwd), showAll, ctx.team), cwd: ctx.cwd };
    }
    case 'cat': {
      if (!values.length) return { output: 'cat: missing file operand', cwd: ctx.cwd };
      const outputs: string[] = [];
      for (const value of values) {
        const target = normalizePath(value, ctx.cwd);
        const content = readFile(target, ctx.team);
        if (content === null) outputs.push(`cat: ${value}: No such file or directory`);
        else outputs.push(content);
      }
      return { output: outputs.join('\n'), cwd: ctx.cwd };
    }
    case 'head':
    case 'tail': {
      let count = 10;
      const fileArgIndex = values.findIndex((value) => !value.startsWith('-') && !/^\d+$/.test(value));
      const nIndex = values.findIndex((value) => value === '-n');
      if (nIndex >= 0 && values[nIndex + 1]) count = Math.max(1, Number(values[nIndex + 1]) || 10);
      const file = values[fileArgIndex >= 0 ? fileArgIndex : values.length - 1];
      if (!file) return { output: `${cmd}: missing file operand`, cwd: ctx.cwd };
      const content = readFile(normalizePath(file, ctx.cwd), ctx.team);
      if (content === null) return { output: `${cmd}: ${file}: No such file or directory`, cwd: ctx.cwd };
      const lines = content.split('\n');
      return { output: (cmd === 'head' ? lines.slice(0, count) : lines.slice(-count)).join('\n'), cwd: ctx.cwd };
    }
    case 'grep': {
      let insensitive = false;
      const clean = values.filter((value) => {
        if (value === '-i') {
          insensitive = true;
          return false;
        }
        return true;
      });
      const pattern = clean[0]?.replace(/^(['"])(.*)\1$/, '$2') || '';
      const file = clean[1];
      const source = ctx.stdin !== undefined
        ? ctx.stdin
        : file ? readFile(normalizePath(file, ctx.cwd), ctx.team) : '';
      if (source === null || source === undefined) return { output: `grep: ${file || pattern}: No such file or directory`, cwd: ctx.cwd };
      const needle = insensitive ? pattern.toLowerCase() : pattern;
      const matched = source.split('\n').filter((line) => (insensitive ? line.toLowerCase() : line).includes(needle));
      return { output: matched.join('\n') || 'grep: no matches found', cwd: ctx.cwd };
    }
    case 'strings': {
      const file = values[0];
      if (!file) return { output: 'strings: missing file operand', cwd: ctx.cwd };
      const content = readFile(normalizePath(file, ctx.cwd), ctx.team);
      return content === null ? { output: `strings: ${file}: No such file or directory`, cwd: ctx.cwd } : { output: content.replace(/[^\x20-\x7E\n\r\t]/g, ''), cwd: ctx.cwd };
    }
    case 'xxd': {
      if (!(values[0] === '-r' && values[1] === '-p')) return { output: 'xxd: this sandbox supports only xxd -r -p', cwd: ctx.cwd };
      const input = ctx.stdin ?? values.slice(2).join('');
      try {
        const buf = Buffer.from(input.replace(/\s+/g, ''), 'hex');
        return { output: buf.toString('utf8') || 'Binary payload', cwd: ctx.cwd };
      } catch {
        return { output: 'xxd: parsing error', cwd: ctx.cwd };
      }
    }
    case 'echo': {
      const noNewline = values[0] === '-n';
      const output = noNewline ? values.slice(1).join(' ') : values.join(' ');
      return { output, cwd: ctx.cwd };
    }
    case 'printf':
      return { output: values.join(' '), cwd: ctx.cwd };
    case 'sha256sum': {
      const input = ctx.stdin !== undefined ? ctx.stdin : values[0] ? (readFile(normalizePath(values[0], ctx.cwd), ctx.team) || '') : '';
      const digest = crypto.createHash('sha256').update(input).digest('hex');
      return { output: `${digest}  -`, cwd: ctx.cwd };
    }
    case 'base64': {
      if (values[0] !== '-d' && values[0] !== '--decode') return { output: 'base64: sandbox supports only base64 -d', cwd: ctx.cwd };
      const input = ctx.stdin !== undefined ? ctx.stdin : values.slice(1).join('');
      try {
        return { output: Buffer.from(input.trim(), 'base64').toString('utf8'), cwd: ctx.cwd };
      } catch {
        return { output: 'base64: invalid input', cwd: ctx.cwd };
      }
    }
    case 'rev': {
      const input = ctx.stdin !== undefined ? ctx.stdin : values.join(' ');
      return { output: input.split('').reverse().join(''), cwd: ctx.cwd };
    }
    case 'file': {
      const file = values[0] || '';
      const target = normalizePath(file, ctx.cwd);
      if (!walkFiles(SIMULATED_FILES as any[], target)) return { output: `${file}: cannot open`, cwd: ctx.cwd };
      if (file.endsWith('.raw')) return { output: `${file}: Linux crash dump memory image`, cwd: ctx.cwd };
      if (file.endsWith('.bin')) return { output: `${file}: ASTRA virtual binary data`, cwd: ctx.cwd };
      if (file.endsWith('.asm')) return { output: `${file}: ASCII assembler source`, cwd: ctx.cwd };
      return { output: `${file}: ASCII text`, cwd: ctx.cwd };
    }
    case 'uname':
      return { output: 'Linux kmct-astra-node 6.1.0-echo-x86_64 #1 SMP PREEMPT GNU/Linux', cwd: ctx.cwd };
    case 'whoami':
      return { output: `operator_${ctx.team.name.toLowerCase()} [SEC-LEVEL: ${ctx.team.echoState}]`, cwd: ctx.cwd };
    case 'hash-hall': {
      if (values[0] !== 'verify' || !values[1]) return { output: 'hash-hall: usage: hash-hall verify <password>', cwd: ctx.cwd };
      const gate = requireUnlocked(ctx.team, 'ch-12');
      if (gate) return { output: gate, cwd: ctx.cwd };
      if (values.slice(1).join(' ') !== 'cyberstorm2026!') return { output: 'HASH HALL REJECTED: credential does not match the supplied SHA-256 digest.', cwd: ctx.cwd };
      return { output: `PASSWORD VERIFIED\nTARGET: sec_officer\nRECOVERY FLAG: ${flagFor('ch-12')}`, cwd: ctx.cwd };
    }
    case 'astra-vm': {
      if (values[0] !== 'verify' || !values[1]) return { output: 'astra-vm: usage: astra-vm verify <token>', cwd: ctx.cwd };
      const gate = requireUnlocked(ctx.team, 'ch-14');
      if (gate) return { output: gate, cwd: ctx.cwd };
      if (values[1] !== 'VM-ORACLE') return { output: 'VM REJECTED: token transformation mismatch.', cwd: ctx.cwd };
      return { output: `VM ACCEPTED\nRECOVERED FRAGMENT: ORBIT-17\nFLAG: ${flagFor('ch-14')}`, cwd: ctx.cwd };
    }
    case 'evidence-merge': {
      if (values[0] !== '--verify' || !values[1]) return { output: 'evidence-merge: usage: evidence-merge --verify "timestamp:pid:cluster"', cwd: ctx.cwd };
      const gate = requireUnlocked(ctx.team, 'ch-15');
      if (gate) return { output: gate, cwd: ctx.cwd };
      if (values[1] !== '03:17:4091:0x8F92A') return { output: 'TRIAD REJECTED: correlation tuple does not match recovered evidence.', cwd: ctx.cwd };
      return { output: `TRIAD VERIFIED\nFLAG: ${flagFor('ch-15')}`, cwd: ctx.cwd };
    }
    case 'tls-inspect': {
      if (values[0] !== '--session' || !values[1]) return { output: 'tls-inspect: usage: tls-inspect --session <tag>', cwd: ctx.cwd };
      const gate = requireUnlocked(ctx.team, 'ch-16');
      if (gate) return { output: gate, cwd: ctx.cwd };
      if (values[1] !== 'QUAD-8443') return { output: 'TLS SESSION REJECTED: invalid session tag.', cwd: ctx.cwd };
      return { output: `SESSION AUTHENTICATED\nROUTE: core-uplink.echo.internal:8443\nFLAG: ${flagFor('ch-16')}`, cwd: ctx.cwd };
    }
    case 'echo-quarantine': {
      if (values.includes('--status')) {
        return { output: `=== ASTRA // ECHO QUARANTINE PROTOCOL ===\nSTATUS: FULLY_AWAKE\nCONTAINMENT INTEGRITY: 14%\nROGUE INTELLIGENCE: ECHO (THREAT LEVEL 5)\nREQUIRED SEQUENCE: VM FRAGMENT : TLS SESSION : CORE FRAGMENT\nREADY STATE: WAITING`, cwd: ctx.cwd };
      }
      if (values.includes('--engage')) {
        const gate = requireUnlocked(ctx.team, 'ch-18');
        if (gate) return { output: gate, cwd: ctx.cwd };
        const sequence = values[values.indexOf('--engage') + 1] || '';
        if (sequence !== 'ORBIT-17:QUAD-8443:9A7C') return { output: '[ENGAGE] Sequence rejected. ECHO remains contained but active.', cwd: ctx.cwd };
        return { output: `QUARANTINE SEQUENCE ACCEPTED\nCORE ISOLATION COMPLETE\nFLAG: ${flagFor('ch-18')}`, cwd: ctx.cwd };
      }
      return { output: 'Usage: echo-quarantine [--status | --engage <sequence>]', cwd: ctx.cwd };
    }
    default:
      return { output: `astra-sh: ${cmd}: command not found. Type 'help' for guidance.`, cwd: ctx.cwd };
  }
}

export async function executeVirtualTerminal(command: string, team: Team, cwd = '/home/investigator'): Promise<TerminalResult> {
  const pipeline = splitPipeline(command.trim());
  if (!pipeline.length) return { output: '', cwd };
  let currentCwd = cwd;
  let stdin: string | undefined;
  for (const segment of pipeline) {
    const result = await executeSingle(segment, { team, cwd: currentCwd, stdin });
    currentCwd = result.cwd;
    stdin = result.output;
  }
  return { output: stdin || '', cwd: currentCwd };
}
