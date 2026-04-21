import { submitOnboarding } from './api.js';

const QUESTIONS = [
  {
    id: 'q1',
    text: 'Where are you right now with the relationship?',
    options: [
      { label: 'Still in it',              value: 'still-in' },
      { label: "I've recently left",       value: 'recently-left' },
      { label: "I left a while ago, still healing", value: 'left-a-while-ago' },
      { label: "I'm not sure — that's why I'm here", value: 'not-sure' },
    ],
  },
  {
    id: 'q2',
    text: 'Where is this showing up in your life?',
    multiSelect: true,
    options: [
      { label: 'Romantic partner',         value: 'intimate-partner' },
      { label: 'Parent or family member',  value: 'family' },
      { label: 'Workplace or boss',        value: 'workplace' },
      { label: 'Co-parenting situation',   value: 'co-parenting' },
      { label: 'Friend',                   value: 'friend' },
      { label: "Not sure yet",             value: 'not-sure' },
    ],
  },
  {
    id: 'q3',
    text: 'What do you need most right now?',
    options: [
      { label: 'I need to understand what happened',       value: 'make-sense-of-it' },
      { label: "I just need to feel like I'm not crazy",   value: 'youre-not-crazy' },
      { label: 'I want to recognise the patterns',         value: 'the-patterns' },
      { label: "I'm ready to start healing",               value: 'healing' },
      { label: "I don't know — something is wrong",        value: 'illumination' },
    ],
  },
  {
    id: 'q4',
    text: 'How long have you been experiencing this?',
    options: [
      { label: 'Less than 6 months',       value: 'lt-6m' },
      { label: '6 months to 2 years',      value: '6m-2y' },
      { label: '2 to 5 years',             value: '2y-5y' },
      { label: 'More than 5 years',        value: 'gt-5y' },
      { label: 'My whole life / since childhood', value: 'lifelong' },
    ],
  },
  {
    id: 'q5',
    text: 'Have you ever spoken to anyone about this?',
    options: [
      { label: 'No — this is the first time',               value: 'never' },
      { label: "I've tried therapy but it didn't quite fit", value: 'tried-didnt-fit' },
      { label: "I'm currently in therapy",                   value: 'in-therapy' },
      { label: "I've told friends or family",                value: 'told-others' },
      { label: 'Yes, multiple times',                        value: 'multiple-times' },
    ],
  },
  {
    id: 'q6',
    text: 'Right now, how would you describe how you\'re feeling?',
    options: [
      { label: 'Confused and overwhelmed',      value: 'overwhelmed' },
      { label: 'Exhausted and numb',            value: 'flat' },
      { label: "Angry — I'm starting to see it clearly", value: 'angry' },
      { label: "Sad — I'm grieving",            value: 'sad' },
      { label: "Hopeful — I'm ready to move forward", value: 'cautiously-hopeful' },
      { label: 'All of the above, honestly',   value: 'mixed' },
    ],
  },
];

export class OnboardingFlow {
  constructor(container, username, firstName, onComplete) {
    this.container = container;
    this.username = username;
    this.firstName = firstName;
    this.onComplete = onComplete;
    this.answers = {};
    this.currentIndex = 0;
    this.renderQuestion(0);
  }

  renderQuestion(index) {
    const q = QUESTIONS[index];
    // Render progress bar + question text + option buttons (single or multi-select)
    // Option buttons: one-click for single, toggle + confirm button for multi-select
    this.container.innerHTML = this._buildQuestionHTML(q, index);
    this._attachOptionHandlers(q);
  }

  _buildQuestionHTML(q, index) {
    const progress = Math.round(((index) / QUESTIONS.length) * 100);
    const optionButtons = q.options.map(opt =>
      `<button class="it-option" data-value="${opt.value}">${opt.label}</button>`
    ).join('');
    return `
      <div class="it-progress"><div class="it-progress-bar" style="width:${progress}%"></div></div>
      <p class="it-question">${q.text}</p>
      <div class="it-options">${optionButtons}</div>
      ${q.multiSelect ? '<button class="it-continue" disabled>Continue →</button>' : ''}
    `;
  }

  _attachOptionHandlers(q) {
    const buttons = this.container.querySelectorAll('.it-option');
    if (q.multiSelect) {
      const continueBtn = this.container.querySelector('.it-continue');
      const selected = new Set();
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.toggle('selected');
          selected.has(btn.dataset.value) ? selected.delete(btn.dataset.value) : selected.add(btn.dataset.value);
          continueBtn.disabled = selected.size === 0;
        });
      });
      continueBtn.addEventListener('click', () => this._advance(q.id, [...selected]));
    } else {
      buttons.forEach(btn => {
        btn.addEventListener('click', () => this._advance(q.id, btn.dataset.value));
      });
    }
  }

  _advance(questionId, value) {
    this.answers[questionId] = value;
    this.currentIndex++;
    if (this.currentIndex < QUESTIONS.length) {
      this.renderQuestion(this.currentIndex);
    } else {
      this._submit();
    }
  }

  async _submit() {
    this.container.innerHTML = '<p class="it-loading">One moment…</p>';
    try {
      const result = await submitOnboarding(this.username, this.firstName, this.answers);
      this.onComplete(result.sessionId, result.opening);
    } catch (err) {
      // Show the real error so the developer can diagnose the failure during local testing.
      // In production this message is replaced with a generic string (see Step 1.4b troubleshooting).
      const detail = err?.message ?? String(err);
      this.container.innerHTML =
        `<p class="it-error">Something went wrong — ${detail}</p>
         <button class="it-option" id="it-retry">Try again</button>`;
      this.container.querySelector('#it-retry')?.addEventListener('click', () => this._submit());
    }
  }
}