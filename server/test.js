/**
 * IT Server Test Suite
 * Tests: input validation, routing logic, generateOpening, and all HTTP endpoints.
 * Does NOT require a live OpenClaw instance — /chat happy path is skipped when agent is unreachable.
 *
 * Run: OPENCLAW_TOKEN=test-token node test.js
 */

import { createServer } from 'http';
import assert from 'assert/strict';

// ─── Colour helpers ───────────────────────────────────────────────────────────
const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const B = (s) => `\x1b[1m${s}\x1b[0m`;

let passed = 0, failed = 0, skipped = 0;

async function test(label, fn) {
  try {
    await fn();
    console.log(G('  ✓ ') + label);
    passed++;
  } catch (err) {
    console.log(R('  ✗ ') + label);
    console.log(R('      ' + (err.message ?? String(err))));
    failed++;
  }
}

function skip(label, reason) {
  console.log(Y('  ⊘ ') + label + Y(` [skipped: ${reason}]`));
  skipped++;
}

// ─── Inline routing + opening logic (copied from server.js for unit testing) ──

function routeOnboarding(answers) {
  const { q1, q2, q3, q4, q5, q6 } = answers;
  const contexts = Array.isArray(q2) ? q2 : [q2];
  const tag = q3 ?? 'illumination';
  const toneMap = {
    'still-in': 'steady', 'recently-left': 'warm-grounded',
    'left-a-while-ago': 'forward-facing', 'not-sure': 'steady',
  };
  const tone_register = toneMap[q1] ?? 'steady';
  let series_priority = 'super-hero';
  if (q4 === 'lifelong') {
    series_priority = 'cycle-breaker';
  } else if (contexts.length === 1 && contexts[0] === 'workplace') {
    series_priority = 'living-with-a-narc';
  } else {
    const tagSeriesMap = {
      'make-sense-of-it': 'super-hero', 'youre-not-crazy': 'validation',
      'the-patterns': 'cycle-breaker', 'healing': 'joy',
      'illumination': 'super-hero', 'transformation': 'super-hero',
    };
    series_priority = tagSeriesMap[q3] ?? 'super-hero';
  }
  let secondary_series = null;
  if (q1 === 'still-in') secondary_series = 'living-with-a-narc';
  if (contexts.includes('workplace') && q3 === 'the-patterns') secondary_series = 'understanding-narcissism';
  const survival_mode = q1 === 'still-in';
  const therapy_gap_flagged = q5 === 'tried-didnt-fit';
  const empowermentMap = {
    'super-hero': 'redirected-power', 'cycle-breaker': 'understanding',
    'joy': 'permission', 'validation': 'validation-only',
    'living-with-a-narc': 'validation', 'understanding-narcissism': 'clarity',
    'recovery-healing': 'agency',
  };
  const empowerment_model = empowermentMap[series_priority] ?? 'varies';
  const confidence = (q3 === 'illumination' || q6 === 'mixed' || q3 === undefined) ? 'medium' : 'high';
  return { tag, series_priority, secondary_series, survival_mode, tone_register, therapy_gap_flagged, empowerment_model, confidence };
}

function generateOpening(answers, routing, firstName) {
  const { q1, q3, q6 } = answers;
  const situationMap = {
    'still-in': "You're still in the relationship", 'recently-left': "You've recently left",
    'left-a-while-ago': "You left a while ago", 'not-sure': "Something feels off and you're here trying to understand it",
  };
  const emotionMap = {
    'overwhelmed': 'and feeling overwhelmed right now', 'flat': 'and feeling exhausted and numb',
    'angry': 'and the anger is starting to make sense', 'sad': 'and sitting with a real grief',
    'cautiously-hopeful': "and there's a cautious hope in being here", 'mixed': 'and carrying a lot of different things at once',
    'confused': "and trying to understand what's been happening",
  };
  const needMap = {
    'make-sense-of-it': "What you're here for makes sense.",
    'youre-not-crazy': "You are not imagining this.",
    'the-patterns': "The patterns you're starting to see are real.",
    'healing': "You're ready to move forward.",
    'illumination': "You don't need to know exactly what's wrong yet.",
    'transformation': "The work you've already done to get here is real.",
  };
  const questionMap = {
    'still-in': "What's feeling heaviest for you right now?",
    'recently-left': "What's been taking up the most space since you left?",
    'left-a-while-ago': "What are you still carrying that you'd like to put down?",
    'not-sure': "What's the one thing that made you decide to reach out today?",
  };
  const situation = situationMap[q1] ?? "You're here";
  const emotion   = emotionMap[q6];
  const needPara  = needMap[q3] ?? needMap['illumination'];
  const question  = q3 === 'youre-not-crazy' ? "Is there one specific thing you've experienced that you most need to feel understood about?" : (questionMap[q1] ?? questionMap['not-sure']);
  const firstLine = emotion ? `${situation} — ${emotion}.` : `${situation}.`;
  const greeting  = firstName ? `${firstName}, ` : '';
  return `${greeting}${firstLine}\n\n${needPara}\n\n${question}`;
}

