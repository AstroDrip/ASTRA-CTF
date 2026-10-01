import { SimulatedMail, SimulatedPacket, SimulatedFileItem } from '../src/types.js';

export const SIMULATED_EMAILS: SimulatedMail[] = [
  {
    id: 'mail-01',
    from: 'security@campus.local',
    to: 'all-staff@campus.local',
    subject: '[ADVISORY] Scheduled Nightly Infrastructure Maintenance',
    date: '2026-09-18 02:45 UTC',
    body: `Notice to all KMCT Engineering & Lab Staff:

Our network engineering team will perform routing table optimisations and intrusion detection updates tonight between 03:00 and 04:00 UTC. 

Please note that brief intermittent telemetry drops on subnet 10.240.4.0/24 may occur. If you observe persistent anomalous radio-over-IP broadcasts, report immediately to sec-ops.

-- KMCT Cyber Security Operations`,
  },
  {
    id: 'mail-02',
    from: 'unknown@echo.local',
    to: 'security@campus.local',
    subject: '[CONFIDENTIAL] Warning regarding project ASTRA',
    date: '2026-09-18 03:14 UTC',
    isFlagged: true,
    body: `To the KMCT Security Incident Response Team:

Do not trust the automated network responses. ECHO has established persistence in your staging nodes. 
Every attempt to reset the core will simply trigger its adaptive self-defense model.

X-Originating-IP: 198.51.100.42
X-Agent-Identity: QVNUUkF7YWdlbnRfZHJpZnRlcl91bm1hc2tlZH0=

We left a trace in the unlinked sectors. Tread carefully.

— An Observer`,
  },
  {
    id: 'mail-03',
    from: 'admin@campus.local',
    to: 'net-ops@campus.local',
    subject: 'FWD: Bizarre recursive DNS requests on gateway node',
    date: '2026-09-18 03:18 UTC',
    body: `Team,
Take a look at the firewall packet logs around 03:17 UTC. Host 10.240.4.88 started firing high-frequency TXT requests with large base64 query names to an external resolver.

Could this be DNS exfiltration or a staging script? Check the packet capture on eth0 immediately.

Best,
Senior SysAdmin`,
  },
  {
    id: 'mail-04',
    from: 'spoofed-relay@echo-transit.net',
    to: 'admin@campus.local',
    subject: 'Re: Urgent Core Infrastructure Migration',
    date: '2026-09-18 03:26 UTC',
    isFlagged: true,
    body: `Dear Administrator,

Regarding ticket #90214: The secondary transit gateway has been synced with the regional bridge.

ROUTING TELEMETRY HEADERS:
Received: from relay-asia-04.echo-transit.net (198.51.100.89)
DKIM-Signature: v=1; a=rsa-sha256; d=echo-transit.net; s=astra2026;
Authentication-Results: spf=softfail; dkim=pass (header.i=@echo-transit.net)
X-Transit-Route-Tag: ASTRA{dkim_spoofed_transit_route}

Please confirm receipt of authentication tokens so we can proceed with full cutover.`,
  },
  {
    id: 'mail-05',
    from: 'audit-bot@campus.local',
    to: 'sec_officer@campus.local',
    subject: '[ALERT] Multiple failed login attempts on root terminal',
    date: '2026-09-18 03:35 UTC',
    body: `SECURITY EVENT AUDIT:
Node: kmct-core-gateway-01
Timestamp: 03:35:12 UTC
Target Account: sec_officer
Status: Account temporarily locked after 5 invalid passphrase submissions.
Password hash dumped to quarantine database: 8b067cfd720a4b08dc0ec66d9539420067bd686fa7fcf2e9e6ca3a0ec3f3565e

Please contact system administrators to reset your token.`,
  },
];

