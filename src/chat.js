import { sendMessage, submitExit } from './api.js';

export class ChatInterface {
  constructor(container, sessionId, username) {
    this.container = container;
    this.sessionId = sessionId;
    this.username = username;
    this.isWaiting = false;
    this._exitPhaseActive = false;
    this._exitData = {};
    this.container.innerHTML = '<div class="it-messages" id="it-msg-list"></div>' +
      '<div class="it-input-row"><textarea id="it-input" class="it-input" placeholder="Type here…" rows="1"></textarea>' +
      '<button id="it-send" class="it-send"></button></div>';
    this.container.querySelector('#it-send').addEventListener('click', () => this._handleSend());
    this.container.querySelector('#it-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._handleSend(); }
    });
  }

  // Append the results screen opening paragraph as the first bot message
  prependBotMessage(text) {
    this._appendMessage('bot', text);
  }

  async _handleSend() {
      const input = this.container.querySelector('#it-input');
    const text = input.value.trim();
    if (!text || this.isWaiting) return;
    input.value = '';
    this._appendMessage('user', text);
    this.isWaiting = true;
    this._showTypingIndicator();
    try {
      // Only the new message is sent — server holds session history
      const result = await sendMessage(this.sessionId, this.username, text);
      this._removeTypingIndicator();
      this._appendMessage('bot', result.reply);
      if (result.exitPhase) this._exitPhaseActive = true;
      if (result.showReminderOffer) this._showReminderOffer();
    } catch {
      this._removeTypingIndicator();
      this._appendMessage('bot', 'Something went wrong. Please try again.');
    } finally {
      this.isWaiting = false;
    }
  }

  _appendMessage(role, text) {
    const list = this.container.querySelector('#it-msg-list');
    const div = document.createElement('div');
    div.className = `it-msg it-msg--${role}`;
    div.textContent = text;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  _showTypingIndicator() {
    const list = this.container.querySelector('#it-msg-list');
    const el = document.createElement('div');
    el.className = 'it-msg it-msg--bot it-typing';
    el.id = 'it-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
  }

  _removeTypingIndicator() {
    this.container.querySelector('#it-typing')?.remove();
  }

  // Replace the input row with four reminder-interval buttons.
  _showReminderOffer() {
    const inputRow = this.container.querySelector('.it-input-row');
    if (!inputRow) return;
    inputRow.innerHTML =
      '<p class="it-reminder-prompt">Would you like a reminder to return?</p>' +
      '<div class="it-reminder-options">' +
        '<button class="it-reminder-btn" data-interval="2w">In 2 weeks</button>' +
        '<button class="it-reminder-btn" data-interval="1m">In 1 month</button>' +
        '<button class="it-reminder-btn" data-interval="6w">In 6 weeks</button>' +
        '<button class="it-reminder-btn" data-interval="none">No thanks</button>' +
      '</div>';
    inputRow.querySelectorAll('.it-reminder-btn').forEach(btn => {
      btn.addEventListener('click', () => this._onReminderChosen(btn.dataset.interval));
    });
  }

  // Called when the user picks a reminder interval (or declines).
  // Posts exit data to the server and shows a closing message.
  async _onReminderChosen(interval) {
    this._exitData.reminderInterval = interval;
    const inputRow = this.container.querySelector('.it-input-row');
    if (inputRow) inputRow.innerHTML = ''; // clear buttons
    try {
      await submitExit(this.sessionId, this._exitData);
    } catch { /* best-effort */ }
    const closing = interval === 'none'
      ? "You're welcome back whenever you're ready. Take care of yourself."
      : `A reminder is set. You've done something meaningful today — we'll be here when you return.`;
    this._appendMessage('bot', closing);
  }
}