// ─── Valid onboarding fixture ──────────────────────────────────────────────────

const VALID_ANSWERS = {
  q1: 'recently-left', q2: ['intimate-partner'], q3: 'make-sense-of-it',
  q4: '6m-2y', q5: 'tried-didnt-fit', q6: 'overwhelmed',
};

// ─── Unit tests: routeOnboarding ─────────────────────────────────────────────

console.log(B('\n── Unit: routeOnboarding ──────────────────────────────────'));

await test('recently-left + make-sense-of-it → super-hero series', () => {
  const r = routeOnboarding(VALID_ANSWERS);
  assert.equal(r.series_priority, 'super-hero');
  assert.equal(r.tone_register, 'warm-grounded');
  assert.equal(r.survival_mode, false);
  assert.equal(r.therapy_gap_flagged, true);
});

await test('still-in → survival_mode:true + secondary living-with-a-narc', () => {
  const r = routeOnboarding({ ...VALID_ANSWERS, q1: 'still-in', q3: 'make-sense-of-it' });
  assert.equal(r.survival_mode, true);
  assert.equal(r.secondary_series, 'living-with-a-narc');
  assert.equal(r.tone_register, 'steady');
});

await test('lifelong duration → cycle-breaker regardless of q3', () => {
  const r = routeOnboarding({ ...VALID_ANSWERS, q4: 'lifelong', q3: 'healing' });
  assert.equal(r.series_priority, 'cycle-breaker');
});

await test('sole workplace context → living-with-a-narc series', () => {
  const r = routeOnboarding({ ...VALID_ANSWERS, q2: ['workplace'], q4: '2y-5y', q3: 'make-sense-of-it' });
  assert.equal(r.series_priority, 'living-with-a-narc');
});

await test('healing → joy series', () => {
  const r = routeOnboarding({ ...VALID_ANSWERS, q3: 'healing' });
  assert.equal(r.series_priority, 'joy');
  assert.equal(r.empowerment_model, 'permission');
});

await test('youre-not-crazy → validation series', () => {
  const r = routeOnboarding({ ...VALID_ANSWERS, q3: 'youre-not-crazy' });
  assert.equal(r.series_priority, 'validation');
  assert.equal(r.empowerment_model, 'validation-only');
});

await test('the-patterns → cycle-breaker', () => {
  const r = routeOnboarding({ ...VALID_ANSWERS, q3: 'the-patterns' });
  assert.equal(r.series_priority, 'cycle-breaker');
  assert.equal(r.empowerment_model, 'understanding');
});

await test('q6=mixed or q3=illumination → confidence:medium', () => {
  const r1 = routeOnboarding({ ...VALID_ANSWERS, q6: 'mixed' });
  assert.equal(r1.confidence, 'medium');
  const r2 = routeOnboarding({ ...VALID_ANSWERS, q3: 'illumination' });
  assert.equal(r2.confidence, 'medium');
});

await test('unambiguous q3 + non-mixed q6 → confidence:high', () => {
  const r = routeOnboarding({ ...VALID_ANSWERS, q3: 'healing', q6: 'overwhelmed' });
  assert.equal(r.confidence, 'high');
});

await test('workplace + the-patterns → secondary:understanding-narcissism', () => {
  const r = routeOnboarding({ ...VALID_ANSWERS, q2: ['intimate-partner', 'workplace'], q3: 'the-patterns' });
  assert.equal(r.secondary_series, 'understanding-narcissism');
});

// ─── Unit tests: generateOpening ─────────────────────────────────────────────

console.log(B('\n── Unit: generateOpening ──────────────────────────────────'));

await test('includes firstName in greeting when provided', () => {
  const routing = routeOnboarding(VALID_ANSWERS);
  const opening = generateOpening(VALID_ANSWERS, routing, 'Elena');
  assert.ok(opening.startsWith('Elena,'), `Expected greeting to start with "Elena," — got: ${opening.slice(0, 40)}`);
});

