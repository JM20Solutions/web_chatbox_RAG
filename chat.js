// ─── CONFIG ────────────────────────────────────────────────────────────────
// TODO: Replace with your n8n webhook URL
const N8N_WEBHOOK_URL = 'https://gpixie.app.n8n.cloud/webhook/3c0cbaf5-6283-4ec7-b806-b1bca58b7852';
// ───────────────────────────────────────────────────────────────────────────

const widget      = document.getElementById('chatWidget');
const messages    = document.getElementById('chatMessages');
const input       = document.getElementById('chatInput');
const sendBtn     = document.getElementById('sendBtn');
const fabBtn      = document.getElementById('fabBtn');
const suggestions = document.getElementById('chatSuggestions');

let isOpen     = false;
let isThinking = false;

// ─── OPEN / CLOSE ───────────────────────────────────────────────────────────
function openChat() {
  isOpen = true;
  widget.classList.add('open');
  fabBtn.querySelector('.fab-icon-chat').classList.add('hidden');
  fabBtn.querySelector('.fab-icon-close').classList.remove('hidden');
  setTimeout(() => input.focus(), 300);
  scrollToBottom();
}

function closeChat() {
  isOpen = false;
  widget.classList.remove('open');
  fabBtn.querySelector('.fab-icon-chat').classList.remove('hidden');
  fabBtn.querySelector('.fab-icon-close').classList.add('hidden');
}

// ─── CLEAR CHAT ─────────────────────────────────────────────────────────────
function clearChat() {
  messages.innerHTML = '';
  appendDivider('Today');
  appendMessage(
    'assistant',
    '👋 Hi there! I\'m the Nexus store assistant. I can help you with product info, pricing, availability, orders, and more.<br /><br />What can I help you with today?'
  );
  showSuggestions();
}

// ─── INPUT HELPERS ───────────────────────────────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  sendBtn.disabled = el.value.trim().length === 0;
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled && !isThinking) sendMessage();
  }
}

// ─── SUGGESTIONS ────────────────────────────────────────────────────────────
function sendSuggestion(btn) {
  const text = btn.textContent;
  hideSuggestions();
  dispatchMessage(text);
}

function hideSuggestions() {
  suggestions.style.display = 'none';
}

function showSuggestions() {
  suggestions.style.display = 'flex';
}

// ─── SEND MESSAGE ────────────────────────────────────────────────────────────
function sendMessage() {
  const text = input.value.trim();
  if (!text || isThinking) return;

  hideSuggestions();
  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;

  dispatchMessage(text);
}

async function dispatchMessage(text) {
  appendMessage('user', escapeHtml(text));
  scrollToBottom();

  isThinking = true;
  const typingId = appendTyping();
  scrollToBottom();

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, timestamp: new Date().toISOString() })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // n8n typically returns { output: "..." } or { message: "..." } or plain text
    const reply =
      data.output  ||
      data.message ||
      data.text    ||
      data.reply   ||
      data.response||
      (typeof data === 'string' ? data : null) ||
      'I received your message but couldn\'t parse the response.';

    removeTyping(typingId);
    appendMessage('assistant', formatReply(reply));

  } catch (err) {
    removeTyping(typingId);
    appendMessage('assistant', 'Something went wrong connecting to the assistant. Please try again.', true);
    console.error('[Chat] Error:', err);
  } finally {
    isThinking = false;
    scrollToBottom();
  }
}

// ─── DOM HELPERS ─────────────────────────────────────────────────────────────
function appendDivider(label) {
  const div = document.createElement('div');
  div.className = 'chat-date-divider';
  div.innerHTML = `<span>${label}</span>`;
  messages.appendChild(div);
}

function appendMessage(role, html, isError = false) {
  const now  = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const wrapper = document.createElement('div');
  wrapper.className = `msg ${role}`;

  if (role === 'assistant') {
    wrapper.innerHTML = `
      <div class="msg-avatar">AI</div>
      <div class="msg-body">
        <div class="msg-bubble${isError ? ' error' : ''}">${html}</div>
        <div class="msg-time">${time}</div>
      </div>`;
  } else {
    wrapper.innerHTML = `
      <div class="msg-body">
        <div class="msg-bubble">${html}</div>
        <div class="msg-time">${time}</div>
      </div>`;
  }

  messages.appendChild(wrapper);
  return wrapper;
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
  // Escape, then apply basic markdown-like formatting
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
