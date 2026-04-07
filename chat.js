// ─── CONFIG ─────────────────────────────────────────────────────────────────
// TODO: Replace with your n8n webhook URL
const N8N_WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL_HERE';
// ────────────────────────────────────────────────────────────────────────────

const widget      = document.getElementById('chatWidget');
const messages    = document.getElementById('chatMessages');
const input       = document.getElementById('chatInput');
const sendBtn     = document.getElementById('sendBtn');
const fabBtn      = document.getElementById('fabBtn');
const suggestions = document.getElementById('chatSuggestions');

let isOpen     = false;
let isThinking = false;

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

  isThinking = true;
  const typingId = appendTyping();
  scrollToBottom();

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, timestamp: new Date().toISOString() })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Read raw text first — n8n can return JSON or plain text
    const raw = await res.text();
    const reply = parseN8nResponse(raw);

    removeTyping(typingId);
    appendMessage('assistant', formatReply(reply));

  } catch (err) {
    removeTyping(typingId);
    appendMessage('assistant', 'Unable to reach the assistant right now. Please try again in a moment.', true);
    console.error('[Chat] Fetch error:', err);
  } finally {
    isThinking = false;
    scrollToBottom();
  }
}

// ─── N8N RESPONSE PARSER ─────────────────────────────────────────────────────
// Handles all common n8n output shapes:
//   Plain text
//   { "output": "..." }
//   { "message": "..." }
//   [{ "output": "..." }]          <- most common from n8n Respond to Webhook node
//   [{ "message": { "content": "..." } }]
function parseN8nResponse(raw) {
  const text = raw.trim();
  if (!text) return 'No response received.';

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Not JSON — treat as plain text
    return text;
  }

  // Unwrap array (n8n often wraps in [ ])
  const item = Array.isArray(data) ? data[0] : data;

  if (!item || typeof item !== 'object') {
    return typeof item === 'string' ? item : 'No response received.';
  }

  // Common field names
  return (
    item.output   ||
    item.text     ||
    item.reply    ||
    item.response ||
    item.answer   ||
    item.content  ||
    // Nested: { message: { content: "..." } }
    (item.message && typeof item.message === 'object' ? item.message.content : null) ||
    (typeof item.message === 'string' ? item.message : null) ||
    JSON.stringify(item)
  );
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
