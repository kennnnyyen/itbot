import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT ?? 3001;
const OPENCLAW_BASE = process.env.OPENCLAW_BASE ?? 'http://127.0.0.1:18789';
// OPENCLAW_TOKEN is only required when /chat is called. Missing token → 503 on chat,
// but /onboard, /exit, /returning all work without it.
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN ?? null;
if (!OPENCLAW_TOKEN) {
  console.warn('WARNING: OPENCLAW_TOKEN is not set. /api/chat will return 503.');
}

// Safe-char validation for usernames passed via data-* attribute
const USERNAME_RE = /^[a-zA-Z0-9._-]{1,100}$/;

// In-memory session store — development only, not for production (see Step 1.4d for SQLite layer)
const sessions = new Map();

// Deterministic onboarding router — mirrors the AGENTS.md rules exactly.
// No LLM call needed: all routing rules are explicit mappings.
function routeOnboarding(answers) {
  const { q1, q2, q3, q4, q5, q6 } = answers;
  const contexts = Array.isArray(q2) ? q2 : [q2];

  // tag: Q3 maps directly
  const tag = q3 ?? 'illumination';

  // tone_register: derived from Q1
  const toneMap = {
    'still-in':        'steady',
    'recently-left':   'warm-grounded',
    'left-a-while-ago':'forward-facing',
    'not-sure':        'steady',
  };
  const tone_register = toneMap[q1] ?? 'steady';

  // series_priority
  let series_priority = 'super-hero'; // default
  if (q4 === 'lifelong') {
    series_priority = 'cycle-breaker';
  } else if (contexts.length === 1 && contexts[0] === 'workplace') {
    series_priority = 'living-with-a-narc';
  } else {
    const tagSeriesMap = {
      'make-sense-of-it':  'super-hero',
      'youre-not-crazy':   'validation',
      'the-patterns':      'cycle-breaker',
      'healing':           'joy',
      'illumination':      'super-hero',
      'transformation':    'super-hero',
    };
    series_priority = tagSeriesMap[q3] ?? 'super-hero';
  }

  // secondary_series
  let secondary_series = null;
  if (q1 === 'still-in') secondary_series = 'living-with-a-narc';
  if (contexts.includes('workplace') && q3 === 'the-patterns') secondary_series = 'understanding-narcissism';

  // survival_mode
  const survival_mode = q1 === 'still-in';

  // therapy_gap_flagged
  const therapy_gap_flagged = q5 === 'tried-didnt-fit';

  // empowerment_model: derived from series_priority
  const empowermentMap = {
    'super-hero':            'redirected-power',
    'cycle-breaker':         'understanding',
    'joy':                   'permission',
    'validation':            'validation-only',
    'living-with-a-narc':   'validation',
    'understanding-narcissism': 'clarity',
    'recovery-healing':      'agency',
  };
  const empowerment_model = empowermentMap[series_priority] ?? 'varies';

  // confidence: high when tag is unambiguous, lower when not-sure or mixed signals
  const confidence = (q3 === 'illumination' || q6 === 'mixed' || q3 === undefined) ? 'medium' : 'high';

  return {
    tag,
    series_priority,
    secondary_series,
    survival_mode,
    tone_register,
    therapy_gap_flagged,
    empowerment_model,
    confidence,
  };
}

