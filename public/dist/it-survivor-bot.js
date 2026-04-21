var ITSurvivorBot=(()=>{var r="/api";async function g(a,e,t){let i=await fetch(`${r}/chat`,{method:"POST",headers:{"Content-Type":"application/json","X-Username":e},body:JSON.stringify({sessionId:a,message:t})});if(!i.ok)throw new Error(`API error: ${i.status}`);return i.json()}async function f(a,e,t){let i=await fetch(`${r}/onboard`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:a,firstName:e,answers:t})});if(!i.ok)throw new Error(`Onboarding API error: ${i.status}`);return i.json()}async function b(a){let e=await fetch(`${r}/returning`,{method:"GET",headers:{"X-Username":a}});if(e.status===404)return null;if(!e.ok)throw new Error(`Returning user API error: ${e.status}`);return e.json()}async function v(a,e){let t=await fetch(`${r}/exit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:a,...e})});if(!t.ok)throw new Error(`Exit API error: ${t.status}`);return t.json()}var u=[{id:"q1",text:"Where are you right now with the relationship?",options:[{label:"Still in it",value:"still-in"},{label:"I've recently left",value:"recently-left"},{label:"I left a while ago, still healing",value:"left-a-while-ago"},{label:"I'm not sure \u2014 that's why I'm here",value:"not-sure"}]},{id:"q2",text:"Where is this showing up in your life?",multiSelect:!0,options:[{label:"Romantic partner",value:"intimate-partner"},{label:"Parent or family member",value:"family"},{label:"Workplace or boss",value:"workplace"},{label:"Co-parenting situation",value:"co-parenting"},{label:"Friend",value:"friend"},{label:"Not sure yet",value:"not-sure"}]},{id:"q3",text:"What do you need most right now?",options:[{label:"I need to understand what happened",value:"make-sense-of-it"},{label:"I just need to feel like I'm not crazy",value:"youre-not-crazy"},{label:"I want to recognise the patterns",value:"the-patterns"},{label:"I'm ready to start healing",value:"healing"},{label:"I don't know \u2014 something is wrong",value:"illumination"}]},{id:"q4",text:"How long have you been experiencing this?",options:[{label:"Less than 6 months",value:"lt-6m"},{label:"6 months to 2 years",value:"6m-2y"},{label:"2 to 5 years",value:"2y-5y"},{label:"More than 5 years",value:"gt-5y"},{label:"My whole life / since childhood",value:"lifelong"}]},{id:"q5",text:"Have you ever spoken to anyone about this?",options:[{label:"No \u2014 this is the first time",value:"never"},{label:"I've tried therapy but it didn't quite fit",value:"tried-didnt-fit"},{label:"I'm currently in therapy",value:"in-therapy"},{label:"I've told friends or family",value:"told-others"},{label:"Yes, multiple times",value:"multiple-times"}]},{id:"q6",text:"Right now, how would you describe how you're feeling?",options:[{label:"Confused and overwhelmed",value:"overwhelmed"},{label:"Exhausted and numb",value:"flat"},{label:"Angry \u2014 I'm starting to see it clearly",value:"angry"},{label:"Sad \u2014 I'm grieving",value:"sad"},{label:"Hopeful \u2014 I'm ready to move forward",value:"cautiously-hopeful"},{label:"All of the above, honestly",value:"mixed"}]}],s=class{constructor(e,t,i,n){this.container=e,this.username=t,this.firstName=i,this.onComplete=n,this.answers={},this.currentIndex=0,this.renderQuestion(0)}renderQuestion(e){let t=u[e];this.container.innerHTML=this._buildQuestionHTML(t,e),this._attachOptionHandlers(t)}_buildQuestionHTML(e,t){let i=Math.round(t/u.length*100),n=e.options.map(o=>`<button class="it-option" data-value="${o.value}">${o.label}</button>`).join("");return`
      <div class="it-progress"><div class="it-progress-bar" style="width:${i}%"></div></div>
      <p class="it-question">${e.text}</p>
      <div class="it-options">${n}</div>
      ${e.multiSelect?'<button class="it-continue" disabled>Continue \u2192</button>':""}
    `}_attachOptionHandlers(e){let t=this.container.querySelectorAll(".it-option");if(e.multiSelect){let i=this.container.querySelector(".it-continue"),n=new Set;t.forEach(o=>{o.addEventListener("click",()=>{o.classList.toggle("selected"),n.has(o.dataset.value)?n.delete(o.dataset.value):n.add(o.dataset.value),i.disabled=n.size===0})}),i.addEventListener("click",()=>this._advance(e.id,[...n]))}else t.forEach(i=>{i.addEventListener("click",()=>this._advance(e.id,i.dataset.value))})}_advance(e,t){this.answers[e]=t,this.currentIndex++,this.currentIndex<u.length?this.renderQuestion(this.currentIndex):this._submit()}async _submit(){this.container.innerHTML='<p class="it-loading">One moment\u2026</p>';try{let e=await f(this.username,this.firstName,this.answers);this.onComplete(e.sessionId,e.opening)}catch(e){let t=e?.message??String(e);this.container.innerHTML=`<p class="it-error">Something went wrong \u2014 ${t}</p>
         <button class="it-option" id="it-retry">Try again</button>`,this.container.querySelector("#it-retry")?.addEventListener("click",()=>this._submit())}}};var l=class{constructor(e,t,i){this.container=e,this.sessionId=t,this.username=i,this.isWaiting=!1,this._exitPhaseActive=!1,this._exitData={},this.container.innerHTML='<div class="it-messages" id="it-msg-list"></div><div class="it-input-row"><textarea id="it-input" class="it-input" placeholder="Type here\u2026" rows="1"></textarea><button id="it-send" class="it-send"></button></div>',this.container.querySelector("#it-send").addEventListener("click",()=>this._handleSend()),this.container.querySelector("#it-input").addEventListener("keydown",n=>{n.key==="Enter"&&!n.shiftKey&&(n.preventDefault(),this._handleSend())})}prependBotMessage(e){this._appendMessage("bot",e)}async _handleSend(){let e=this.container.querySelector("#it-input"),t=e.value.trim();if(!(!t||this.isWaiting)){e.value="",this._appendMessage("user",t),this.isWaiting=!0,this._showTypingIndicator();try{let i=await g(this.sessionId,this.username,t);this._removeTypingIndicator(),this._appendMessage("bot",i.reply),i.exitPhase&&(this._exitPhaseActive=!0),i.showReminderOffer&&this._showReminderOffer()}catch{this._removeTypingIndicator(),this._appendMessage("bot","Something went wrong. Please try again.")}finally{this.isWaiting=!1}}}_appendMessage(e,t){let i=this.container.querySelector("#it-msg-list"),n=document.createElement("div");n.className=`it-msg it-msg--${e}`,n.textContent=t,i.appendChild(n),i.scrollTop=i.scrollHeight}_showTypingIndicator(){let e=this.container.querySelector("#it-msg-list"),t=document.createElement("div");t.className="it-msg it-msg--bot it-typing",t.id="it-typing",t.innerHTML="<span></span><span></span><span></span>",e.appendChild(t),e.scrollTop=e.scrollHeight}_removeTypingIndicator(){this.container.querySelector("#it-typing")?.remove()}_showReminderOffer(){let e=this.container.querySelector(".it-input-row");e&&(e.innerHTML='<p class="it-reminder-prompt">Would you like a reminder to return?</p><div class="it-reminder-options"><button class="it-reminder-btn" data-interval="2w">In 2 weeks</button><button class="it-reminder-btn" data-interval="1m">In 1 month</button><button class="it-reminder-btn" data-interval="6w">In 6 weeks</button><button class="it-reminder-btn" data-interval="none">No thanks</button></div>',e.querySelectorAll(".it-reminder-btn").forEach(t=>{t.addEventListener("click",()=>this._onReminderChosen(t.dataset.interval))}))}async _onReminderChosen(e){this._exitData.reminderInterval=e;let t=this.container.querySelector(".it-input-row");t&&(t.innerHTML="");try{await v(this.sessionId,this._exitData)}catch{}let i=e==="none"?"You're welcome back whenever you're ready. Take care of yourself.":"A reminder is set. You've done something meaningful today \u2014 we'll be here when you return.";this._appendMessage("bot",i)}};var y=`/* \u2500\u2500\u2500 Floating action button \u2500\u2500\u2500 */
.it-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #2D1B4E;        /* IT deep purple */
  border: none;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 4px 16px rgba(0,0,0,0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.15s;
  z-index: 2147483647;
}
.it-fab:hover  { background: #3d2666; transform: scale(1.07); }
.it-fab:active { transform: scale(0.96); }
/* Gold chat-bubble icon via inline SVG mask */
.it-fab::after {
  content: '';
  display: block;
  width: 26px;
  height: 26px;
  background: #C9A84C;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z'/%3E%3C/svg%3E") center/contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z'/%3E%3C/svg%3E") center/contain no-repeat;
}

/* \u2500\u2500\u2500 Chat panel \u2500\u2500\u2500 */
.it-panel {
  position: fixed;
  bottom: 5.5rem;          /* sits above the FAB */
  right: 1.5rem;
  width: 380px;
  max-height: 600px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  z-index: 2147483646;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 15px;
  color: #1a1a1a;
  transition: opacity 0.2s, transform 0.2s;
}
.it-panel--closed { display: none; }
.it-panel--open   { display: flex; }

/* \u2500\u2500\u2500 Panel header \u2500\u2500\u2500 */
.it-header {
  background: #2D1B4E;
  color: #ffffff;
  padding: 1rem 1.25rem;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

/* \u2500\u2500\u2500 Onboarding \u2500\u2500\u2500 */
.it-onboarding { padding: 1.25rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; }
.it-question    { font-weight: 600; margin-bottom: 0.75rem; line-height: 1.4; }
.it-progress    { height: 3px; background: #e8e0f0; border-radius: 2px; margin-bottom: 1rem; }
.it-progress-bar{ height: 100%; background: #C9A84C; border-radius: 2px; transition: width 0.3s; }
.it-options     { display: flex; flex-direction: column; gap: 0.5rem; }
.it-option {
  padding: 0.65rem 1rem;
  border: 1.5px solid #d4c8e8;
  border-radius: 8px;
  background: #faf8ff;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: #2D1B4E;
  transition: background 0.15s, border-color 0.15s;
}
.it-option:hover   { background: #f0ebff; border-color: #2D1B4E; }
.it-option.selected{ background: #2D1B4E; color: #fff; border-color: #2D1B4E; }
.it-continue {
  margin-top: 0.75rem;
  padding: 0.65rem 1rem;
  background: #C9A84C;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  align-self: flex-end;
  transition: background 0.15s;
}
.it-continue:hover    { background: #b8943d; }
.it-continue:disabled { background: #d4c8a8; cursor: not-allowed; }

/* \u2500\u2500\u2500 Chat \u2500\u2500\u2500 */
.it-chat         { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
.it-messages     { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.it-msg          { max-width: 82%; padding: 0.65rem 0.9rem; border-radius: 12px; line-height: 1.5; font-size: 14px; }
.it-msg--bot     { background: #f3eeff; color: #1a1a1a; border-bottom-left-radius: 3px; }
.it-msg--user    { background: #2D1B4E; color: #fff; align-self: flex-end; border-bottom-right-radius: 3px; }
/* Typing indicator */
.it-typing { display: flex; align-items: center; gap: 5px; padding: 0.65rem 1rem; min-width: 52px; }
.it-typing span {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #9b72d0;
  animation: it-bounce 1.2s infinite ease-in-out;
}
.it-typing span:nth-child(1) { animation-delay: 0s; }
.it-typing span:nth-child(2) { animation-delay: 0.2s; }
.it-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes it-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%            { transform: translateY(-6px); opacity: 1; }
}
.it-input-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem;
  border-top: 1px solid #ede8f5;
  background: #faf8ff;
  flex-shrink: 0;
}
.it-input {
  flex: 1;
  padding: 0.6rem 0.85rem;
  border: 1.5px solid #d4c8e8;
  border-radius: 20px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: none;
  line-height: 1.45;
  max-height: 120px;
  background: #fff;
  color: #1a1a1a;
  transition: border-color 0.15s;
}
.it-input::placeholder { color: #b0a8c4; }
.it-input:focus  { border-color: #2D1B4E; }
.it-send {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  background: #C9A84C;
  color: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.1s;
}
.it-send:hover  { background: #b8943d; }
.it-send:active { transform: scale(0.93); }
.it-send::after {
  content: '';
  display: block;
  width: 18px;
  height: 18px;
  background: #fff;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'/%3E%3C/svg%3E") center/contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'/%3E%3C/svg%3E") center/contain no-repeat;
}

/* \u2500\u2500\u2500 Loading / states \u2500\u2500\u2500 */
.it-loading { color: #888; font-size: 14px; padding: 1rem; text-align: center; }
.it-error   { color: #c0392b; font-size: 14px; padding: 1rem; line-height: 1.5; }

/* \u2500\u2500\u2500 Mobile \u2500\u2500\u2500 */
@media (max-width: 440px) {
  .it-panel { width: calc(100vw - 2rem); right: 1rem; bottom: 5rem; max-height: 80vh; }
  .it-fab   { bottom: 1rem; right: 1rem; }
}`;var w=document.currentScript,d=w?.dataset?.username??null,k=w?.dataset?.firstName??null;(async function(){if(!d||!k){console.warn("[it-widget] Missing data-username or data-first-name on script tag. Widget will not load.");return}let e=document.createElement("div");e.id="it-widget-host",e.style.cssText="position:fixed;bottom:0;right:0;width:0;height:0;z-index:2147483647;pointer-events:none;",document.body.appendChild(e);let t=e.attachShadow({mode:"open"}),i=document.createElement("style");i.textContent=y,t.appendChild(i);let n=document.createElement("button");n.className="it-fab",n.setAttribute("aria-label","Open support chat"),t.appendChild(n);let o=document.createElement("div");o.className="it-panel it-panel--closed";let c=document.createElement("div");c.className="it-header",c.textContent="Illumination Transformation",o.appendChild(c),t.appendChild(o);let h=null;try{h=await b(d)}catch{}let p=!1,m=!1;n.addEventListener("click",()=>{if(p){o.className="it-panel it-panel--closed",p=!1;return}o.className="it-panel it-panel--open",p=!0,m||(m=!0,C(o,h))})})();function C(a,e){if(e)x(a,e.sessionId,e.welcomeBack);else{let t=document.createElement("div");t.className="it-onboarding",a.appendChild(t),new s(t,d,k,(i,n)=>{t.remove(),x(a,i,n)})}}function x(a,e,t){let i=document.createElement("div");i.className="it-chat",a.appendChild(i),new l(i,e,d).prependBotMessage(t)}})();
