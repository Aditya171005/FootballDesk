/**
 * chatbot.js — Football Hub AI Chat Widget
 * Add to every page: <script src="/js/chatbot.js"></script>
 * Requires: /api/chat route in app.js (see instructions)
 */

(function () {
  // ── STYLES ──────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');

    #fb-chat-bubble {
      position: fixed; bottom: 28px; left: 28px; z-index: 10000;
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #1a56ff, #0a2aaa);
      border: none; cursor: pointer;
      box-shadow: 0 4px 24px rgba(26,86,255,0.5), 0 0 0 0 rgba(26,86,255,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; transition: transform 0.2s, box-shadow 0.2s;
      animation: bubble-pulse 3s ease-in-out infinite;
    }
    #fb-chat-bubble:hover {
      transform: scale(1.1);
      box-shadow: 0 8px 32px rgba(26,86,255,0.7);
    }
    @keyframes bubble-pulse {
      0%,100% { box-shadow: 0 4px 24px rgba(26,86,255,0.5), 0 0 0 0 rgba(26,86,255,0.3); }
      50% { box-shadow: 0 4px 24px rgba(26,86,255,0.5), 0 0 0 10px rgba(26,86,255,0); }
    }

    #fb-chat-window {
      position: fixed; bottom: 96px; left: 28px; z-index: 10000;
      width: 360px; height: 520px;
      background: #080e1a;
      border: 1px solid rgba(26,86,255,0.25);
      border-radius: 20px;
      display: flex; flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(26,86,255,0.1);
      transform: scale(0.85) translateY(20px);
      opacity: 0; pointer-events: none;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }
    #fb-chat-window.open {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }

    /* Header */
    #fb-chat-header {
      padding: 16px 18px;
      background: linear-gradient(135deg, #0d1a3a, #0a1228);
      border-bottom: 1px solid rgba(26,86,255,0.2);
      display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
    }
    .fb-header-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, #1a56ff, #0a2aaa);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
      box-shadow: 0 0 12px rgba(26,86,255,0.4);
    }
    .fb-header-info { flex: 1; }
    .fb-header-name {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 16px; letter-spacing: 1.5px; color: white;
    }
    .fb-header-status {
      font-size: 11px; color: #00ff87;
      display: flex; align-items: center; gap: 5px; margin-top: 1px;
    }
    .fb-status-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #00ff87; animation: status-blink 2s infinite;
    }
    @keyframes status-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
    #fb-chat-close {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.5); width: 30px; height: 30px;
      border-radius: 8px; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    #fb-chat-close:hover { background: rgba(255,0,0,0.1); color: #ff6464; border-color: rgba(255,0,0,0.2); }

    /* Suggested questions */
    #fb-suggestions {
      padding: 12px 14px 0;
      display: flex; flex-wrap: wrap; gap: 6px;
      flex-shrink: 0;
    }
    .fb-suggestion {
      padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
      background: rgba(26,86,255,0.1); border: 1px solid rgba(26,86,255,0.2);
      color: rgba(255,255,255,0.7); cursor: pointer; transition: all 0.2s;
      font-family: 'DM Sans', sans-serif;
    }
    .fb-suggestion:hover { background: rgba(26,86,255,0.2); color: white; border-color: rgba(26,86,255,0.4); }

    /* Messages */
    #fb-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin; scrollbar-color: rgba(26,86,255,0.2) transparent;
    }
    #fb-messages::-webkit-scrollbar { width: 4px; }
    #fb-messages::-webkit-scrollbar-thumb { background: rgba(26,86,255,0.2); border-radius: 2px; }

    .fb-msg {
      max-width: 85%; display: flex; flex-direction: column; gap: 4px;
      animation: msg-in 0.3s ease;
    }
    @keyframes msg-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .fb-msg.user { align-self: flex-end; align-items: flex-end; }
    .fb-msg.bot { align-self: flex-start; align-items: flex-start; }

    .fb-bubble {
      padding: 10px 14px; border-radius: 16px;
      font-family: 'DM Sans', sans-serif; font-size: 13px; line-height: 1.5;
    }
    .fb-msg.user .fb-bubble {
      background: linear-gradient(135deg, #1a56ff, #0a2aaa);
      color: white; border-bottom-right-radius: 4px;
    }
    .fb-msg.bot .fb-bubble {
      background: #111d33; color: #e0e8ff;
      border: 1px solid rgba(26,86,255,0.15);
      border-bottom-left-radius: 4px;
    }
    .fb-msg-time {
      font-size: 10px; color: rgba(255,255,255,0.25);
      font-family: 'DM Sans', sans-serif;
    }

    /* Typing indicator */
    .fb-typing .fb-bubble {
      display: flex; align-items: center; gap: 5px;
      padding: 12px 16px;
    }
    .fb-typing-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: rgba(26,86,255,0.6);
      animation: typing-bounce 1.2s infinite;
    }
    .fb-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .fb-typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing-bounce {
      0%,60%,100% { transform: translateY(0); background: rgba(26,86,255,0.6); }
      30% { transform: translateY(-6px); background: #4f7cff; }
    }

    /* Input */
    #fb-input-wrap {
      padding: 12px 14px;
      border-top: 1px solid rgba(26,86,255,0.12);
      display: flex; gap: 8px; align-items: center;
      background: rgba(8,14,26,0.8); flex-shrink: 0;
    }
    #fb-input {
      flex: 1; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(26,86,255,0.2); border-radius: 12px;
      padding: 10px 14px; color: white; font-size: 13px;
      font-family: 'DM Sans', sans-serif; outline: none;
      transition: border-color 0.2s;
    }
    #fb-input::placeholder { color: rgba(255,255,255,0.25); }
    #fb-input:focus { border-color: rgba(26,86,255,0.5); }
    #fb-send {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, #1a56ff, #0a2aaa);
      border: none; color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; transition: all 0.2s; flex-shrink: 0;
    }
    #fb-send:hover { transform: scale(1.05); box-shadow: 0 4px 16px rgba(26,86,255,0.5); }
    #fb-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

    /* Clear button */
    #fb-clear {
      background: none; border: none; color: rgba(255,255,255,0.2);
      font-size: 11px; cursor: pointer; padding: 0 4px;
      font-family: 'DM Sans', sans-serif; transition: color 0.2s;
    }
    #fb-clear:hover { color: rgba(255,100,100,0.6); }

    @media (max-width: 480px) {
      #fb-chat-window { width: calc(100vw - 32px); left: 16px; bottom: 88px; }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ─────────────────────────────────────────────────
  const container = document.createElement('div');
  container.innerHTML = `
    <button id="fb-chat-bubble" title="Ask anything about football">⚽</button>

    <div id="fb-chat-window">
      <div id="fb-chat-header">
        <div class="fb-header-avatar">⚽</div>
        <div class="fb-header-info">
          <div class="fb-header-name">Football AI</div>
          <div class="fb-header-status">
            <div class="fb-status-dot"></div>
            Ask me anything about football
          </div>
        </div>
        <button id="fb-chat-close">✕</button>
      </div>

      <div id="fb-suggestions">
        <button class="fb-suggestion">🏆 UCL top scorers?</button>
        <button class="fb-suggestion">📊 PL table?</button>
        <button class="fb-suggestion">⚽ Best striker 2025?</button>
        <button class="fb-suggestion">🔥 Recent transfers?</button>
      </div>

      <div id="fb-messages"></div>

      <div id="fb-input-wrap">
        <button id="fb-clear" title="Clear chat">🗑</button>
        <input id="fb-input" type="text" placeholder="Ask about any football topic..." maxlength="300" autocomplete="off">
        <button id="fb-send">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // ── STATE ────────────────────────────────────────────────
  const win = document.getElementById('fb-chat-window');
  const bubble = document.getElementById('fb-chat-bubble');
  const messages = document.getElementById('fb-messages');
  const input = document.getElementById('fb-input');
  const sendBtn = document.getElementById('fb-send');
  let conversationHistory = [];
  let isOpen = false;

  // ── TOGGLE ───────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    bubble.textContent = isOpen ? '✕' : '⚽';
    if (isOpen) {
      if (messages.children.length === 0) addWelcome();
      setTimeout(() => input.focus(), 300);
    }
  }

  bubble.addEventListener('click', toggleChat);
  document.getElementById('fb-chat-close').addEventListener('click', toggleChat);

  // ── WELCOME ──────────────────────────────────────────────
  function addWelcome() {
    addBotMessage("Hey! I'm your Football AI assistant ⚽ I can answer anything — current standings, fixtures, transfer news, history, stats, predictions. What do you want to know?");
  }

  // ── SUGGESTIONS ─────────────────────────────────────────
  document.querySelectorAll('.fb-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.textContent.replace(/^[^\w]+/, '').trim();
      sendMessage();
    });
  });

  // ── CLEAR ────────────────────────────────────────────────
  document.getElementById('fb-clear').addEventListener('click', () => {
    messages.innerHTML = '';
    conversationHistory = [];
    addWelcome();
  });

  // ── SEND ─────────────────────────────────────────────────
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

  function sendMessage() {
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    input.value = '';

    addUserMessage(text);
    conversationHistory.push({ role: 'user', content: text });

    sendBtn.disabled = true;
    const typingEl = addTyping();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory })
    })
    .then(r => r.json())
    .then(data => {
      typingEl.remove();
      const reply = data.reply || "Sorry, I couldn't get a response. Try again!";
      addBotMessage(reply);
      conversationHistory.push({ role: 'assistant', content: reply });
      sendBtn.disabled = false;
      input.focus();
    })
    .catch(() => {
      typingEl.remove();
      addBotMessage("⚠️ Connection error — make sure the server is running and try again.");
      sendBtn.disabled = false;
    });
  }

  // ── MESSAGE HELPERS ──────────────────────────────────────
  function addUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'fb-msg user';
    el.innerHTML = `<div class="fb-bubble">${escapeHtml(text)}</div><div class="fb-msg-time">${getTime()}</div>`;
    messages.appendChild(el);
    scrollToBottom();
  }

  function addBotMessage(text) {
    const el = document.createElement('div');
    el.className = 'fb-msg bot';
    el.innerHTML = `<div class="fb-bubble">${formatText(text)}</div><div class="fb-msg-time">Football AI · ${getTime()}</div>`;
    messages.appendChild(el);
    scrollToBottom();
  }

  function addTyping() {
    const el = document.createElement('div');
    el.className = 'fb-msg bot fb-typing';
    el.innerHTML = `<div class="fb-bubble"><div class="fb-typing-dot"></div><div class="fb-typing-dot"></div><div class="fb-typing-dot"></div></div>`;
    messages.appendChild(el);
    scrollToBottom();
    return el;
  }

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function getTime() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatText(text) {
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }
})();