// Generate the results-screen opening message from onboarding answers + routing.
// No LLM call — deterministic template in IT voice. Eliminates ~3-8s latency from onboarding.
function generateOpening(answers, routing, firstName) {
  const { q1, q3, q6 } = answers;

  const situationMap = {
    'still-in':         "You're still in the relationship",
    'recently-left':    "You've recently left",
    'left-a-while-ago': "You left a while ago",
    'not-sure':         "Something feels off and you're here trying to understand it",
  };

  const emotionMap = {
    'overwhelmed':        'and feeling overwhelmed right now',
    'flat':               'and feeling exhausted and numb',
    'angry':              'and the anger is starting to make sense',
    'sad':                'and sitting with a real grief',
    'cautiously-hopeful': 'and there\'s a cautious hope in being here',
    'mixed':              'and carrying a lot of different things at once',
    'confused':           'and trying to understand what\'s been happening',
  };

  const needMap = {
    'make-sense-of-it': "What you're here for makes sense. When someone takes a long time to name what's been happening to them, it's often because the experience was designed to be confusing. You didn't miss something obvious. The disorientation was the point.",
    'youre-not-crazy':  "You are not imagining this. What you've been experiencing is real — and the fact that it's been hard to name doesn't mean it didn't happen. It means it was built to be hard to name.",
    'the-patterns':     "The patterns you're starting to see are real. Recognising them doesn't mean you have all the answers yet — but it means something important has shifted. You're seeing clearly now.",
    'healing':          "You're ready to move forward, and that readiness is yours — it belongs to you, not to a timeline or a recovery plan. What becomes available from here is your territory.",
    'illumination':     "You don't need to know exactly what's wrong yet. That uncertainty is a valid place to start. Something brought you here, and that something is worth paying attention to.",
    'transformation':   "The work you've already done to get here is real. What comes next builds on what you already know about yourself — and you know more than you think.",
  };

  const questionMap = {
    'still-in':         "What's feeling heaviest for you right now?",
    'recently-left':    "What's been taking up the most space since you left?",
    'left-a-while-ago': "What are you still carrying that you'd like to put down?",
    'not-sure':         "What's the one thing that made you decide to reach out today?",
  };

  const validationQuestion = "Is there one specific thing you've experienced that you most need to feel understood about?";

  const situation = situationMap[q1] ?? "You're here";
  const emotion   = emotionMap[q6];
  const needPara  = needMap[q3] ?? needMap['illumination'];
  const question  = q3 === 'youre-not-crazy' ? validationQuestion : (questionMap[q1] ?? questionMap['not-sure']);

  const firstLine = emotion ? `${situation} — ${emotion}.` : `${situation}.`;
  const greeting  = firstName ? `${firstName}, ` : '';

  return `${greeting}${firstLine}\n\n${needPara}\n\n${question}`;
}

// ALLOWED_ORIGINS: comma-separated list of allowed origins.
// Production: set to your Vercel URL, e.g. https://itbot-kappa.vercel.app
// Local dev: defaults to localhost
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, same-origin) and any listed origin
    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
}));
app.use(express.json());

// Validate onboarding enum values before forwarding to the agent
const ALLOWED = {
  q1: ['still-in','recently-left','left-a-while-ago','not-sure'],
  q2: ['intimate-partner','family','workplace','co-parenting','friend','not-sure'],
  q3: ['make-sense-of-it','youre-not-crazy','the-patterns','healing','illumination','transformation'],
  q4: ['lt-6m','6m-2y','2y-5y','gt-5y','lifelong'],
  q5: ['never','tried-didnt-fit','in-therapy','told-others','multiple-times'],
  q6: ['overwhelmed','confused','angry','cautiously-hopeful','flat','sad','mixed'],
};

// ── Onboarding ────────────────────────────────────────────────────────────────
// Now accepts username + firstName from the <script> data-* attributes.
// Identity comes from the authenticated WordPress page — not from within the widget.

