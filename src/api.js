const API_BASE = process.env.API_BASE;

// POST a new message in the chat phase. Server holds conversation history.
// agentId is NOT sent — the server hardcodes the agent call chain.
export async function sendMessage(sessionId, username, message) {
  const resp = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Username': username,
    },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();  // { reply, exitPhase, showReminderOffer }
}

// POST the 6 onboarding answers along with the user's identity.
// username and firstName come from the <script> data-* attributes on the page.
export async function submitOnboarding(username, firstName, answers) {
  const resp = await fetch(`${API_BASE}/onboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, firstName, answers }),
  });
  if (!resp.ok) throw new Error(`Onboarding API error: ${resp.status}`);
  return resp.json();  // { sessionId: string, opening: string }
}

// GET the returning user's previous session summary.
// Server identifies the user via the X-Username header.
export async function getReturningSummary(username) {
  const resp = await fetch(`${API_BASE}/returning`, {
    method: 'GET',
    headers: { 'X-Username': username },
  });
  if (resp.status === 404) return null;  // first-time visitor
  if (!resp.ok) throw new Error(`Returning user API error: ${resp.status}`);
  return resp.json();  // { sessionId, firstName, welcomeBack, hasPreviousSession }
}

// POST structured exit data after the four exit questions are complete.
export async function submitExit(sessionId, exitData) {
  const resp = await fetch(`${API_BASE}/exit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, ...exitData }),
  });
  if (!resp.ok) throw new Error(`Exit API error: ${resp.status}`);
  return resp.json();
}
