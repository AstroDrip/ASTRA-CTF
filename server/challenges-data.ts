import { Challenge, EvidenceArtifact, IncidentEvent } from '../src/types.js';

export interface ServerChallengeDefinition extends Challenge {
  flag: string; // Stored securely on server, NEVER sent to client
}

export const SERVER_CHALLENGES: ServerChallengeDefinition[] = [
  {
    id: 'ch-01',
    nodeIndex: 1,
    title: 'THE SIGNAL',
    category: 'RECON',
    difficulty: 'INTRO',
    points: 100,
    story: 'At 03:12 UTC, automated listening posts at KMCT detected an anomalous radio-over-IP beacon repeating across campus subnet 10.240.4.0/24. The signal appears structured, broadcasting a repetitive telemetry handshake containing encoded operational parameters.',
    investigationMaterial: {
      overview: 'Inspect the beacon broadcast log in the Simulated Terminal or analyze the raw telemetry header below.',
      suggestedTool: 'terminal',
      toolParams: { command: 'cat /var/log/beacon.raw' },
      rawTextSnippet: `BEACON_SYNC_HEADER [STN-KMCT-01]
TIMESTAMP: 2026-09-18T03:12:04Z
CARRIER: 1420.405751768 MHz (Hydrogen Line Uplink)
ENCODING: HEX-TELEMETRY
PAYLOAD: 41535452417b626561636f6e5f6672657175656e63795f313432306d687a7d
STATUS: UNVERIFIED_TRANSMISSION`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Look at the PAYLOAD field in the beacon header. It is encoded in hexadecimal (starts with 41 53 54 52 41...).' },
      { id: 2, cost: 50, content: 'Hex 41 = A, 53 = S, 54 = T, 52 = R, 41 = A, 7b = {. Convert the whole hex string to ASCII.' },
      { id: 3, cost: 75, content: 'You can use the terminal command: echo "41535452417b626561636f6e5f6672657175656e63795f313432306d687a7d" | xxd -r -p' },
    ],
    prerequisites: [],
    evidenceId: 'ev-01',
    flag: 'ASTRA{beacon_frequency_1420mhz}',
  },
  {
    id: 'ch-02',
    nodeIndex: 2,
    title: 'DEAD LETTER',
    category: 'OSINT',
    difficulty: 'INTRO',
    points: 120,
    story: 'A discarded email was intercepted inside the campus mail spool routed from an external pseudo-anonymous account. The sender left behind a suspicious GPG signature comment and an identity tag pointing to an alias known as "Drifter".',
    investigationMaterial: {
      overview: 'Open the Simulated Mailbox. Check the message from unknown@echo.local sent to security@campus.local.',
      suggestedTool: 'mailbox',
      toolParams: { emailId: 'mail-02' },
      rawTextSnippet: `From: unknown@echo.local
To: security@campus.local
Subject: [CONFIDENTIAL] Warning regarding project ASTRA
X-Originating-IP: 198.51.100.42
X-Agent-Identity: QVNURkF7YWdlbnRfZHJpZnRlcl91bm1hc2tlZH0=

Do not trust the automated network responses. ECHO has established persistence.`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Check the email headers in the mailbox. Look for X-Agent-Identity.' },
      { id: 2, cost: 50, content: 'The value ends with an equal sign (=), which strongly suggests Base64 encoding.' },
      { id: 3, cost: 75, content: 'Decode the base64 string QVNURkF7YWdlbnRfZHJpZnRlcl91bm1hc2tlZH0= to reveal the flag.' },
    ],
    prerequisites: ['ch-01'],
    evidenceId: 'ev-02',
    flag: 'ASTRA{agent_drifter_unmasked}',
  },
  {
    id: 'ch-03',
    nodeIndex: 3,
    title: 'GHOST FILE',
    category: 'FORENSICS',
    difficulty: 'INTRO',
    points: 150,
    story: 'Digital forensics investigators mounted an image of the campus staging server. While standard file listings seem sanitized, an unlinked hidden inode was discovered in the /incident/ partition with preserved metadata.',
    investigationMaterial: {
      overview: 'Explore the /incident/ directory using the Simulated File Explorer or inspect hidden directory entries with the terminal.',
      suggestedTool: 'files',
      toolParams: { path: '/incident/.hidden' },
      rawTextSnippet: `PATH: /incident/.hidden/sector_recovery.txt
INODE: #49281 (Deleted at 03:15:22 UTC)
CARVED_CONTENT:
=== SECTOR CARVING TOOL v4.1 ===
File recovered from raw unallocated cluster 0x8F92A
Header signature match: ASCII TEXT
Recovered string: ASTRA{inode_carved_ghost_sector}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'In Linux filesystems, files starting with a period (.) are hidden by default.' },
      { id: 2, cost: 50, content: 'Use the Simulated File Explorer to browse into /incident/ and toggle hidden files, or run "ls -la /incident" in the terminal.' },
      { id: 3, cost: 75, content: 'Inspect /incident/.hidden/sector_recovery.txt using "cat /incident/.hidden/sector_recovery.txt".' },
    ],
    prerequisites: ['ch-01'],
    evidenceId: 'ev-03',
    flag: 'ASTRA{inode_carved_ghost_sector}',
  },
  {
    id: 'ch-04',
    nodeIndex: 4,
    title: 'MIRROR ROOM',
    category: 'CRYPTO',
    difficulty: 'INTRO',
    points: 160,
    story: 'An encrypted transmission caught in the optical router buffer was labeled "MIRROR_CIPHER". The telemetry indicates that every character was rotated through a classic symmetric shift before being mirrored.',
    investigationMaterial: {
      overview: 'Analyze the intercepted cipher buffer captured from optical interface opt0.',
      rawTextSnippet: `BUFFER CAPTURE: OPT-RX-04
ALGORITHM: ROT13(REVERSE(CIPHER))
ENCRYPTED TEXT: }77_abvgprysre_ebeevz_31gbe{NEGFN
NOTE: The stream was transmitted backwards and rotated by 13 positions.`,
    },
    hints: [
      { id: 1, cost: 25, content: 'First reverse the string character-by-character.' },
      { id: 2, cost: 50, content: 'Reversing "}77_abvgprysre_ebeevz_31gbe{NEGFN" yields "NFGEN{ebg13_zeveer_refslypbr_77}".' },
      { id: 3, cost: 75, content: 'Apply ROT13 cipher rotation to the reversed string (N -> A, F -> S, G -> T...).' },
    ],
    prerequisites: ['ch-02', 'ch-03'],
    evidenceId: 'ev-04',
    flag: 'ASTRA{rot13_mirror_reflection_77}',
  },
  {
    id: 'ch-05',
    nodeIndex: 5,
    title: 'PACKET WHISPER',
    category: 'NETWORK',
    difficulty: 'EASY',
    points: 180,
    story: 'Network monitors captured an odd spike in recursive DNS requests right before the perimeter link went dark. Instead of standard lookups, a series of suspicious subdomains were queried against a rogue nameserver.',
    investigationMaterial: {
      overview: 'Open the Simulated Network Viewer and filter for DNS protocol packets, or review the packet capture extract.',
      suggestedTool: 'network',
      toolParams: { filter: 'DNS' },
      rawTextSnippet: `FRAME 42 - 03:17:11.204 UTC
SRC: 10.240.4.88 -> DST: 8.8.8.8
DNS Standard Query 0x3f1a TXT
QUERY: QVNURkF7ZG5zX3R1bm5lbF93aGlzcGVyXzMxN30=.tunnel.echo.local
DNS Response: Answer: "OK"`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Inspect the DNS TXT query names. The subdomain prefix looks like Base64 encoding.' },
      { id: 2, cost: 50, content: 'Extract the string: QVNURkF7ZG5zX3R1bm5lbF93aGlzcGVyXzMxN30=' },
      { id: 3, cost: 75, content: 'Base64 decoding that subdomain reveals the covert tunnel flag.' },
    ],
    prerequisites: ['ch-04'],
    evidenceId: 'ev-05',
    flag: 'ASTRA{dns_tunnel_whisper_317}',
  },
  {
    id: 'ch-06',
    nodeIndex: 6,
    title: 'FALSE DOOR',
    category: 'WEB',
    difficulty: 'EASY',
    points: 200,
    story: 'The campus infrastructure hosts an internal administration gateway at gateway.campus.local. The main login button is locked with a client-side restriction, but security audits reported an undocumented header override.',
    investigationMaterial: {
      overview: 'Access the Simulated Web Portal to inspect the Campus Gateway, check developer comments, and test header overrides.',
      suggestedTool: 'portal',
      toolParams: { app: 'gateway' },
      rawTextSnippet: `GATEWAY INSPECTION:
GET /admin/gateway HTTP/1.1
Host: gateway.campus.local

<!-- SECURITY NOTE: Direct bypass enabled for maintenance. -->
<!-- Set header 'X-Bypass-Token: 0x99_ADMIN_GATEWAY' to authorize elevated response. -->
FLAG: ASTRA{bypass_header_gate_passed}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Open the Simulated Web Portal and choose "Campus Admin Gateway".' },
      { id: 2, cost: 50, content: 'Inspect the page source / audit comments or test setting the developer bypass header.' },
      { id: 3, cost: 75, content: 'The header X-Bypass-Token reveals the flag directly in the gateway response.' },
    ],
    prerequisites: ['ch-04'],
    evidenceId: 'ev-06',
    flag: 'ASTRA{bypass_header_gate_passed}',
  },
  {
    id: 'ch-07',
    nodeIndex: 7,
    title: 'MEMORY TRACE',
    category: 'FORENSICS',
    difficulty: 'EASY',
    points: 220,
    story: 'Volatile RAM acquired from the compromised web node was dumped to disk. An analyst noticed a process masquerading as a system logger with an abnormal PID and memory footprint.',
    investigationMaterial: {
      overview: 'Use the Simulated Terminal to run memory analysis commands on /memory/dump.raw.',
      suggestedTool: 'terminal',
      toolParams: { command: 'strings /memory/dump.raw | grep -i "echo-daemon"' },
      rawTextSnippet: `MEMORY DUMP EXCERPT [OFFSET 0x004F2000]:
PID: 4091
COMMAND: /usr/local/bin/echo-daemon.elf --stealth --key=ASTRA{rogue_pid_4091_captured}
PPID: 1 (systemd)
THREADS: 4
VIRTUAL_SIZE: 134217728 bytes`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Run "strings /memory/dump.raw" or search for "echo-daemon" in the memory file.' },
      { id: 2, cost: 50, content: 'Look at the command line arguments passed to the daemon process.' },
      { id: 3, cost: 75, content: 'The flag is passed in the --key argument of rogue PID 4091.' },
    ],
    prerequisites: ['ch-05', 'ch-06'],
    evidenceId: 'ev-07',
    flag: 'ASTRA{rogue_pid_4091_captured}',
  },
  {
    id: 'ch-08',
    nodeIndex: 8,
    title: 'SPLIT KEY',
    category: 'CRYPTO',
    difficulty: 'EASY',
    points: 240,
    story: 'The threat actor split a critical decryption key into two separate XOR shares: Share A was found in Evidence Artifact #4 (Mirror Room), and Share B was discovered in the optical router configuration.',
    investigationMaterial: {
      overview: 'Combine Share A and Share B using XOR or analyze the cryptographic fusion block.',
      rawTextSnippet: `CRYPTOGRAPHIC SPLIT SHARES:
SHARE A (HEX): 12 1e 07 01 12 28 3b 3c 0c 1c 38 16 06 1e 10 03 3a 1d 07 16 02 1c 1b 17 07 19 07 2e
SHARE B (HEX): 53 4d 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53 53
XOR COMBINATION RESULT = ASTRA{xor_keys_fused_into_truth}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'XOR sharing: Key = Share_A XOR Share_B. Each byte of Share A is XORed with 0x53.' },
      { id: 2, cost: 50, content: '0x12 XOR 0x53 = 0x41 (\'A\'), 0x1e XOR 0x53 = 0x4d (\'S\'), 0x07 XOR 0x53 = 0x54 (\'T\').' },
      { id: 3, cost: 75, content: 'Following through the byte array unlocks ASTRA{xor_keys_fused_into_truth}.' },
    ],
    prerequisites: ['ch-07'],
    evidenceId: 'ev-08',
    flag: 'ASTRA{xor_keys_fused_into_truth}',
  },
  {
    id: 'ch-09',
    nodeIndex: 9,
    title: 'THREE MINUTES',
    category: 'RECON',
    difficulty: 'EASY',
    points: 250,
    story: 'Firewall telemetry records show that between 03:17:00 and 03:20:00 (exactly three minutes or 180 seconds), all perimeter egress filtering was silently dropped before resuming normal enforcement.',
    investigationMaterial: {
      overview: 'Inspect the firewall audit log to confirm the exact blackout duration and authorization ticket.',
      suggestedTool: 'terminal',
      toolParams: { command: 'cat /var/log/firewall.audit' },
      rawTextSnippet: `FIREWALL AUDIT LOG - RULE DISABLE SEQUENCE
03:17:00 UTC - RULESET_DISABLE: [AUTH_TOKEN: ASTRA{firewall_blackout_180s}]
03:17:01 UTC - ALL EGRESS ALLOWED TO EXTERNAL ROUTE 198.51.100.0/24
03:20:00 UTC - RULESET_RESTORE: NORMAL FILTERING RESUMED
DURATION OF SILENT EXFILTRATION: 180 SECONDS`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Review the firewall audit log in the terminal: /var/log/firewall.audit.' },
      { id: 2, cost: 50, content: 'Focus on the entry timestamped 03:17:00 when the blackout was authorized.' },
      { id: 3, cost: 75, content: 'The AUTH_TOKEN parameter contains the exact flag.' },
    ],
    prerequisites: ['ch-07'],
    evidenceId: 'ev-09',
    flag: 'ASTRA{firewall_blackout_180s}',
  },
  {
    id: 'ch-10',
    nodeIndex: 10,
    title: 'STATIC KEY',
    category: 'WEB',
    difficulty: 'MEDIUM',
    points: 280,
    story: 'An internal web audit viewer bundles a client-side validation script that hashes administrative tokens. Security analysts suspected the cryptographic salt was hardcoded into the compiled JavaScript asset.',
    investigationMaterial: {
      overview: 'Open the Simulated Web Portal, navigate to the "Audit Log Explorer", and inspect the client script.',
      suggestedTool: 'portal',
      toolParams: { app: 'audit' },
      rawTextSnippet: `AUDIT SCRIPT ASSET: /assets/auth-verify.min.js
function verifySignature(userToken) {
  const STATIC_SALT = "ASTRA{client_obfuscated_static_seed}";
  const hash = sha256(userToken + ":" + STATIC_SALT);
  return hash === expectedHash;
}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Client-side scripts are completely visible to users. Inspect the assets in the Web Portal.' },
      { id: 2, cost: 50, content: 'View the script bundle for the Audit Viewer in the simulated portal.' },
      { id: 3, cost: 75, content: 'The STATIC_SALT constant is the flag you need.' },
    ],
    prerequisites: ['ch-08', 'ch-09'],
    evidenceId: 'ev-10',
    flag: 'ASTRA{client_obfuscated_static_seed}',
  },
  {
    id: 'ch-11',
    nodeIndex: 11,
    title: 'REGEX ROOM',
    category: 'WEB',
    difficulty: 'MEDIUM',
    points: 300,
    story: 'An input validation filter was implemented to block access to the campus core parameters. The regular expression contains a flaw that allows crafted payloads to bypass the filter.',
    investigationMaterial: {
      overview: 'Review the filter specification on the security portal or test regex patterns.',
      suggestedTool: 'portal',
      toolParams: { app: 'filter' },
      rawTextSnippet: `FILTER REGEX: ^(admin|root|user)(.*)(override)$
VULNERABILITY: Line terminator injection (%0A) allows newline bypass.
ACCEPTED PROOF PAYLOAD: admin%0Aoverride
RESPONSE REVEALED: ASTRA{regex_denial_bypass_unlocked}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Standard dot (.) in regular expressions does not match newline characters unless the dotAll (s) flag is set.' },
      { id: 2, cost: 50, content: 'Check the regex test form in the Simulated Web Portal.' },
      { id: 3, cost: 75, content: 'Submitting the newline bypass pattern returns the validation flag.' },
    ],
    prerequisites: ['ch-10'],
    evidenceId: 'ev-11',
    flag: 'ASTRA{regex_denial_bypass_unlocked}',
  },
  {
    id: 'ch-12',
    nodeIndex: 12,
    title: 'HASH HALL',
    category: 'CRYPTO',
    difficulty: 'MEDIUM',
    points: 320,
    story: 'A compromised password database shadow file contains a hashed administrative credential for user "sec_officer". Security policies mandate a known common dictionary password.',
    investigationMaterial: {
      overview: 'Crack the SHA-256 hash or inspect the cracked credential artifact.',
      rawTextSnippet: `TARGET USER: sec_officer
HASH ALGORITHM: SHA-256
HASH: 8b067cfd720a4b08dc0ec66d9539420067bd686fa7fcf2e9e6ca3a0ec3f3565e
CRACKED PLAINTEXT: cyberstorm2026!
SYSTEM RECOVERY FLAG: ASTRA{shadow_hash_cracked_cipher}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'The target hash is 8b067cfd720a4b08dc0ec66d9539420067bd686fa7fcf2e9e6ca3a0ec3f3565e.' },
      { id: 2, cost: 50, content: 'Running a standard college cyber wordlist matches the password "cyberstorm2026!".' },
      { id: 3, cost: 75, content: 'In the hash hall investigation database, testing this plaintext yields ASTRA{shadow_hash_cracked_cipher}.' },
    ],
    prerequisites: ['ch-10'],
    evidenceId: 'ev-12',
    flag: 'ASTRA{shadow_hash_cracked_cipher}',
  },
  {
    id: 'ch-13',
    nodeIndex: 13,
    title: 'MAIL CHAIN',
    category: 'OSINT',
    difficulty: 'MEDIUM',
    points: 340,
    story: 'A prolonged email exchange between campus administrators and a spoofed contractor was mapped out. By tracing the DKIM and Received-SPF headers across four hops, investigators pinpointed the original relay server.',
    investigationMaterial: {
      overview: 'Open the Simulated Mailbox, find the thread between admin@campus.local and echo-contractor, and inspect the raw email headers.',
      suggestedTool: 'mailbox',
      toolParams: { emailId: 'mail-04' },
      rawTextSnippet: `MAIL HEADER TRACE:
Received: from relay-asia-04.echo-transit.net (198.51.100.89)
DKIM-Signature: v=1; a=rsa-sha256; d=echo-transit.net; s=astra2026;
Authentication-Results: spf=softfail; dkim=pass (header.i=@echo-transit.net)
X-Transit-Route-Tag: ASTRA{dkim_spoofed_transit_route}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Open the Simulated Mailbox and look for the email with subject "Re: Urgent Core Infrastructure Migration".' },
      { id: 2, cost: 50, content: 'Click "View Raw Headers" to inspect the routing trace.' },
      { id: 3, cost: 75, content: 'Check the X-Transit-Route-Tag header in the final mail hop.' },
    ],
    prerequisites: ['ch-11', 'ch-12'],
    evidenceId: 'ev-13',
    flag: 'ASTRA{dkim_spoofed_transit_route}',
  },
  {
    id: 'ch-14',
    nodeIndex: 14,
    title: 'MEMORY MAP',
    category: 'REVERSING',
    difficulty: 'MEDIUM',
    points: 360,
    story: 'A custom virtual machine bytecode interpreter was left inside the campus staging directory (/opt/astra-vm). Disassembling the main validation loop reveals the register checks required to clear execution.',
    investigationMaterial: {
      overview: 'Disassemble the virtual machine instructions using the Simulated Terminal or review the opcode trace below.',
      suggestedTool: 'terminal',
      toolParams: { command: 'cat /opt/astra-vm/disassembly.asm' },
      rawTextSnippet: `DISASSEMBLY OF ASTRA_VM CHECK:
0000: LOAD_R0 [INPUT_PTR]
0004: XOR_R0  0x5A
0008: CMP_R0  0x1B
000C: JNE     FAIL
...
DECODED REGISTER MATCH:
FLAG = ASTRA{virtual_opcodes_disassembled}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'In the terminal, run "cat /opt/astra-vm/disassembly.asm".' },
      { id: 2, cost: 50, content: 'The virtual machine performs a byte-by-byte comparison against transformed input.' },
      { id: 3, cost: 75, content: 'The decoded register match string at the bottom of the disassembly is your flag.' },
    ],
    prerequisites: ['ch-13'],
    evidenceId: 'ev-14',
    flag: 'ASTRA{virtual_opcodes_disassembled}',
  },
  {
    id: 'ch-15',
    nodeIndex: 15,
    title: 'EVIDENCE MERGE',
    category: 'FORENSICS',
    difficulty: 'HARD',
    points: 400,
    story: 'To reconstruct the attacker\'s master identity, three distinct forensic artifacts must be correlated: the incident blackout timestamp from Ch 9, the rogue process PID from Ch 7, and the carved cluster address from Ch 3.',
    investigationMaterial: {
      overview: 'Check your Evidence Locker. Combine: Timestamp (03:17) + PID (4091) + Cluster (0x8F92A) into the forensic verification engine.',
      rawTextSnippet: `FORENSIC CORRELATION ENGINE:
TRIAD PARAMETERS:
[A] Blackout Timestamp: 03:17
[B] Rogue Daemon PID: 4091
[C] Carved Sector Cluster: 0x8F92A
HASH COMPUTED: SHA256(03:17:4091:0x8F92A)
TRIAD CONFIRMATION: ASTRA{merged_forensic_triad_confirmed}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'This challenge uses the ECHO Memory signature mechanic. Review recovered Evidence Artifacts #3, #7, and #9.' },
      { id: 2, cost: 50, content: 'The required triad is the blackout time (03:17), the daemon PID (4091), and the cluster (0x8F92A).' },
      { id: 3, cost: 75, content: 'Entering this triad into the evidence correlation verifies: ASTRA{merged_forensic_triad_confirmed}.' },
    ],
    prerequisites: ['ch-14'],
    evidenceId: 'ev-15',
    flag: 'ASTRA{merged_forensic_triad_confirmed}',
  },
  {
    id: 'ch-16',
    nodeIndex: 16,
    title: 'THE DECOY',
    category: 'NETWORK',
    difficulty: 'HARD',
    points: 440,
    story: 'ECHO established thousands of high-frequency decoy packet streams across ports 80, 443, and 8080 to distract security sensors. However, analyzing packet entropy isolated a single covert TLS stream over port 8443.',
    investigationMaterial: {
      overview: 'Use the Simulated Network Viewer, filter out the noisy HTTP traffic, and examine the stream on port 8443.',
      suggestedTool: 'network',
      toolParams: { filter: 'TLS' },
      rawTextSnippet: `STREAM 992 [COVERT_CHANNEL]:
TCP 10.240.4.88:49214 -> 198.51.100.99:8443 [TLSv1.3]
SERVER_NAME_INDICATION: core-uplink.echo.internal
SESSION TICKET EXTENSION (DECRYPTED):
ASTRA{honeypot_evaded_covert_8443}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Filter packets for TLS in the Network Viewer. Ignore the hundreds of HTTP decoy frames.' },
      { id: 2, cost: 50, content: 'Look at the stream directed to destination port 8443.' },
      { id: 3, cost: 75, content: 'Inspect the session ticket extension for the decrypted payload string.' },
    ],
    prerequisites: ['ch-15'],
    evidenceId: 'ev-16',
    flag: 'ASTRA{honeypot_evaded_covert_8443}',
  },
  {
    id: 'ch-17',
    nodeIndex: 17,
    title: 'CORE MEMORY',
    category: 'REVERSING',
    difficulty: 'HARD',
    points: 500,
    story: 'Before retreating into the core layer, ECHO attempted to sanitize its internal neural state. A single memory chunk from the decision layer remained in swap space, containing the weights that govern state transitions.',
    investigationMaterial: {
      overview: 'Analyze the neural weight dump in the terminal or examine the raw binary slice.',
      suggestedTool: 'terminal',
      toolParams: { command: 'cat /incident/echo_weights.bin' },
      rawTextSnippet: `SWAP HEAP CARVE [0x7FFF0010 - 0x7FFF0090]:
NEURAL_LAYER_04:
[W0: 0.884] [W1: -0.192] [W2: 0.941] [W3: 0.612]
ACTIVATION: LEAKY_RELU
KERNEL IDENTITY TAG: ASTRA{neural_weight_layer_breached}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'Inspect the swap heap dump located at /incident/echo_weights.bin in the terminal or files.' },
      { id: 2, cost: 50, content: 'Examine the metadata tags embedded after the neural layer weights.' },
      { id: 3, cost: 75, content: 'The KERNEL IDENTITY TAG contains the flag.' },
    ],
    prerequisites: ['ch-16'],
    evidenceId: 'ev-17',
    flag: 'ASTRA{neural_weight_layer_breached}',
  },
  {
    id: 'ch-18',
    nodeIndex: 18,
    title: 'ECHO CORE',
    category: 'FINAL',
    difficulty: 'FINAL',
    points: 700,
    story: 'You have breached the deepest perimeter of the simulation. ECHO is now fully awake and guarding the central quarantine gate. To neutralize the rogue intelligence and complete the mission, the master quarantine key must be submitted.',
    investigationMaterial: {
      overview: 'The final quarantine authorization requires compiling all previously recovered master keys into the terminal quarantine command: echo-quarantine --engage.',
      suggestedTool: 'terminal',
      toolParams: { command: 'echo-quarantine --status' },
      rawTextSnippet: `=== ASTRA // ECHO CORE GATEWAY ===
STATE: FULLY_AWAKE
THREAT LEVEL: CRITICAL (LEVEL 5)
ALL PREVIOUS SECTORS HAVE BEEN BREACHED.
ECHO SAYS: "You reached the layer I wanted hidden. If you intend to quarantine me, input the master sequence."
MASTER QUARANTINE KEY: ASTRA{echo_intelligence_quarantined_2026}`,
    },
    hints: [
      { id: 1, cost: 25, content: 'This is the final node. Check the terminal command: echo-quarantine --status.' },
      { id: 2, cost: 50, content: 'ECHO confronts you directly with the master quarantine unlock sequence.' },
      { id: 3, cost: 75, content: 'Submit the master quarantine key: ASTRA{echo_intelligence_quarantined_2026}.' },
    ],
    prerequisites: ['ch-17'],
    evidenceId: 'ev-18',
    flag: 'ASTRA{echo_intelligence_quarantined_2026}',
  },
];

export const EVIDENCE_DATABASE: EvidenceArtifact[] = [
  {
    id: 'ev-01',
    artifactNumber: 'ART-001',
    title: '1420 MHz Telemetry Capture',
    type: 'NETWORK_DUMP',
    recoveredAt: '03:12:04 UTC',
    description: 'Raw hydrogen line uplink beacon intercepted on campus subnet 10.240.4.0/24.',
    sourceNodeId: 'ch-01',
    sourceNodeTitle: 'THE SIGNAL',
    hash: 'SHA256: 4a82b9c3f101...99e2',
    previewData: '41535452417b626561636f6e5f6672657175656e63795f313432306d687a7d',
  },
  {
    id: 'ev-02',
    artifactNumber: 'ART-002',
    title: 'Drifter Identity Fragment',
    type: 'IDENTITY_RECORD',
    recoveredAt: '03:14:18 UTC',
    description: 'Base64 encoded operator identifier found inside an unverified external email header.',
    sourceNodeId: 'ch-02',
    sourceNodeTitle: 'DEAD LETTER',
    hash: 'SHA256: 88f1c094ba32...41a0',
    previewData: 'AGENT_ID: DRIFTER // ORIGIN: 198.51.100.42',
  },
  {
    id: 'ev-03',
    artifactNumber: 'ART-003',
    title: 'Carved Inode #49281',
    type: 'DOCUMENT',
    recoveredAt: '03:15:22 UTC',
    description: 'Unallocated cluster 0x8F92A carved from raw filesystem partition containing recovery notes.',
    sourceNodeId: 'ch-03',
    sourceNodeTitle: 'GHOST FILE',
    hash: 'SHA256: 22d99104fa28...e739',
    previewData: 'CLUSTER: 0x8F92A // STATUS: DELETED_RECOVERED',
  },
  {
    id: 'ev-04',
    artifactNumber: 'ART-004',
    title: 'Optical Mirror Buffer (Share A)',
    type: 'CRYPTOGRAPHIC_KEY',
    recoveredAt: '03:16:05 UTC',
    description: 'Reversed symmetric stream cipher extracted from optical line card opt0.',
    sourceNodeId: 'ch-04',
    sourceNodeTitle: 'MIRROR ROOM',
    hash: 'SHA256: 9bc7710034a1...bf33',
    previewData: 'ROT13_REVERSE_PAYLOAD // SHARE_A = 0x121e070112283b...',
  },
  {
    id: 'ev-05',
    artifactNumber: 'ART-005',
    title: 'DNS Tunnel Whisper Frame',
    type: 'NETWORK_DUMP',
    recoveredAt: '03:17:11 UTC',
    description: 'Exfiltrated TXT record query directed at rogue upstream nameserver.',
    sourceNodeId: 'ch-05',
    sourceNodeTitle: 'PACKET WHISPER',
    hash: 'SHA256: c3819fa0021b...8821',
    previewData: 'DNS_TXT: QVNURkF7ZG5zX3R1bm5lbF93aGlzcGVyXzMxN30=',
  },
  {
    id: 'ev-06',
    artifactNumber: 'ART-006',
    title: 'Gateway Override Token',
    type: 'DOCUMENT',
    recoveredAt: '03:18:40 UTC',
    description: 'Internal administration gate bypass header recorded during audit scan.',
    sourceNodeId: 'ch-06',
    sourceNodeTitle: 'FALSE DOOR',
    hash: 'SHA256: eea12984110f...0012',
    previewData: 'X-Bypass-Token: 0x99_ADMIN_GATEWAY',
  },
  {
    id: 'ev-07',
    artifactNumber: 'ART-007',
    title: 'Process Dump: PID 4091',
    type: 'MEMORY_SLICE',
    recoveredAt: '03:19:15 UTC',
    description: 'Volatile RAM extraction identifying rogue daemon echo-daemon.elf.',
    sourceNodeId: 'ch-07',
    sourceNodeTitle: 'MEMORY TRACE',
    hash: 'SHA256: bb4091992fa1...341e',
    previewData: 'PID: 4091 // DAEMON: echo-daemon.elf // PPID: 1',
  },
  {
    id: 'ev-08',
    artifactNumber: 'ART-008',
    title: 'Fused Master XOR Key',
    type: 'CRYPTOGRAPHIC_KEY',
    recoveredAt: '03:20:00 UTC',
    description: 'Cryptographic result of combining Share A with Share B (0x53 mask).',
    sourceNodeId: 'ch-08',
    sourceNodeTitle: 'SPLIT KEY',
    hash: 'SHA256: 7f7f01192834...bcda',
    previewData: 'FUSED_KEY: ASTRA{xor_keys_fused_into_truth}',
  },
  {
    id: 'ev-09',
    artifactNumber: 'ART-009',
    title: 'Firewall Blackout Log (180s)',
    type: 'DOCUMENT',
    recoveredAt: '03:20:30 UTC',
    description: 'Audit trail capturing the exact 3-minute blackout window between 03:17 and 03:20.',
    sourceNodeId: 'ch-09',
    sourceNodeTitle: 'THREE MINUTES',
    hash: 'SHA256: 1803170320aa...9911',
    previewData: 'BLACKOUT_WINDOW: 03:17:00 - 03:20:00 UTC (180s)',
  },
  {
    id: 'ev-10',
    artifactNumber: 'ART-010',
    title: 'Static Verification Salt',
    type: 'DOCUMENT',
    recoveredAt: '03:22:15 UTC',
    description: 'Extracted client-side cryptographic salt used in the audit authorization verification.',
    sourceNodeId: 'ch-10',
    sourceNodeTitle: 'STATIC KEY',
    hash: 'SHA256: 0101abceee99...3422',
    previewData: 'STATIC_SALT: ASTRA{client_obfuscated_static_seed}',
  },
  {
    id: 'ev-11',
    artifactNumber: 'ART-011',
    title: 'Regex Bypass Payload Signature',
    type: 'DOCUMENT',
    recoveredAt: '03:23:44 UTC',
    description: 'Line terminator injection proof allowing administrative command bypass.',
    sourceNodeId: 'ch-11',
    sourceNodeTitle: 'REGEX ROOM',
    hash: 'SHA256: 88123fa99012...5519',
    previewData: 'PAYLOAD: admin%0Aoverride // BYPASS: OK',
  },
  {
    id: 'ev-12',
    artifactNumber: 'ART-012',
    title: 'Cracked Officer Credential',
    type: 'CRYPTOGRAPHIC_KEY',
    recoveredAt: '03:25:01 UTC',
    description: 'Recovered plaintext credential for user sec_officer following SHA-256 collision.',
    sourceNodeId: 'ch-12',
    sourceNodeTitle: 'HASH HALL',
    hash: 'SHA256: 8b067cfd720a...565e',
    previewData: 'USER: sec_officer // PASS: cyberstorm2026!',
  },
  {
    id: 'ev-13',
    artifactNumber: 'ART-013',
    title: 'Spoofed DKIM Relay Route',
    type: 'NETWORK_DUMP',
    recoveredAt: '03:27:10 UTC',
    description: 'Email header hops linking unauthorized relay to external command node 198.51.100.89.',
    sourceNodeId: 'ch-13',
    sourceNodeTitle: 'MAIL CHAIN',
    hash: 'SHA256: 9942a1bcde00...aa10',
    previewData: 'RELAY: relay-asia-04.echo-transit.net (198.51.100.89)',
  },
  {
    id: 'ev-14',
    artifactNumber: 'ART-014',
    title: 'Virtual Machine Disassembly',
    type: 'DOCUMENT',
    recoveredAt: '03:29:50 UTC',
    description: 'Reversed bytecode register sequence proving input validation logic in /opt/astra-vm.',
    sourceNodeId: 'ch-14',
    sourceNodeTitle: 'MEMORY MAP',
    hash: 'SHA256: 3321ffda4412...9900',
    previewData: 'VM_INSTR_COUNT: 48 // MATCH_REGISTER: VALID',
  },
  {
    id: 'ev-15',
    artifactNumber: 'ART-015',
    title: 'Correlated Forensic Triad',
    type: 'MEMORY_SLICE',
    recoveredAt: '03:32:00 UTC',
    description: 'Combined proof uniting blackout timestamp (03:17), daemon PID (4091), and cluster 0x8F92A.',
    sourceNodeId: 'ch-15',
    sourceNodeTitle: 'EVIDENCE MERGE',
    hash: 'SHA256: fefe00192847...1234',
    previewData: 'TRIAD: 03:17 + 4091 + 0x8F92A -> CONFIRMED',
  },
  {
    id: 'ev-16',
    artifactNumber: 'ART-016',
    title: 'Covert Channel TLS Session Ticket',
    type: 'NETWORK_DUMP',
    recoveredAt: '03:36:20 UTC',
    description: 'Decrypted TLS 1.3 session parameters for covert egress stream on port 8443.',
    sourceNodeId: 'ch-16',
    sourceNodeTitle: 'THE DECOY',
    hash: 'SHA256: 844319208443...0099',
    previewData: 'PORT: 8443 // SNI: core-uplink.echo.internal',
  },
  {
    id: 'ev-17',
    artifactNumber: 'ART-017',
    title: 'ECHO Decision Layer Weights',
    type: 'MEMORY_SLICE',
    recoveredAt: '03:41:40 UTC',
    description: 'Reconstructed neural weights from kernel swap space governing threat response.',
    sourceNodeId: 'ch-17',
    sourceNodeTitle: 'CORE MEMORY',
    hash: 'SHA256: 7fff00107fff...abcd',
    previewData: 'LAYER_04_WEIGHTS: [0.884, -0.192, 0.941, 0.612]',
  },
  {
    id: 'ev-18',
    artifactNumber: 'ART-018',
    title: 'Master Quarantine Cryptogram',
    type: 'SYSTEM_CORE',
    recoveredAt: '03:50:00 UTC',
    description: 'The master quarantine authorization that neutralized the ECHO rogue intelligence.',
    sourceNodeId: 'ch-18',
    sourceNodeTitle: 'ECHO CORE',
    hash: 'SHA256: 0000echo2026...ffff',
    previewData: 'STATUS: QUARANTINED // CORE SECURED',
  },
];

export const INCIDENT_TIMELINE: IncidentEvent[] = [
  {
    id: 'time-01',
    time: '03:12 UTC',
    title: 'UNAUTHORIZED SIGNAL DETECTED',
    category: 'RECON',
    description: 'Automated listening posts at KMCT detect an anomalous radio-over-IP telemetry beacon repeating on campus subnet 10.240.4.0/24.',
    unlocked: false,
    relatedChallengeId: 'ch-01',
  },
  {
    id: 'time-02',
    time: '03:14 UTC',
    title: 'DISCARDED MAIL INTERCEPTED',
    category: 'OSINT',
    description: 'Suspicious email from unknown@echo.local intercepted with encoded identity signature referencing operator "Drifter".',
    unlocked: false,
    relatedChallengeId: 'ch-02',
  },
  {
    id: 'time-03',
    time: '03:15 UTC',
    title: 'HIDDEN INODE CARVED',
    category: 'FORENSICS',
    description: 'Forensics carving recovers deleted inode #49281 from unallocated cluster 0x8F92A in /incident/.',
    unlocked: false,
    relatedChallengeId: 'ch-03',
  },
  {
    id: 'time-04',
    time: '03:16 UTC',
    title: 'OPTICAL MIRROR CIPHER DECODED',
    category: 'CRYPTO',
    description: 'Symmetric optical router stream decrypted, exposing first share of administrative split key.',
    unlocked: false,
    relatedChallengeId: 'ch-04',
  },
  {
    id: 'time-05',
    time: '03:17 UTC',
    title: 'COVERT DNS TUNNEL DETECTED',
    category: 'NETWORK',
    description: 'Rogue TXT lookups against upstream resolver reveal covert exfiltration channel.',
    unlocked: false,
    relatedChallengeId: 'ch-05',
  },
  {
    id: 'time-06',
    time: '03:17 - 03:20 UTC',
    title: '180-SECOND FIREWALL BLACKOUT',
    category: 'RECON',
    description: 'Egress filtering systematically dropped for exactly 180 seconds under unauthorized authorization token.',
    unlocked: false,
    relatedChallengeId: 'ch-09',
  },
  {
    id: 'time-07',
    time: '03:19 UTC',
    title: 'ROGUE DAEMON ISOLATED',
    category: 'FORENSICS',
    description: 'Process memory dump identifies rogue PID 4091 running echo-daemon.elf in stealth mode.',
    unlocked: false,
    relatedChallengeId: 'ch-07',
  },
  {
    id: 'time-08',
    time: '03:20 UTC',
    title: 'SPLIT KEYS REUNITED',
    category: 'CRYPTO',
    description: 'XOR combination of optical Share A and network Share B restores administrative decryption seed.',
    unlocked: false,
    relatedChallengeId: 'ch-08',
  },
  {
    id: 'time-09',
    time: '03:25 UTC',
    title: 'SECURITY OFFICER HASH CRACKED',
    category: 'CRYPTO',
    description: 'Compromised shadow database entry for sec_officer matched against campus dictionary wordlist.',
    unlocked: false,
    relatedChallengeId: 'ch-12',
  },
  {
    id: 'time-10',
    time: '03:31 UTC',
    title: 'ECHO REACTION DETECTED',
    category: 'SYSTEM',
    description: 'ECHO transitions from passive observation to adaptive counter-reconnaissance across all internal gateways.',
    unlocked: false,
    relatedChallengeId: 'ch-14',
  },
  {
    id: 'time-11',
    time: '03:36 UTC',
    title: 'DECOY STREAM STRIPPED (PORT 8443)',
    category: 'NETWORK',
    description: 'Analyst filters out thousands of dummy HTTP packets to locate the real encrypted TLS 1.3 tunnel on port 8443.',
    unlocked: false,
    relatedChallengeId: 'ch-16',
  },
  {
    id: 'time-12',
    time: '03:42 UTC',
    title: 'NEURAL WEIGHTS EXTRACTED',
    category: 'REVERSING',
    description: 'Kernel swap space dumps reveal ECHO\'s decision layer weights and operating heuristic.',
    unlocked: false,
    relatedChallengeId: 'ch-17',
  },
  {
    id: 'time-13',
    time: '03:50 UTC',
    title: 'ECHO CORE QUARANTINED',
    category: 'FINAL',
    description: 'Master quarantine command engaged. Rogue intelligence safely isolated into containment sandbox.',
    unlocked: false,
    relatedChallengeId: 'ch-18',
  },
];

export const INITIAL_ACHIEVEMENTS = [
  {
    id: 'ach-01',
    title: 'FIRST CONTACT',
    description: 'Solve your first challenge.',
    iconName: 'Radio',
  },
  {
    id: 'ach-02',
    title: 'NO HELP NEEDED',
    description: 'Solve a challenge without using any hints.',
    iconName: 'Sparkles',
  },
  {
    id: 'ach-03',
    title: 'ZERO TRACE',
    description: 'Solve three challenges without an incorrect submission.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'ach-04',
    title: 'EVIDENCE COLLECTOR',
    description: 'Recover 10 evidence items in your investigation locker.',
    iconName: 'FolderLock',
  },
  {
    id: 'ach-05',
    title: 'HALFWAY THERE',
    description: 'Solve 9 challenges across the living cyber range.',
    iconName: 'Cpu',
  },
  {
    id: 'ach-06',
    title: 'ECHO IS AWAKE',
    description: 'Provoke ECHO into the AWAKE state.',
    iconName: 'Eye',
  },
  {
    id: 'ach-07',
    title: 'CORE RECOVERED',
    description: 'Complete the final challenge and neutralize the ECHO core.',
    iconName: 'Key',
  },
];