app.post('/api/onboard', async (req, res) => {
  const { username, firstName, answers } = req.body ?? {};

  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Invalid or missing username' });
  }
  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    return res.status(400).json({ error: 'firstName is required' });
  }

  // Reject any answer value not in the allowed list
  for (const [key, val] of Object.entries(answers ?? {})) {
    const allowed = ALLOWED[key];
    const values = Array.isArray(val) ? val : [val];
    if (!allowed || values.some(v => !allowed.includes(v))) {
      return res.status(400).json({ error: `Invalid value for ${key}` });
    }
  }

  try {
    // Route onboarding answers to context parameters (deterministic — no LLM call needed)
    const routing = routeOnboarding(answers);

    // Generate the results-screen opening message from templates — no LLM, instant response
    const opening = generateOpening(answers, routing, firstName.trim().slice(0, 60));

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {
      username,
      firstName: firstName.trim().slice(0, 60),
      answers,
      routing,
      history: [{ role: 'assistant', content: opening }],
      exitPhase: false,
      exitQuestionIndex: null,
    });
    res.json({ sessionId, opening });
  } catch (err) {
    console.error('[onboard] unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Chat ──────────────────────────────────────────────────────────────────────
// Agent chain is hardcoded server-side — client never supplies agentId.
// Chain: context-classifier → crisis-monitor (parallel) → diagnostic-educator

app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body ?? {};
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Append user message to server-side history — never trust client history
  session.history.push({ role: 'user', content: message });

  // Exit phase bookkeeping (server counts signals — not the agent)
  if (session.exitPhase) {
    session.exitQuestionIndex = (session.exitQuestionIndex ?? 0) + 1;
  } else {
    const turnCount = session.history.filter(h => h.role === 'user').length;
    const exitSignalCount = countExitSignals(session, message, turnCount);
    if (exitSignalCount >= 2) {
      session.exitPhase = true;
      session.exitQuestionIndex = 0;
    }
  }

  try {
    // ── 1. Call diagnostic-educator (primary conversational agent)
    // context-classifier and crisis-monitor will be wired once agents are configured in OpenClaw.
    // For now the educator gets full session context including exit state.
    const ocResp = await callAgent('diagnostic-educator', {
      messages: session.history,
      context: {
        ...session.answers,
        ...session.routing,
        firstName: session.firstName,
        exitPhase: session.exitPhase ?? false,
        exitQuestionIndex: session.exitQuestionIndex ?? null,
      },
    });

    const reply = ocResp ?? '';
    session.history.push({ role: 'assistant', content: reply });

    const showReminderOffer = session.exitPhase && session.exitQuestionIndex >= 4;
    res.json({ reply, exitPhase: session.exitPhase ?? false, showReminderOffer });
  } catch (err) {
    console.error('[chat] unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Exit ──────────────────────────────────────────────────────────────────────

const ALLOWED_SOMATIC   = ['calm','lighter','still-activated','grounded','no-shift','not-sure'];
const ALLOWED_RETURN    = ['ongoing-support','deeper-work','not-sure'];
const ALLOWED_REMINDER  = ['2w','1m','6w','none'];

app.post('/api/exit', (req, res) => {
  const { sessionId, exitInsight, somaticShift, exitTakeaway, returnPreference, reminderInterval } = req.body ?? {};
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (somaticShift && !ALLOWED_SOMATIC.includes(somaticShift)) return res.status(400).json({ error: 'Invalid somaticShift' });
  if (returnPreference && !ALLOWED_RETURN.includes(returnPreference)) return res.status(400).json({ error: 'Invalid returnPreference' });
  if (reminderInterval && !ALLOWED_REMINDER.includes(reminderInterval)) return res.status(400).json({ error: 'Invalid reminderInterval' });

  session.exitData = { exitInsight, somaticShift, exitTakeaway, returnPreference, reminderInterval };
  // In production (Step 1.4d) this triggers generateSessionSummary() and writes to SQLite.
  // In dev the exit data lives in the in-memory session until the process restarts.
  console.log(`[exit] session=${sessionId} username=${session.username} interval=${reminderInterval}`);
  res.json({ ok: true });
});

// ── Returning user ─────────────────────────────────────────────────────────────

app.get('/api/returning', (req, res) => {
  // In dev: always 404 — no persistent store. Production lookup is in Step 1.4d (SQLite).
  res.status(404).json({ error: 'Not found' });
});

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    openclaw: OPENCLAW_TOKEN ? 'configured' : 'MISSING — /api/chat will fail',
    sessions: sessions.size,
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Wraps the OpenClaw /v1/chat/completions endpoint for a given agent ID.
async function callAgent(agentId, { messages, context }) {
  if (!OPENCLAW_TOKEN) {
    throw new Error('OPENCLAW_TOKEN is not configured on this server. Set it in Vercel environment variables.');
  }

  const isStubMode = OPENCLAW_TOKEN === 'placeholder';
  if (isStubMode) {
    const last = messages.filter(m => m.role === 'user').pop()?.content ?? '';
    return `[OpenClaw not connected — stub reply] You said: "${last}". Once OPENCLAW_TOKEN is set to a real token and OpenClaw is running, responses will come from the diagnostic-educator agent.`;
  }
  // Inject context as a system message prepended to the conversation.
  const systemContent = `Context: ${JSON.stringify(context)}`;
  const fullMessages = [{ role: 'system', content: systemContent }, ...messages];

  const resp = await fetch(`${OPENCLAW_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      'x-openclaw-agent-id': agentId,
    },
    body: JSON.stringify({ model: 'openclaw', messages: fullMessages }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`[callAgent] ${agentId} returned ${resp.status}:`, text.slice(0, 200));
    throw new Error(`Agent ${agentId} error: ${resp.status}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function countExitSignals(session, latestMessage, turnCount) {
  let count = 0;
  if (turnCount >= 15) count++;
  if (latestMessage.length < 80) count++;
  if (/makes sense|i see|thank you|that helps/i.test(latestMessage)) count++;
  if (session.insightFlagged) count++;
  return count;
}

// Export app for Vercel serverless handler (api/index.js).
// app.listen is only called in local dev — Vercel manages its own HTTP server.
export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`IT session server listening on http://127.0.0.1:${PORT}`);
  });
}