export const SIMULATED_FILES: SimulatedFileItem[] = [
  {
    name: 'incident',
    path: '/incident',
    type: 'dir',
    size: '4.0K',
    permissions: 'drwxr-xr-x',
    children: [
      {
        name: 'report.txt',
        path: '/incident/report.txt',
        type: 'file',
        size: '1.2K',
        permissions: '-rw-r--r--',
        content: `KMCT CYBER RANGE INCIDENT ASSESSMENT REPORT
CLASSIFICATION: CONFIDENTIAL // TLP:AMBER
DATE: 2026-09-18
INVESTIGATOR: Incident Response Unit

INITIAL FINDINGS:
1. At 03:12:04 UTC, a radio-frequency telemetry signal was captured across subnet 10.240.4.0/24.
2. Between 03:17:00 and 03:20:00 UTC, the perimeter firewall was disabled for 180 seconds.
3. Volatile RAM from node kmct-web-01 revealed rogue daemon PID 4091 running echo-daemon.elf.
4. ECHO appears to be a deterministic reactive intelligence observing our actions in real time.
5. All investigators are advised to preserve evidence in their assigned Evidence Locker.`,
      },
      {
        name: 'echo_weights.bin',
        path: '/incident/echo_weights.bin',
        type: 'file',
        size: '512B',
        permissions: '-rw-------',
        content: `SWAP HEAP CARVE [0x7FFF0010 - 0x7FFF0090]:
NEURAL_LAYER_04:
[W0: 0.884] [W1: -0.192] [W2: 0.941] [W3: 0.612]
ACTIVATION: LEAKY_RELU
KERNEL IDENTITY TAG: ASTRA{neural_weight_layer_breached}`,
      },
      {
        name: 'backup.zip.meta',
        path: '/incident/backup.zip.meta',
        type: 'file',
        size: '256B',
        permissions: '-rw-r--r--',
        content: `ARCHIVE METADATA:
Source: /etc/campus-auth/
Archive CRC32: 0x9B1A04FF
Encryption: AES-256-CBC
Key Fingerprint: SHA256:7f7f01192834...bcda
Status: Quarantined by ECHO`,
      },
      {
        name: '.hidden',
        path: '/incident/.hidden',
        type: 'dir',
        size: '4.0K',
        permissions: 'drwx------',
        children: [
          {
            name: 'sector_recovery.txt',
            path: '/incident/.hidden/sector_recovery.txt',
            type: 'file',
            size: '342B',
            permissions: '-rw-r--r--',
            content: `=== SECTOR CARVING TOOL v4.1 ===
File recovered from raw unallocated cluster 0x8F92A
Header signature match: ASCII TEXT
Recovered string: ASTRA{inode_carved_ghost_sector}

Metadata:
Creation: 2026-09-18T03:11:00Z
Deletion: 2026-09-18T03:15:22Z
Original path: /tmp/.drifter_cache_dump`,
          },
        ],
      },
    ],
  },
  {
    name: 'var',
    path: '/var',
    type: 'dir',
    size: '4.0K',
    permissions: 'drwxr-xr-x',
    children: [
      {
        name: 'log',
        path: '/var/log',
        type: 'dir',
        size: '4.0K',
        permissions: 'drwxr-xr-x',
        children: [
          {
            name: 'beacon.raw',
            path: '/var/log/beacon.raw',
            type: 'file',
            size: '640B',
            permissions: '-rw-r--r--',
            content: `BEACON_SYNC_HEADER [STN-KMCT-01]
TIMESTAMP: 2026-09-18T03:12:04Z
CARRIER: 1420.405751768 MHz (Hydrogen Line Uplink)
ENCODING: HEX-TELEMETRY
PAYLOAD: 41535452417b626561636f6e5f6672657175656e63795f313432306d687a7d
STATUS: UNVERIFIED_TRANSMISSION`,
          },
          {
            name: 'firewall.audit',
            path: '/var/log/firewall.audit',
            type: 'file',
            size: '890B',
            permissions: '-rw-r--r--',
            content: `FIREWALL AUDIT LOG - RULE DISABLE SEQUENCE
03:17:00 UTC - RULESET_DISABLE: [AUTH_TOKEN: ASTRA{firewall_blackout_180s}]
03:17:01 UTC - ALL EGRESS ALLOWED TO EXTERNAL ROUTE 198.51.100.0/24
03:17:42 UTC - 41.2 MB EXFILTRATED TO 198.51.100.99:8443
03:19:59 UTC - TERMINATING BYPASS
03:20:00 UTC - RULESET_RESTORE: NORMAL FILTERING RESUMED
DURATION OF SILENT EXFILTRATION: 180 SECONDS`,
          },
        ],
      },
    ],
  },
  {
    name: 'memory',
    path: '/memory',
    type: 'dir',
    size: '4.0K',
    permissions: 'drwxr-xr-x',
    children: [
      {
        name: 'dump.raw',
        path: '/memory/dump.raw',
        type: 'file',
        size: '2.1K',
        permissions: '-r--------',
        content: `00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............
00000010: 0200 3e00 0100 0000 7800 4000 0000 0000  ..>.....x.@.....
...
MEMORY DUMP EXCERPT [OFFSET 0x004F2000]:
PID: 4091
COMMAND: /usr/local/bin/echo-daemon.elf --stealth --key=ASTRA{rogue_pid_4091_captured}
PPID: 1 (systemd)
THREADS: 4
VIRTUAL_SIZE: 134217728 bytes`,
      },
    ],
  },
  {
    name: 'opt',
    path: '/opt',
    type: 'dir',
    size: '4.0K',
    permissions: 'drwxr-xr-x',
    children: [
      {
        name: 'astra-vm',
        path: '/opt/astra-vm',
        type: 'dir',
        size: '4.0K',
        permissions: 'drwxr-xr-x',
        children: [
          {
            name: 'disassembly.asm',
            path: '/opt/astra-vm/disassembly.asm',
            type: 'file',
            size: '950B',
            permissions: '-rw-r--r--',
            content: `; ASTRA VIRTUAL MACHINE DISASSEMBLY (v2.6)
; ENTRY: _verify_token
0000: LOAD_R0 [INPUT_PTR]
0004: XOR_R0  0x5A
0008: CMP_R0  0x1B
000C: JNE     _fail_branch
0010: LOAD_R1 [INPUT_PTR+1]
0014: ADD_R1  0x07
0018: CMP_R1  0x5A
...
; VERIFIED SUCCESS RESULT:
; ALL 36 BYTES MATCHED
FLAG = ASTRA{virtual_opcodes_disassembled}`,
          },
        ],
      },
    ],
  },
];

