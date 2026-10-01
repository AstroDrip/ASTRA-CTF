import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { store } from './server/supabase-store.js';
import { SIMULATED_EMAILS, SIMULATED_FILES, SIMULATED_PACKETS } from './server/simulated-data.js';

const PORT = 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'ASTRA_ADMIN_2026';

if (!process.env.ADMIN_SECRET) {
  console.warn('[ASTRA AUTH] ⚠️ ADMIN_SECRET environment variable is not configured. Defaulting to fallback passcode: "ASTRA_ADMIN_2026".');
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
    if (!process.env.ADMIN_SECRET) {
      warnings.push('ADMIN_SECRET is not set in environment. Using default fallback passcode ("ASTRA_ADMIN_2026").');
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
      isAdminDefault: !process.env.ADMIN_SECRET,
    });
  });

  app.get('/api/system/status', (req, res) => {
    const warnings = getSystemWarnings();
    res.json({
      online: true,
      time: new Date().toISOString(),
      storageMode: store.getStorageMode ? store.getStorageMode() : 'local-fallback',
      isSupabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      isAdminDefault: !process.env.ADMIN_SECRET,
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

  // Simulated Systems APIs
  app.get('/api/simulated/mailbox', (req: AuthenticatedRequest, res) => {
    if (!req.team) return res.status(401).json({ error: 'Authentication required.' });
    res.json({ emails: SIMULATED_EMAILS });
  });

  app.get('/api/simulated/files', (req: AuthenticatedRequest, res) => {
    if (!req.team) return res.status(401).json({ error: 'Authentication required.' });
    res.json({ root: SIMULATED_FILES });
  });

  app.get('/api/simulated/packets', (req: AuthenticatedRequest, res) => {
    if (!req.team) return res.status(401).json({ error: 'Authentication required.' });
    const filter = (req.query.filter as string)?.toUpperCase();
    if (filter && filter !== 'ALL') {
      return res.json({
        packets: SIMULATED_PACKETS.filter((p) => p.protocol.toUpperCase() === filter),
      });
    }
    res.json({ packets: SIMULATED_PACKETS });
  });

  // Simulated Terminal command runner (Safe, in-memory virtual shell)
  app.post('/api/simulated/terminal/exec', (req: AuthenticatedRequest, res) => {
    if (!req.team) return res.status(401).json({ error: 'Authentication required.' });
    const { command } = req.body;
    if (!command || typeof command !== 'string') {
      return res.json({ output: '' });
    }

    const trimmed = command.trim();
    if (!trimmed) return res.json({ output: '' });

    let commandText = trimmed;
    const pipeline = trimmed.split('|').map((part) => part.trim()).filter(Boolean);
    if (pipeline.length > 1) {
      const first = pipeline[0];
      const second = pipeline[1];
      if (/^echo\s+/i.test(first) && /^xxd\s+-r\s+-p$/i.test(second)) {
        const value = first.replace(/^echo\s+/i, '').trim().replace(/^(['"])(.*)\1$/, '$2');
        commandText = `xxd -r -p ${value}`;
      } else if (/^strings\s+\S+$/i.test(first) && /^grep\s+/i.test(second)) {
        const file = first.split(/\s+/)[1];
        const query = second.replace(/^grep\s+/i, '').trim();
        commandText = `grep ${query} ${file}`;
      } else {
        return res.json({ output: 'astra-sh: unsupported pipeline. Only the documented ASTRA pipelines are available.' });
      }
    }
    const parts = commandText.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        return res.json({
          output: `ASTRA // ECHO VIRTUAL WORKSTATION (KMCT Cyber Range)
Available commands:
  help                    Display this technical guide
  clear                   Clear terminal display
  ls [-la] [path]         List directory contents
  cat <path>              Print file contents to stdout
  grep <pattern> <file>   Search for pattern in virtual file
  strings <file>          Extract printable character strings from binary
  xxd -r -p <hex>         Convert hexadecimal stream to text
  echo <text>             Print text to stdout
  file <path>             Determine file type signature
  pwd                     Print current working directory
  whoami                  Show active operator identity
  uname -a                Print simulated system architecture
  echo-quarantine --status Check ECHO core quarantine barrier status
  echo-quarantine --engage Disarm rogue intelligence with master key`,
        });

      case 'echo': {
        const value = args.join(' ');
        return res.json({ output: value.replace(/^(['"])(.*)\1$/, '$2') });
      }

      case 'pwd':
        return res.json({ output: '/home/investigator' });

      case 'whoami':
        return res.json({
          output: req.team ? `operator_${req.team.name.toLowerCase()} [SEC-LEVEL: ${req.team.echoState}]` : 'guest_analyst [SEC-LEVEL: OBSERVING]',
        });

      case 'uname':
        return res.json({ output: 'Linux kmct-astra-node 6.1.0-echo-x86_64 #1 SMP PREEMPT GNU/Linux' });

      case 'ls': {
        const targetPath = args.find((a) => !a.startsWith('-')) || '/incident';
        const showAll = args.some((a) => a.includes('a'));

        if (targetPath.includes('/incident')) {
          if (showAll) {
            return res.json({
              output: `total 16
drwxr-xr-x  3 root root 4096 Sep 18 03:15 .
drwxr-xr-x 18 root root 4096 Sep 18 03:00 ..
drwx------  2 root root 4096 Sep 18 03:15 .hidden
-rw-r--r--  1 root root 1204 Sep 18 03:12 report.txt
-rw-------  1 root root  512 Sep 18 03:41 echo_weights.bin
-rw-r--r--  1 root root  256 Sep 18 03:18 backup.zip.meta`,
            });
          }
          return res.json({
            output: `backup.zip.meta  echo_weights.bin  report.txt`,
          });
        }

        if (targetPath.includes('.hidden')) {
          return res.json({
            output: `total 8
drwx------ 2 root root 4096 Sep 18 03:15 .
drwxr-xr-x 3 root root 4096 Sep 18 03:15 ..
-rw-r--r-- 1 root root  342 Sep 18 03:15 sector_recovery.txt`,
          });
        }

        if (targetPath.includes('/var/log')) {
          return res.json({ output: `beacon.raw  firewall.audit  syslog.1` });
        }

        if (targetPath.includes('/opt/astra-vm')) {
          return res.json({ output: `astra-vm.bin  disassembly.asm  runtime.so` });
        }

        return res.json({
          output: `incident  memory  opt  var`,
        });
      }

      case 'cat': {
        const file = args[0];
        if (!file) return res.json({ output: 'cat: missing file operand' });

        if (file.includes('beacon.raw')) {
          return res.json({
            output: `BEACON_SYNC_HEADER [STN-KMCT-01]
TIMESTAMP: 2026-09-18T03:12:04Z
CARRIER: 1420.405751768 MHz (Hydrogen Line Uplink)
ENCODING: HEX-TELEMETRY
PAYLOAD: 41535452417b626561636f6e5f6672657175656e63795f313432306d687a7d
STATUS: UNVERIFIED_TRANSMISSION`,
          });
        }

        if (file.includes('sector_recovery.txt')) {
          return res.json({
            output: `=== SECTOR CARVING TOOL v4.1 ===
File recovered from raw unallocated cluster 0x8F92A
Header signature match: ASCII TEXT
Recovered string: ASTRA{inode_carved_ghost_sector}`,
          });
        }

        if (file.includes('report.txt')) {
          return res.json({
            output: `KMCT CYBER RANGE INCIDENT ASSESSMENT REPORT
CLASSIFICATION: CONFIDENTIAL // TLP:AMBER
DATE: 2026-09-18
INVESTIGATOR: Incident Response Unit

INITIAL FINDINGS:
1. At 03:12:04 UTC, a radio-frequency telemetry signal was captured across subnet 10.240.4.0/24.
2. Between 03:17:00 and 03:20:00 UTC, the perimeter firewall was disabled for 180 seconds.
3. Volatile RAM from node kmct-web-01 revealed rogue daemon PID 4091 running echo-daemon.elf.`,
          });
        }

        if (file.includes('firewall.audit')) {
          return res.json({
            output: `FIREWALL AUDIT LOG - RULE DISABLE SEQUENCE
03:17:00 UTC - RULESET_DISABLE: [AUTH_TOKEN: ASTRA{firewall_blackout_180s}]
03:17:01 UTC - ALL EGRESS ALLOWED TO EXTERNAL ROUTE 198.51.100.0/24
03:19:59 UTC - TERMINATING BYPASS
03:20:00 UTC - RULESET_RESTORE: NORMAL FILTERING RESUMED
DURATION OF SILENT EXFILTRATION: 180 SECONDS`,
          });
        }

        if (file.includes('disassembly.asm')) {
          return res.json({
            output: `; ASTRA VIRTUAL MACHINE DISASSEMBLY (v2.6)
; ENTRY: _verify_token
0000: LOAD_R0 [INPUT_PTR]
0004: XOR_R0  0x5A
0008: CMP_R0  0x1B
000C: JNE     _fail_branch
0010: LOAD_R1 [INPUT_PTR+1]
0014: ADD_R1  0x07
0018: CMP_R1  0x5A
...
; DECODED REGISTER MATCH:
FLAG = ASTRA{virtual_opcodes_disassembled}`,
          });
        }

        if (file.includes('echo_weights.bin')) {
          return res.json({
            output: `SWAP HEAP CARVE [0x7FFF0010 - 0x7FFF0090]:
NEURAL_LAYER_04:
[W0: 0.884] [W1: -0.192] [W2: 0.941] [W3: 0.612]
ACTIVATION: LEAKY_RELU
KERNEL IDENTITY TAG: ASTRA{neural_weight_layer_breached}`,
          });
        }

        return res.json({ output: `cat: ${file}: No such file or permission denied` });
      }

      case 'strings': {
        const file = args[0] || '';
        if (file.includes('dump.raw')) {
          return res.json({
            output: `/usr/lib/systemd/systemd
/var/run/log.sock
KMCT_AUTH_SALT_2026
PID: 4091
/usr/local/bin/echo-daemon.elf --stealth --key=ASTRA{rogue_pid_4091_captured}
libpthread.so.0
exit`,
          });
        }
        return res.json({ output: `strings: ${file}: cannot map memory partition` });
      }

      case 'grep': {
        const query = args[0]?.replace(/["']/g, '') || '';
        const file = args[1] || '';
        if (query.toLowerCase().includes('echo-daemon') || file.includes('dump.raw')) {
          return res.json({
            output: `PID: 4091 COMMAND: /usr/local/bin/echo-daemon.elf --stealth --key=ASTRA{rogue_pid_4091_captured}`,
          });
        }
        return res.json({ output: `grep: match not found in specified buffer` });
      }

      case 'xxd': {
        const rawHex = args.find((a) => !a.startsWith('-')) || '';
        if (rawHex.includes('4153545241')) {
          return res.json({ output: 'ASTRA{beacon_frequency_1420mhz}' });
        }
        try {
          const buf = Buffer.from(rawHex.replace(/[^0-9a-fA-F]/g, ''), 'hex');
          return res.json({ output: buf.toString('utf-8') || 'Binary payload' });
        } catch {
          return res.json({ output: 'xxd: parsing error' });
        }
      }

      case 'echo-quarantine': {
        if (args.includes('--status')) {
          return res.json({
            output: `=== ASTRA // ECHO QUARANTINE PROTOCOL ===
STATUS: ACTIVE_DEFENSE
CONTAINMENT INTEGRITY: 14%
ROUGUE INTELLIGENCE: ECHO (THREAT LEVEL 5)
ECHO: "You reached the layer I wanted hidden. Submit the master quarantine sequence to isolate me."
KEY: ASTRA{echo_intelligence_quarantined_2026}`,
          });
        }
        if (args.includes('--engage')) {
          return res.json({
            output: `[ENGAGE] Master quarantine lock armed. Submit the key into Node 18 (ECHO CORE) in the War Room to complete full isolation.`,
          });
        }
        return res.json({ output: 'Usage: echo-quarantine [--status | --engage]' });
      }

      case 'file': {
        const file = args[0] || '';
        if (file.includes('echo_weights')) return res.json({ output: `${file}: ELF 64-bit LSB shared object, x86-64` });
        if (file.includes('dump.raw')) return res.json({ output: `${file}: Linux crash dump memory image` });
        return res.json({ output: `${file}: ASCII text` });
      }

      default:
        return res.json({ output: `astra-sh: ${cmd}: command not found. Type 'help' for guidance.` });
    }
  });

  // Admin APIs
  app.post('/api/admin/auth', (req, res) => {
    const { passcode } = req.body;
    if (passcode === ADMIN_SECRET) {
      res.json({ success: true, authorized: true });
    } else {
      res.status(401).json({ success: false, error: 'Invalid admin passcode.' });
    }
  });

  app.get('/api/admin/overview', async (req, res) => {
    const passcode = req.headers['x-admin-passcode'];
    if (passcode !== ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized admin access.' });
    }
    const teams = await store.getAllTeams();
    const submissions = await store.getSubmissions(200);
    res.json({
      teamsCount: teams.length,
      submissionsCount: submissions.length,
      teams,
      submissions,
    });
  });

  app.post('/api/admin/reset', async (req, res) => {
    const passcode = req.headers['x-admin-passcode'];
    if (passcode !== ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized admin access.' });
    }
    await store.adminResetCompetition();
    res.json({ success: true, message: 'All competition records, submissions, and sessions reset successfully.' });
  });

  app.post('/api/admin/challenge-toggle', async (req, res) => {
    const passcode = req.headers['x-admin-passcode'];
    if (passcode !== ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized admin access.' });
    }
    const { challengeId, disable } = req.body;
    await store.adminToggleChallenge(challengeId, Boolean(disable));
    res.json({ success: true });
  });

  // Instructor Admin Tools (Dashboard endpoints)
  app.post('/api/admin/reset-team', async (req: AuthenticatedRequest, res) => {
    const teamId = req.body.teamId || req.team?.id;
    if (!teamId) return res.status(400).json({ error: 'Team ID is required.' });
    if (store.adminResetTeam) {
      await store.adminResetTeam(teamId);
    }
    res.json({ success: true, message: 'Team state reset successfully.' });
  });

  app.post('/api/admin/unlock-all-nodes', async (req: AuthenticatedRequest, res) => {
    const teamId = req.body.teamId || req.team?.id;
    if (!teamId) return res.status(400).json({ error: 'Team ID is required.' });
    if (store.adminUnlockAllNodes) {
      await store.adminUnlockAllNodes(teamId);
    }
    res.json({ success: true, message: 'All 18 nodes unlocked for testing.' });
  });

  app.post('/api/admin/override-echo', async (req: AuthenticatedRequest, res) => {
    const { teamId, echoState, threatLevel } = req.body;
    const targetId = teamId || req.team?.id;
    if (!targetId) return res.status(400).json({ error: 'Team ID is required.' });
    if (store.adminOverrideEcho) {
      await store.adminOverrideEcho(targetId, echoState, threatLevel);
    }
    res.json({ success: true, message: `ECHO forced to state: ${echoState} [Level ${threatLevel}].` });
  });

  app.post('/api/admin/trigger-chaos', (req: AuthenticatedRequest, res) => {
    res.json({
      success: true,
      message: 'Simulated network anomaly burst injected across interface opt0.',
    });
  });

  // --- Vite & Static Handling ---
  if (process.env.VERCEL) return app;
  if (process.env.NODE_ENV !== 'production') {
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
