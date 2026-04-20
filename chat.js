// ─── CONFIG ─────────────────────────────────────────────────────────────────
// Use the PRODUCTION webhook URL (not webhook-test) and ensure workflow is activated in n8n
const N8N_WEBHOOK_URL = 'https://gpixie.app.n8n.cloud/webhook/3c0cbaf5-6283-4ec7-b806-b1bca58b7852';

// ↓ Replace YOUR_FORM_ID with your actual Tally form ID (Tally → Share → Embed → copy src)
const TALLY_FORM_URL = 'https://tally.so/embed/YOUR_FORM_ID?alignLeft=1&hideTitle=1&transparentBackground=1';
const BOOKING_KEYWORDS = ['book','appointment','schedule','demo','call','meeting','talk','speak'];
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
    console.log('[Chat] Sending to:', N8N_WEBHOOK_URL);

    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, timestamp: new Date().toISOString() })
    });

    console.log('[Chat] Response status:', res.status, res.statusText);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('[Chat] HTTP error body:', errBody);
      throw new Error(`HTTP ${res.status}: ${errBody || res.statusText}`);
    }

    const raw = await res.text();
    console.log('[Chat] Raw response:', raw);
    const reply = parseN8nResponse(raw);

    removeTyping(typingId);
    const msgEl = appendMessage('assistant', formatReply(reply));

    // Inline Tally booking form if booking intent detected
    const lowerText = text.toLowerCase();
    if (BOOKING_KEYWORDS.some(k => lowerText.includes(k)) && !TALLY_FORM_URL.includes('YOUR_FORM_ID')) {
      const wrap = document.createElement('div');
      wrap.className = 'msg-tally';
      wrap.innerHTML = `<iframe src="${TALLY_FORM_URL}" title="Book a call" allowfullscreen></iframe>`;
      const body = msgEl.querySelector('.msg-body');
      (body || msgEl).appendChild(wrap);
      setTimeout(scrollToBottom, 100);
    }

  } catch (err) {
    removeTyping(typingId);

    // Detect CORS/network failure vs HTTP error
    const isCors = err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch');
    const userMsg = isCors
      ? 'Connection blocked (CORS). Check that your n8n workflow is activated and allows cross-origin requests.'
      : 'Unable to reach the assistant right now. Please try again in a moment.';

    appendMessage('assistant', userMsg, true);
    console.error('[Chat] Error type:', err.constructor.name);
    console.error('[Chat] Error message:', err.message);
    console.error('[Chat] Full error:', err);
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
    return text;
  }

  const item = Array.isArray(data) ? data[0] : data;

  if (!item || typeof item !== 'object') {
    return typeof item === 'string' ? item : 'No response received.';
  }

  return (
    item.output   ||
    item.text     ||
    item.reply    ||
    item.response ||
    item.answer   ||
    item.content  ||
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