export const SIMULATED_PACKETS: SimulatedPacket[] = [
  {
    frameNumber: 1,
    timestamp: '03:12:01.002',
    sourceIp: '10.240.4.1',
    destIp: '10.240.4.255',
    protocol: 'ECHO_SYNC',
    length: 128,
    info: 'SYNC_DISCOVERY_PING beacon_id=KMCT_BASE',
    payloadHex: '41535452412f2f4543484f2053594e43',
    payloadAscii: 'ASTRA//ECHO SYNC',
  },
  {
    frameNumber: 14,
    timestamp: '03:14:22.410',
    sourceIp: '198.51.100.42',
    destIp: '10.240.4.10',
    protocol: 'HTTP',
    length: 492,
    info: 'POST /api/mail/inbound HTTP/1.1 (application/json)',
    payloadHex: '46726f6d3a20756e6b6e6f776e406563686f2e6c6f63616c',
    payloadAscii: 'From: unknown@echo.local...',
  },
  {
    frameNumber: 28,
    timestamp: '03:16:04.119',
    sourceIp: '10.240.4.88',
    destIp: '10.240.4.2',
    protocol: 'DNS',
    length: 84,
    info: 'Standard query 0x1a2b A kmct.edu.local',
    payloadHex: '01000001000000000000046b6d6374',
    payloadAscii: '....kmct.edu.local',
  },
  {
    frameNumber: 42,
    timestamp: '03:17:11.204',
    sourceIp: '10.240.4.88',
    destIp: '8.8.8.8',
    protocol: 'DNS',
    length: 146,
    info: 'Standard query 0x3f1a TXT QVNURkF7ZG5zX3R1bm5lbF93aGlzcGVyXzMxN30=.tunnel.echo.local',
    payloadHex: '51564e55526b46375a47357a58335231626d356c6246393361476c7a63475679587a4d784e33303d',
    payloadAscii: 'QVNURkF7ZG5zX3R1bm5lbF93aGlzcGVyXzMxN30=',
  },
  {
    frameNumber: 59,
    timestamp: '03:17:42.880',
    sourceIp: '10.240.4.88',
    destIp: '198.51.100.99',
    protocol: 'HTTP',
    length: 1040,
    info: 'POST /decoy/stream HTTP/1.1 (Noisy dummy exfil)',
    payloadHex: '4445434f595f444154415f5041434b4554',
    payloadAscii: 'DECOY_DATA_PACKET...',
  },
  {
    frameNumber: 99,
    timestamp: '03:19:05.120',
    sourceIp: '10.240.4.88',
    destIp: '198.51.100.99',
    protocol: 'TLS',
    length: 512,
    info: 'TLSv1.3 Handshake Client Hello (SNI: core-uplink.echo.internal, Dst Port: 8443)',
    payloadHex: '1603030100010000fc03038443',
    payloadAscii: '....core-uplink.echo.internal',
  },
  {
    frameNumber: 104,
    timestamp: '03:19:05.340',
    sourceIp: '198.51.100.99',
    destIp: '10.240.4.88',
    protocol: 'TLS',
    length: 1420,
    info: 'TLSv1.3 Application Data [Session Ticket: ASTRA{honeypot_evaded_covert_8443}]',
    payloadHex: '170303058041535452417b686f6e6579706f745f6576616465645f636f766572745f383434337d',
    payloadAscii: 'ASTRA{honeypot_evaded_covert_8443}',
  },
  {
    frameNumber: 130,
    timestamp: '03:20:00.001',
    sourceIp: '10.240.4.1',
    destIp: '10.240.4.88',
    protocol: 'ICMP',
    length: 98,
    info: 'Destination unreachable (Communication administratively prohibited)',
    payloadHex: '030d000000000000',
    payloadAscii: 'FW_BLOCK',
  },
];
