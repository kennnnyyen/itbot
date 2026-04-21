import { getReturningSummary } from './api.js';
import { OnboardingFlow } from './onboarding.js';
import { ChatInterface } from './chat.js';
import widgetCSS from './widget.css';  // inlined by esbuild

const SCRIPT = document.currentScript;
// Identity comes from data-username and data-first-name on the <script> tag.
// These are rendered server-side by the authenticated WordPress page — not entered by the user.
const USERNAME   = SCRIPT?.dataset?.username  ?? null;
const FIRST_NAME = SCRIPT?.dataset?.firstName ?? null;

// Bootstrap — runs once when the script tag is parsed
(async function init() {
  if (!USERNAME || !FIRST_NAME) {
    console.warn('[it-widget] Missing data-username or data-first-name on script tag. Widget will not load.');
    return;
  }
  // Create Shadow DOM host for style isolation
  // Position the host as a fixed zero-size anchor so it doesn't take up flow space.
  // The FAB and panel inside the shadow tree use position:fixed to pin to the viewport.
  const host = document.createElement('div');
  host.id = 'it-widget-host';
  host.style.cssText = 'position:fixed;bottom:0;right:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = widgetCSS;
  shadow.appendChild(style);

  // Floating button
  const fab = document.createElement('button');
  fab.className = 'it-fab';
  fab.setAttribute('aria-label', 'Open support chat');
  shadow.appendChild(fab);

  // Chat panel (hidden by default)
  const panel = document.createElement('div');
  panel.className = 'it-panel it-panel--closed';

  // IT branded header — always visible inside the panel
  const header = document.createElement('div');
  header.className = 'it-header';
  header.textContent = 'Illumination Transformation';
  panel.appendChild(header);

  shadow.appendChild(panel);

  // Check for returning user before opening — server identifies user via X-Username header
  let returningSummary = null;
  try { returningSummary = await getReturningSummary(USERNAME); } catch {}

  let panelOpen = false;
  let panelInitialised = false;

  fab.addEventListener('click', () => {
    if (panelOpen) {
      // Toggle closed
      panel.className = 'it-panel it-panel--closed';
      panelOpen = false;
      return;
    }
    // Toggle open
    panel.className = 'it-panel it-panel--open';
    panelOpen = true;
    if (!panelInitialised) {
      // Only run setup once — prevents duplicate onboarding/chat on repeat opens
      panelInitialised = true;
      openWidget(panel, returningSummary);
    }
  });
})();

function openWidget(panel, returningSummary) {
  if (returningSummary) {
    // Returning user — skip onboarding, inject session summary, go straight to chat
    launchChat(panel, returningSummary.sessionId, returningSummary.welcomeBack);
  } else {
    // New user — run onboarding flow
    const inner = document.createElement('div');
    inner.className = 'it-onboarding';
    panel.appendChild(inner);
    new OnboardingFlow(inner, USERNAME, FIRST_NAME, (sessionId, opening) => {
      inner.remove();
      launchChat(panel, sessionId, opening);
    });
  }
}

function launchChat(panel, sessionId, openingMessage) {
  const chatEl = document.createElement('div');
  chatEl.className = 'it-chat';
  panel.appendChild(chatEl);
  const chat = new ChatInterface(chatEl, sessionId, USERNAME);
  chat.prependBotMessage(openingMessage);
}