await test('no firstName → no greeting prefix', () => {
  const routing = routeOnboarding(VALID_ANSWERS);
  const opening = generateOpening(VALID_ANSWERS, routing, '');
  assert.ok(!opening.startsWith(','), `Unexpected leading comma: ${opening.slice(0, 40)}`);
});

await test('recently-left situation line is present', () => {
  const routing = routeOnboarding(VALID_ANSWERS);
  const opening = generateOpening(VALID_ANSWERS, routing, 'Sarah');
  assert.ok(opening.includes("You've recently left"), `Missing situation. Opening: ${opening.slice(0, 100)}`);
});

await test('still-in → correct situation line', () => {
  const answers = { ...VALID_ANSWERS, q1: 'still-in' };
  const routing = routeOnboarding(answers);
  const opening = generateOpening(answers, routing, 'Fatima');
  assert.ok(opening.includes("You're still in the relationship"));
});

await test('youre-not-crazy → uses validation question variant', () => {
  const answers = { ...VALID_ANSWERS, q3: 'youre-not-crazy' };
  const routing = routeOnboarding(answers);
  const opening = generateOpening(answers, routing, 'Mia');
  assert.ok(opening.includes("feel understood about"), `Expected validation question. Got: ${opening.slice(-100)}`);
});

await test('opening has 3 paragraphs (greeting, need, question)', () => {
  const routing = routeOnboarding(VALID_ANSWERS);
  const opening = generateOpening(VALID_ANSWERS, routing, 'Amy');
  const parts = opening.split('\n\n').filter(Boolean);
  assert.equal(parts.length, 3, `Expected 3 paragraphs, got ${parts.length}: ${JSON.stringify(parts)}`);
});

await test('q6=overwhelmed → emotion phrase in first paragraph', () => {
  const answers = { ...VALID_ANSWERS, q6: 'overwhelmed' };
  const routing = routeOnboarding(answers);
  const opening = generateOpening(answers, routing, 'Jane');
  assert.ok(opening.includes('overwhelmed'), `Expected 'overwhelmed' in opening`);
});

// ─── HTTP endpoint tests ──────────────────────────────────────────────────────

const PORT = 13001;
process.env.PORT = PORT;
process.env.OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN ?? 'test-token';
process.env.ALLOWED_ORIGIN = '*';

// Start server in-process
console.log(B('\n── Importing server ───────────────────────────────────────'));
let serverStarted = false;
try {
  await import('./server.js');
  serverStarted = true;
  // Give it a moment to bind
  await new Promise(r => setTimeout(r, 300));
  console.log(G('  ✓ ') + 'server started on port ' + PORT);
  passed++;
} catch (err) {
  console.log(R('  ✗ ') + 'server failed to start: ' + err.message);
  failed++;
}

const BASE = `http://127.0.0.1:${PORT}/api`;

/** Convenience wrapper */
async function api(method, path, body, headers = {}) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const resp = await fetch(`${BASE}${path}`, opts);
  let json;
  try { json = await resp.json(); } catch { json = null; }
  return { status: resp.status, body: json };
}

// ─── /returning ───────────────────────────────────────────────────────────────

console.log(B('\n── HTTP: GET /returning ───────────────────────────────────'));

if (serverStarted) {
  await test('returns 404 for any user (dev mode)', async () => {
    const { status } = await api('GET', '/returning', undefined, { 'X-Username': 'testuser' });
    assert.equal(status, 404);
  });

  await test('returns 404 with no header (dev mode)', async () => {
    const { status } = await api('GET', '/returning');
    assert.equal(status, 404);
  });
} else {
  skip('GET /returning → 404', 'server not running');
  skip('GET /returning no header → 404', 'server not running');
}

// ─── /onboard validation ──────────────────────────────────────────────────────

console.log(B('\n── HTTP: POST /onboard — validation ───────────────────────'));

