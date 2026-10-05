import { SERVER_CHALLENGES } from '../server/challenges-data.js';

const byId = new Map(SERVER_CHALLENGES.map((challenge) => [challenge.id, challenge]));
const errors: string[] = [];

if (SERVER_CHALLENGES.length !== 18) {
  errors.push(`Expected 18 challenges, found ${SERVER_CHALLENGES.length}.`);
}

for (const challenge of SERVER_CHALLENGES) {
  if (!Number.isInteger(challenge.difficultyRating) || challenge.difficultyRating < 1 || challenge.difficultyRating > 7) {
    errors.push(`${challenge.id}: difficultyRating must be an integer from 1 to 7.`);
  }

  if (challenge.id === 'ch-18') {
    if (challenge.prerequisites.length !== 3) errors.push('ch-18 must have exactly 3 prerequisites.');
  } else if (challenge.id >= 'ch-04' && challenge.id <= 'ch-17' && ![2, 3].includes(challenge.prerequisites.length)) {
    errors.push(`${challenge.id}: must have 2 or 3 prerequisites.`);
  }

  for (const prerequisite of challenge.prerequisites) {
    if (!byId.has(prerequisite)) errors.push(`${challenge.id}: unknown prerequisite ${prerequisite}.`);
    if (prerequisite === challenge.id) errors.push(`${challenge.id}: self-dependency detected.`);
  }

  if (challenge.investigationMaterial.rawTextSnippet?.includes(challenge.flag)) {
    errors.push(`${challenge.id}: literal flag leaked into rawTextSnippet.`);
  }
}

// Ensure the graph is acyclic with a DFS over the challenge prerequisite graph.
const visiting = new Set<string>();
const visited = new Set<string>();
function visit(id: string) {
  if (visiting.has(id)) {
    errors.push(`Dependency cycle detected at ${id}.`);
    return;
  }
  if (visited.has(id)) return;
  visiting.add(id);
  const challenge = byId.get(id);
  for (const prerequisite of challenge?.prerequisites ?? []) visit(prerequisite);
  visiting.delete(id);
  visited.add(id);
}
for (const challenge of SERVER_CHALLENGES) visit(challenge.id);

const ch18 = byId.get('ch-18');
if (!ch18) errors.push('ch-18 is missing.');
else {
  const children = SERVER_CHALLENGES.filter((challenge) => challenge.prerequisites.includes('ch-18'));
  if (children.length !== 0) errors.push('ch-18 must be a terminal node with no children.');
}

const encodedPayloadChecks = [
  ['ch-02', 'QVNUUkF7YWdlbnRfZHJpZnRlcl91bm1hc2tlZH0=', 'ASTRA{agent_drifter_unmasked}'],
  ['ch-05', 'QVNUUkF7ZG5zX3R1bm5lbF93aGlzcGVyXzMxN30=', 'ASTRA{dns_tunnel_whisper_317}'],
] as const;
for (const [challengeId, encoded, expected] of encodedPayloadChecks) {
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  if (decoded !== expected) errors.push(`${challengeId}: encoded payload decodes to ${JSON.stringify(decoded)}.`);
}

if (errors.length) {
  console.error('ASTRA validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`ASTRA validation passed: ${SERVER_CHALLENGES.length} challenges, dependency DAG valid, payload checks valid.`);
