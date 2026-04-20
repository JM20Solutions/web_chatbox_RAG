// ─── CONFIG ─────────────────────────────────────────────────────────────────
const API_URL = '/.netlify/functions/chat';
// ────────────────────────────────────────────────────────────────────────────

const widget      = document.getElementById('chatWidget');
const messages    = document.getElementById('chatMessages');
const input       = document.getElementById('chatInput');
const sendBtn     = document.getElementById('sendBtn');
const fabBtn      = document.getElementById('fabBtn');
const suggestions = document.getElementById('chatSuggestions');

let isOpen      = false;
let isThinking  = false;
let chatHistory = []; // keeps conversation context for multi-turn

// ─── OPEN / CLOSE ────────────────────────────────────────────────────────────
function openChat() {
  if (isOpen) return;
  isOpen = true;
  widget.classList.add('open');
  fabBtn.querySelector('.fab-icon-chat').classList.add('hidden');
  fabBtn.querySelector('.fab-icon-close').classList.remove('hidden');
  setTimeout(() => input.focus(), 280);
  scrollToBottom();
}

function closeChat() {
  isOpen = false;
  widget.classList.remove('open');
  fabBtn.querySelector('.fab-icon-chat').classList.remove('hidden');
  fabBtn.querySelector('.fab-icon-close').classList.add('hidden');
}

function toggleChat() {
  isOpen ? closeChat() : openChat();
}

// ─── CLEAR CHAT ──────────────────────────────────────────────────────────────
function clearChat() {
  messages.innerHTML = '';
  chatHistory = [];
  appendDivider('Today');
  appendMessage(
    'assistant',
    '👋 Hi! I\'m the JM20 Agentic Solutions assistant.<br /><br />Ask me anything about our services, pricing, or how we can help your business.'
  );
  suggestions.style.display = 'flex';
}

// ─── INPUT HELPERS ───────────────────────────────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 110) + 'px';
  sendBtn.disabled = el.value.trim().length === 0;
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled && !isThinking) sendMessage();
  }
}

// ─── SUGGESTIONS ─────────────────────────────────────────────────────────────
function sendSuggestion(btn) {
  suggestions.style.display = 'none';
  dispatchMessage(btn.textContent.trim());
}

// ─── SEND ────────────────────────────────────────────────────────────────────
function sendMessage() {
  const text = input.value.trim();
  if (!text || isThinking) return;
  suggestions.style.display = 'none';
  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;
  dispatchMessage(text);
}

async function dispatchMessage(text) {
  appendMessage('user', escapeHtml(text));
  scrollToBottom();

  // Add to history before sending
  chatHistory.push({ role: 'user', content: text });

  isThinking = true;
  const typingId = appendTyping();
  scrollToBottom();

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory.slice(0, -1), // all but the last user msg
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const { reply, showBookingForm } = data;

    // Add assistant reply to history
    chatHistory.push({ role: 'assistant', content: reply });

    removeTyping(typingId);
    const msgEl = appendMessage('assistant', formatReply(reply));

    // If booking intent — embed Tally form inline
    if (showBookingForm) {
      appendTallyForm(msgEl);
    }

  } catch (err) {
    removeTyping(typingId);
    appendMessage(
      'assistant',
      'Unable to reach the assistant right now. Please try again or email us at hello@jm20.com.',
      true
    );
    console.error('[Chat] Error:', err);
  } finally {
    isThinking = false;
    scrollToBottom();
  }
}

// ─── TALLY EMBED ─────────────────────────────────────────────────────────────
async function appendTallyForm(msgEl) {
  try {
    // Fetch the Tally URL from our config endpoint
    const res = await fetch('/.netlify/functions/config');
    const { tallyUrl } = await res.json();

    if (!tallyUrl || tallyUrl.includes('YOUR_FORM_ID')) return;

    const wrap = document.createElement('div');
    wrap.className = 'msg-tally';
    wrap.innerHTML = `<iframe src="${tallyUrl}" title="Book a Discovery Call" allowfullscreen></iframe>`;

    // Insert after the message body
    const body = msgEl.querySelector('.msg-body');
    if (body) body.appendChild(wrap);
    else msgEl.appendChild(wrap);

    setTimeout(scrollToBottom, 100);
  } catch (e) {
    console.warn('[Chat] Could not load Tally form:', e);
  }
}

// ─── DOM HELPERS ─────────────────────────────────────────────────────────────
function appendDivider(label) {
  const el = document.createElement('div');
  el.className = 'chat-date-divider';
  el.innerHTML = `<span>${label}</span>`;
  messages.appendChild(el);
}

function appendMessage(role, html, isError = false) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;

  if (role === 'assistant') {
    wrap.innerHTML = `
      <div class="msg-avatar">AI</div>
      <div class="msg-body">
        <div class="msg-bubble${isError ? ' error' : ''}">${html}</div>
        <div class="msg-time">${time}</div>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div class="msg-body">
        <div class="msg-bubble">${html}</div>
        <div class="msg-time">${time}</div>
      </div>`;
  }

  messages.appendChild(wrap);
  return wrap;
}

function appendTyping() {
  const id   = 'typing-' + Date.now();
  const wrap = document.createElement('div');
  wrap.className = 'msg assistant';
  wrap.id = id;
  wrap.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-body">
      <div class="msg-bubble typing">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  messages.appendChild(wrap);
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

// ─── FORMAT / ESCAPE ─────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatReply(text) {
  return escapeHtml(String(text))
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
input.addEventListener('input', () => {
  sendBtn.disabled = input.value.trim().length === 0;
});