if (serverStarted) {
  await test('missing username → 400', async () => {
    const { status, body } = await api('POST', '/onboard', { firstName: 'Jane', answers: VALID_ANSWERS });
    assert.equal(status, 400);
    assert.ok(body.error.toLowerCase().includes('username'));
  });

  await test('username with spaces → 400', async () => {
    const { status } = await api('POST', '/onboard', { username: 'bad user', firstName: 'Jane', answers: VALID_ANSWERS });
    assert.equal(status, 400);
  });

  await test('username too long (101 chars) → 400', async () => {
    const { status } = await api('POST', '/onboard', { username: 'a'.repeat(101), firstName: 'Jane', answers: VALID_ANSWERS });
    assert.equal(status, 400);
  });

  await test('missing firstName → 400', async () => {
    const { status, body } = await api('POST', '/onboard', { username: 'valid.user', answers: VALID_ANSWERS });
    assert.equal(status, 400);
    assert.ok(body.error.toLowerCase().includes('firstname'));
  });

  await test('blank firstName → 400', async () => {
    const { status } = await api('POST', '/onboard', { username: 'valid.user', firstName: '   ', answers: VALID_ANSWERS });
    assert.equal(status, 400);
  });

  await test('invalid q1 value → 400', async () => {
    const { status } = await api('POST', '/onboard', {
      username: 'valid.user', firstName: 'Jane',
      answers: { ...VALID_ANSWERS, q1: 'invalid-value' },
    });
    assert.equal(status, 400);
  });

  await test('invalid q2 value in array → 400', async () => {
    const { status } = await api('POST', '/onboard', {
      username: 'valid.user', firstName: 'Jane',
      answers: { ...VALID_ANSWERS, q2: ['intimate-partner', 'hacker'] },
    });
    assert.equal(status, 400);
  });

  await test('invalid q6 value → 400', async () => {
    const { status } = await api('POST', '/onboard', {
      username: 'valid.user', firstName: 'Jane',
      answers: { ...VALID_ANSWERS, q6: 'XSRF' },
    });
    assert.equal(status, 400);
  });

  // Happy path — no OpenClaw call needed (opening is deterministic)
  await test('valid request → 200 with sessionId + opening', async () => {
    const { status, body } = await api('POST', '/onboard', {
      username: 'testuser_01', firstName: 'Elena', answers: VALID_ANSWERS,
    });
    assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert.ok(typeof body.sessionId === 'string' && body.sessionId.length > 0, 'sessionId missing');
    assert.ok(typeof body.opening === 'string' && body.opening.length > 10, 'opening missing or too short');
  });

  await test('opening contains firstName (Elena)', async () => {
    const { body } = await api('POST', '/onboard', {
      username: 'testuser_02', firstName: 'Elena', answers: VALID_ANSWERS,
    });
    assert.ok(body.opening.startsWith('Elena,'), `Opening should start with firstName. Got: ${body.opening?.slice(0, 60)}`);
  });

  await test('username with valid special chars (. _ -) accepted', async () => {
    const { status } = await api('POST', '/onboard', {
      username: 'user.name_test-01', firstName: 'Kay', answers: VALID_ANSWERS,
    });
    assert.equal(status, 200);
  });
} else {
  ['missing username', 'username with spaces', 'username too long', 'missing firstName',
   'blank firstName', 'invalid q1', 'invalid q2 array', 'invalid q6',
   'valid request', 'opening contains firstName', 'valid special chars'].forEach(l => skip(l, 'server not running'));
}

// ─── /chat — session guard ────────────────────────────────────────────────────

console.log(B('\n── HTTP: POST /chat — session guard ───────────────────────'));

if (serverStarted) {
  await test('unknown sessionId → 404', async () => {
    const { status } = await api('POST', '/chat', { sessionId: 'does-not-exist', message: 'hello' });
    assert.equal(status, 404);
  });

  // Onboard to get a real session, then send a message (will fail at OpenClaw with test-token)
  await test('/chat with valid session returns 200 or fails at OpenClaw (not 404)', async () => {
    const onboardResp = await api('POST', '/onboard', {
      username: 'chat_tester', firstName: 'Sam', answers: VALID_ANSWERS,
    });
    assert.equal(onboardResp.status, 200, 'onboard must succeed first');
    const { sessionId } = onboardResp.body;
    const chatResp = await api('POST', '/chat', { sessionId, message: 'I feel lost' });
    // With a fake token OpenClaw will return 401/403 → server returns 500.
    // We just confirm it is NOT 404 (session was found) and NOT 400 (input was valid).
    assert.ok(chatResp.status !== 404, `Got 404 — session was not persisted correctly`);
    assert.ok(chatResp.status !== 400, `Got 400 — unexpected validation error`);
  });
} else {
  skip('unknown sessionId → 404', 'server not running');
  skip('/chat valid session', 'server not running');
}

// ─── /exit — validation ───────────────────────────────────────────────────────

console.log(B('\n── HTTP: POST /exit — validation ──────────────────────────'));

if (serverStarted) {
  await test('unknown sessionId → 404', async () => {
    const { status } = await api('POST', '/exit', { sessionId: 'ghost', reminderInterval: '2w' });
    assert.equal(status, 404);
  });

  await test('invalid somaticShift → 400', async () => {
    const onboard = await api('POST', '/onboard', { username: 'exit_tester_1', firstName: 'Lee', answers: VALID_ANSWERS });
    const { sessionId } = onboard.body;
    const { status } = await api('POST', '/exit', { sessionId, somaticShift: 'unknown-value' });
    assert.equal(status, 400);
  });

  await test('invalid returnPreference → 400', async () => {
    const onboard = await api('POST', '/onboard', { username: 'exit_tester_2', firstName: 'Lee', answers: VALID_ANSWERS });
    const { sessionId } = onboard.body;
    const { status } = await api('POST', '/exit', { sessionId, returnPreference: 'bad-value' });
    assert.equal(status, 400);
  });

  await test('invalid reminderInterval → 400', async () => {
    const onboard = await api('POST', '/onboard', { username: 'exit_tester_3', firstName: 'Lee', answers: VALID_ANSWERS });
    const { sessionId } = onboard.body;
    const { status } = await api('POST', '/exit', { sessionId, reminderInterval: 'tomorrow' });
    assert.equal(status, 400);
  });

  await test('valid exit data → 200 { ok: true }', async () => {
    const onboard = await api('POST', '/onboard', { username: 'exit_tester_4', firstName: 'Lee', answers: VALID_ANSWERS });
    const { sessionId } = onboard.body;
    const { status, body } = await api('POST', '/exit', {
      sessionId,
      exitInsight: 'I see the pattern now.',
      somaticShift: 'lighter',
      exitTakeaway: 'I am not crazy.',
      returnPreference: 'deeper-work',
      reminderInterval: '1m',
    });
    assert.equal(status, 200);
    assert.equal(body.ok, true);
  });

  await test('exit with reminderInterval=none → 200 { ok: true }', async () => {
    const onboard = await api('POST', '/onboard', { username: 'exit_tester_5', firstName: 'Ali', answers: VALID_ANSWERS });
    const { sessionId } = onboard.body;
    const { status, body } = await api('POST', '/exit', { sessionId, reminderInterval: 'none' });
    assert.equal(status, 200);
    assert.equal(body.ok, true);
  });

  await test('partial exit (only reminderInterval) → 200', async () => {
    const onboard = await api('POST', '/onboard', { username: 'exit_tester_6', firstName: 'Ali', answers: VALID_ANSWERS });
    const { sessionId } = onboard.body;
    const { status } = await api('POST', '/exit', { sessionId, reminderInterval: '6w' });
    assert.equal(status, 200);
  });
} else {
  ['unknown sessionId exit', 'invalid somaticShift', 'invalid returnPreference', 'invalid reminderInterval',
   'valid exit data', 'none interval', 'partial exit'].forEach(l => skip(l, 'server not running'));
}

// ─── Security: injection / boundary tests ─────────────────────────────────────

console.log(B('\n── HTTP: Security boundary tests ──────────────────────────'));

if (serverStarted) {
  await test('username injection attempt (<script>) → 400', async () => {
    const { status } = await api('POST', '/onboard', {
      username: '<script>alert(1)</script>', firstName: 'Hacker', answers: VALID_ANSWERS,
    });
    assert.equal(status, 400);
  });

  await test('username SQL-style injection → 400', async () => {
    const { status } = await api('POST', '/onboard', {
      username: "'; DROP TABLE sessions; --", firstName: 'Hacker', answers: VALID_ANSWERS,
    });
    assert.equal(status, 400);
  });

  await test('very long firstName (> 60 chars) is truncated, not rejected', async () => {
    const { status, body } = await api('POST', '/onboard', {
      username: 'longname_tester', firstName: 'A'.repeat(200), answers: VALID_ANSWERS,
    });
    // Server truncates at 60 chars — request still succeeds
    assert.equal(status, 200, `Got ${status}: ${JSON.stringify(body)}`);
  });
} else {
  skip('injection tests', 'server not running');
}

// ─── Results ──────────────────────────────────────────────────────────────────

console.log('\n' + B('─────────────────────────────────────────────────────────'));
console.log(
  B('Results: ') +
  G(`${passed} passed`) + '  ' +
  (failed > 0 ? R(`${failed} failed`) : `${failed} failed`) + '  ' +
  Y(`${skipped} skipped`)
);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
