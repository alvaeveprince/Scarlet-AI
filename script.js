/* ============================================================
   SCARLET AI — script.js
   Full-featured AI Chat Application
   ============================================================ */

'use strict';

// ============================================================
// STATE
// ============================================================
const App = {
  chats: [],
  activeChatId: null,
  isLoading: false,
  recognition: null,
  isRecording: false,
  pendingAttachments: [], // { type: 'file'|'image', name, data, preview }
  conversationHistory: [], // full message history for API context

  settings: {
    darkMode: true,
    accentColor: '#8B0000',
    fontSize: 'medium',
    glowIntensity: 'soft',
    responseStyle: 'professional',
    responseLength: 'balanced',
    creativity: 0.7,
    saveHistory: true,
    memoryEnabled: true,
    apiKey: '',
  },
};

// ============================================================
// DOM REFS
// ============================================================
const $ = id => document.getElementById(id);
const els = {
  sidebar: $('sidebar'),
  sidebarOverlay: $('sidebarOverlay'),
  sidebarClose: $('sidebarClose'),
  hamburger: $('hamburger'),
  chatList: $('chatList'),
  newChatBtn: $('newChatBtn'),
  searchChats: $('searchChats'),
  chatArea: $('chatArea'),
  welcomeScreen: $('welcomeScreen'),
  messages: $('messages'),
  messageInput: $('messageInput'),
  sendBtn: $('sendBtn'),
  voiceBtn: $('voiceBtn'),
  fileBtn: $('fileBtn'),
  imageBtn: $('imageBtn'),
  fileInput: $('fileInput'),
  imageInput: $('imageInput'),
  attachmentPreviews: $('attachmentPreviews'),
  topbarTitle: $('topbarTitle'),
  openSettings: $('openSettings'),
  topSettingsBtn: $('topSettingsBtn'),
  settingsBackdrop: $('settingsBackdrop'),
  closeSettings: $('closeSettings'),
  lightbox: $('lightbox'),
  lightboxImg: $('lightboxImg'),
  lightboxClose: $('lightboxClose'),
  toastContainer: $('toastContainer'),
  // Settings controls
  darkModeToggle: $('darkModeToggle'),
  saveHistoryToggle: $('saveHistoryToggle'),
  memoryToggle: $('memoryToggle'),
  creativitySlider: $('creativitySlider'),
  creativityVal: $('creativityVal'),
  apiKeyInput: $('apiKeyInput'),
  saveApiKey: $('saveApiKey'),
  resetApiKey: $('resetApiKey'),
  clearAllChatsBtn: $('clearAllChatsBtn'),
  clearMemoryBtn: $('clearMemoryBtn'),
};

// ============================================================
// INIT
// ============================================================
function init() {
  loadFromStorage();
  applySettings();
  renderChatList();
  if (App.chats.length > 0) {
    loadChat(App.chats[0].id);
  }
  bindEvents();
  setupSettingsPanels();
  syncSettingsUI();
  setupVoiceInput();
}

// ============================================================
// STORAGE
// ============================================================
function save() {
  if (App.settings.saveHistory) {
    localStorage.setItem('scarlet_chats', JSON.stringify(App.chats));
  }
  localStorage.setItem('scarlet_settings', JSON.stringify(App.settings));
}

function loadFromStorage() {
  try {
    const s = localStorage.getItem('scarlet_settings');
    if (s) App.settings = { ...App.settings, ...JSON.parse(s) };
    const c = localStorage.getItem('scarlet_chats');
    if (c) App.chats = JSON.parse(c);
  } catch (e) { /* ignore */ }
}

// ============================================================
// SETTINGS
// ============================================================
function applySettings() {
  const s = App.settings;
  document.body.classList.toggle('light-mode', !s.darkMode);
  document.body.classList.toggle('glow-minimal', s.glowIntensity === 'minimal');
  document.body.classList.toggle('glow-strong', s.glowIntensity === 'strong');
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.add('font-' + s.fontSize);
  // Apply accent color as CSS variable
  const r = document.documentElement;
  r.style.setProperty('--scarlet', s.accentColor);
  const hex = s.accentColor;
  const neon = lightenHex(hex, 50);
  r.style.setProperty('--neon', neon);
  r.style.setProperty('--neon-dim', hexToRgba(neon, 0.18));
  r.style.setProperty('--border-red', hexToRgba(neon, 0.25));
  r.style.setProperty('--neon-glow', `0 0 18px ${hexToRgba(neon, 0.55)}, 0 0 40px ${hexToRgba(hex, 0.3)}`);
  r.style.setProperty('--neon-glow-sm', `0 0 8px ${hexToRgba(neon, 0.4)}`);
}

function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
function lightenHex(hex, amount) {
  let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  r = Math.min(255, r + amount); g = Math.min(255, g + amount); b = Math.min(255, b + amount);
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

function syncSettingsUI() {
  const s = App.settings;
  els.darkModeToggle.checked = s.darkMode;
  els.saveHistoryToggle.checked = s.saveHistory;
  els.memoryToggle.checked = s.memoryEnabled;
  els.creativitySlider.value = s.creativity;
  els.creativityVal.textContent = s.creativity;
  els.apiKeyInput.value = s.apiKey ? '•'.repeat(12) : '';
  // Color swatches
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === s.accentColor);
  });
  // Button groups
  document.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('active', b.dataset.size === s.fontSize));
  document.querySelectorAll('[data-glow]').forEach(b => b.classList.toggle('active', b.dataset.glow === s.glowIntensity));
  document.querySelectorAll('[data-style]').forEach(b => b.classList.toggle('active', b.dataset.style === s.responseStyle));
  document.querySelectorAll('[data-length]').forEach(b => b.classList.toggle('active', b.dataset.length === s.responseLength));
}

function setupSettingsPanels() {
  // Tab switching
  document.querySelectorAll('.stab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.spanel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = $('tab-' + tab.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });

  // Dark mode
  els.darkModeToggle.addEventListener('change', () => {
    App.settings.darkMode = els.darkModeToggle.checked;
    applySettings(); save();
  });

  // Accent color
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      App.settings.accentColor = sw.dataset.color;
      applySettings(); save();
    });
  });

  // Font size
  document.querySelectorAll('[data-size]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-size]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      App.settings.fontSize = b.dataset.size;
      applySettings(); save();
    });
  });

  // Glow
  document.querySelectorAll('[data-glow]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-glow]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      App.settings.glowIntensity = b.dataset.glow;
      applySettings(); save();
    });
  });

  // Response style
  document.querySelectorAll('[data-style]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-style]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      App.settings.responseStyle = b.dataset.style;
      save();
    });
  });

  // Response length
  document.querySelectorAll('[data-length]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-length]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      App.settings.responseLength = b.dataset.length;
      save();
    });
  });

  // Creativity slider
  els.creativitySlider.addEventListener('input', () => {
    App.settings.creativity = parseFloat(els.creativitySlider.value);
    els.creativityVal.textContent = App.settings.creativity;
    save();
  });

  // Save history toggle
  els.saveHistoryToggle.addEventListener('change', () => {
    App.settings.saveHistory = els.saveHistoryToggle.checked;
    save();
  });

  // Memory toggle
  els.memoryToggle.addEventListener('change', () => {
    App.settings.memoryEnabled = els.memoryToggle.checked;
    save();
  });

  // API Key
  els.apiKeyInput.addEventListener('focus', () => {
    els.apiKeyInput.value = App.settings.apiKey;
    els.apiKeyInput.type = 'text';
  });
  els.apiKeyInput.addEventListener('blur', () => {
    els.apiKeyInput.type = 'password';
    if (!els.apiKeyInput.value) els.apiKeyInput.value = App.settings.apiKey ? '•'.repeat(12) : '';
  });
  els.saveApiKey.addEventListener('click', () => {
  const enteredKey = els.apiKeyInput.value.trim();

  // Prevent saving fake dots
  if (!enteredKey || enteredKey.includes('•')) {
    toast('Enter your real OpenRouter API key', 'error');
    return;
  }

  // Save real key
  App.settings.apiKey = enteredKey;
  save();

  // Mask it again
  els.apiKeyInput.type = 'password';
  els.apiKeyInput.value = '••••••••••';

  toast('API key saved', 'success');
});
  els.resetApiKey.addEventListener('click', () => {
    App.settings.apiKey = '';
    els.apiKeyInput.value = '';
    save();
    toast('API key removed');
  });

  // Clear all chats
  els.clearAllChatsBtn.addEventListener('click', () => {
    if (!confirm('Delete ALL conversations? This cannot be undone.')) return;
    App.chats = [];
    App.activeChatId = null;
    App.conversationHistory = [];
    save();
    renderChatList();
    showWelcome();
    closeSettings();
    toast('All chats cleared');
  });

  // Clear memory
  els.clearMemoryBtn.addEventListener('click', () => {
    App.conversationHistory = [];
    toast('Memory cleared', 'success');
  });
}

// ============================================================
// CHAT MANAGEMENT
// ============================================================
function newChat() {
  const id = 'chat_' + Date.now();
  const chat = { id, title: 'New Conversation', messages: [], createdAt: Date.now() };
  App.chats.unshift(chat);
  App.activeChatId = id;
  App.conversationHistory = [];
  save();
  renderChatList();
  showWelcome();
  els.topbarTitle.textContent = 'New Conversation';
}

function loadChat(id) {
  const chat = App.chats.find(c => c.id === id);
  if (!chat) return;
  App.activeChatId = id;
  App.conversationHistory = [];
  // Rebuild conversation history from messages
  chat.messages.forEach(m => {
  if (m.role !== 'system') {

    let textContent = '';

    if (typeof m.text === 'string') {
      textContent = m.text;
    }

    if (m.fileContent) {
      textContent += `\n\n[File: ${m.fileName || 'file'}]\n${m.fileContent}`;
    }

    if (m.imageData && !textContent) {
      textContent = '(image sent)';
    }

    App.conversationHistory.push({
      role: m.role === 'model' ? 'assistant' : m.role,
      parts: [{ text: textContent }]
    });
  }
});
  els.topbarTitle.textContent = chat.title;
  renderMessages(chat.messages);
  renderChatList();
  closeSidebar();
}

function getActiveChat() {
  return App.chats.find(c => c.id === App.activeChatId);
}

function addMessage(role, content) {
  // content can be a string or { text, imageData, fileName }
  let chat = getActiveChat();
  if (!chat) {
    // Auto-create chat
    const id = 'chat_' + Date.now();
    chat = { id, title: 'New Conversation', messages: [], createdAt: Date.now() };
    App.chats.unshift(chat);
    App.activeChatId = id;
    renderChatList();
  }
  const msg = { id: 'msg_' + Date.now(), role, ...content, timestamp: Date.now() };
  chat.messages.push(msg);
  // Auto-title from first user message
  if (role === 'user' && chat.title === 'New Conversation' && content.text) {
    chat.title = content.text.substring(0, 42) + (content.text.length > 42 ? '…' : '');
    els.topbarTitle.textContent = chat.title;
    renderChatList();
  }
  save();
  return msg;
}

function deleteChat(id, e) {
  e && e.stopPropagation();
  App.chats = App.chats.filter(c => c.id !== id);
  if (App.activeChatId === id) {
    App.activeChatId = null;
    App.conversationHistory = [];
    if (App.chats.length > 0) loadChat(App.chats[0].id);
    else showWelcome();
  }
  save();
  renderChatList();
}

function renameChat(id, e) {
  e && e.stopPropagation();
  const item = document.querySelector(`.chat-item[data-id="${id}"] .chat-item-title`);
  if (!item) return;
  const current = item.textContent;
  item.innerHTML = `<input type="text" value="${current.replace(/"/g, '&quot;')}" maxlength="60" />`;
  const input = item.querySelector('input');
  input.focus(); input.select();
  const finish = () => {
    const val = input.value.trim() || current;
    const chat = App.chats.find(c => c.id === id);
    if (chat) chat.title = val;
    if (App.activeChatId === id) els.topbarTitle.textContent = val;
    save();
    item.textContent = val;
  };
  input.addEventListener('blur', finish);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } if (e.key === 'Escape') { item.textContent = current; } });
}

// ============================================================
// RENDER
// ============================================================
function renderChatList(filter = '') {
  const query = filter.toLowerCase();
  const filtered = App.chats.filter(c => !query || c.title.toLowerCase().includes(query));
  els.chatList.innerHTML = '';
  if (!filtered.length) {
    els.chatList.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${filter ? 'No matches found' : 'No conversations yet'}</div>`;
    return;
  }
  filtered.forEach(chat => {
    const el = document.createElement('div');
    el.className = 'chat-item' + (chat.id === App.activeChatId ? ' active' : '');
    el.dataset.id = chat.id;
    el.innerHTML = `
      <div class="chat-item-dot"></div>
      <div class="chat-item-title">${escHtml(chat.title)}</div>
      <div class="chat-item-actions">
        <button title="Rename">✏</button>
        <button title="Delete">✕</button>
      </div>
    `;
    el.addEventListener('click', () => loadChat(chat.id));
    const [renameBtn, deleteBtn] = el.querySelectorAll('.chat-item-actions button');
    renameBtn.addEventListener('click', e => renameChat(chat.id, e));
    deleteBtn.addEventListener('click', e => deleteChat(chat.id, e));
    els.chatList.appendChild(el);
  });
}

function showWelcome() {
  els.welcomeScreen.style.display = 'flex';
  els.messages.innerHTML = '';
  els.topbarTitle.textContent = 'New Conversation';
}

function renderMessages(messages) {
  els.welcomeScreen.style.display = 'none';
  els.messages.innerHTML = '';
  messages.forEach(m => appendMessageDOM(m));
  scrollToBottom();
}

function appendMessageDOM(msg) {
  els.welcomeScreen.style.display = 'none';
  const div = document.createElement('div');
  div.className = `msg ${msg.role}`;
  div.id = msg.id;

  const isUser = msg.role === 'user';
  const avatarLetter = isUser ? 'U' : '⬡';
  const name = isUser ? 'You' : 'Scarlet AI';
  const time = formatTime(msg.timestamp);

  let contentHtml = '';
  if (msg.imageData) {
    contentHtml += `<img class="msg-image" src="${msg.imageData}" alt="Image" onclick="openLightbox('${msg.imageData}')" />`;
  }
  if (msg.fileName) {
    contentHtml += `<div class="msg-file"><svg viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>${escHtml(msg.fileName)}</div>`;
  }
  if (msg.text) {
    contentHtml += `<div class="msg-text">${formatMessageText(msg.text)}</div>`;
  }

  const actionsHtml = !isUser ? `
    <div class="msg-actions">
      <button class="msg-action-btn" onclick="copyMsg('${msg.id}')">
        <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
      <button class="msg-action-btn" onclick="regenerateMsg('${msg.id}')">
        <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.21"/></svg>
        Regenerate
      </button>
    </div>` : '';

  div.innerHTML = `
    <div class="msg-avatar">${avatarLetter}</div>
    <div class="msg-content-wrap">
      <div class="msg-meta">
        <span class="msg-name">${name}</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-bubble">${contentHtml}</div>
      ${actionsHtml}
    </div>
  `;
  els.messages.appendChild(div);
}

function formatMessageText(text) {
  // Simple markdown-like formatting
  let html = escHtml(text);
  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Lists
  html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Line breaks (preserve double newlines as paragraphs)
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br/>');
  if (!html.startsWith('<')) html = '<p>' + html + '</p>';
  return html;
}

function showTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="typing-avatar">⬡</div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  els.messages.appendChild(div);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = $('typingIndicator');
  if (el) el.remove();
}

function scrollToBottom() {
  els.chatArea.scrollTo({ top: els.chatArea.scrollHeight, behavior: 'smooth' });
}

// ============================================================
// SEND MESSAGE
// ============================================================
async function sendMessage() {
  if (App.isLoading) return;
  const text = els.messageInput.value.trim();
  const attachments = [...App.pendingAttachments];

  if (!text && !attachments.length) return;
  

  // Clear input
  els.messageInput.value = '';
  els.messageInput.style.height = 'auto';
  App.pendingAttachments = [];
  els.attachmentPreviews.innerHTML = '';

  // Build user message
  const msgContent = { text, role: 'user' };
  if (attachments.length) {
    const img = attachments.find(a => a.type === 'image');
    const file = attachments.find(a => a.type === 'file');
    if (img) { msgContent.imageData = img.data; }
    if (file) { msgContent.fileName = file.name; msgContent.fileContent = file.content; }
  }

  const userMsg = addMessage('user', msgContent);
  appendMessageDOM(userMsg);
  scrollToBottom();

  // Build context text
  let userText = text || '';
  if (msgContent.fileContent) userText += `\n\n[Attached file: ${msgContent.fileName}]\n${msgContent.fileContent}`;

  // Update conversation history
  if (App.settings.memoryEnabled) {
    App.conversationHistory.push({ role: 'user', parts: [{ text: userText || '(image sent)' }] });
  }

  // Call AI
  App.isLoading = true;
  els.sendBtn.style.opacity = '0.5';
  showTypingIndicator();

  try {
    const aiText = await callGemini(userText, msgContent.imageData || null);
    removeTypingIndicator();

    const aiMsg = addMessage('assistant', { text: aiText, role: 'assistant' });
    appendMessageDOM(aiMsg);

    if (App.settings.memoryEnabled) {
      App.conversationHistory.push({ role: 'assistant', parts: [{ text: aiText }] });
    }
     if (App.conversationHistory.length > 20) {
  App.conversationHistory = App.conversationHistory.slice(-20);
     }
  } catch (err) {
    removeTypingIndicator();
    const errMsg = addMessage('assistant', { text: `Something went wrong. Please try again.\n\n*Error: ${err.message}*`, role: 'assistant' });
    appendMessageDOM(errMsg);
    toast(err.message, 'error');
  } finally {
    App.isLoading = false;
    els.sendBtn.style.opacity = '1';
    scrollToBottom();
  }
}

// ============================================================
// GEMINI API
// ============================================================
async function callGemini(userText, imageData = null) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userText,
      imageData,
      history: App.conversationHistory
    })
  });

  const rawText = await resp.text();

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    throw new Error("Backend did not return valid JSON:\n" + rawText);
  }

  if (!resp.ok) {
    throw new Error(data?.error || rawText || 'Request failed');
  }

  return data.text;
}

function buildSystemPrompt() {
  const styleMap = {
    professional: 'You are a highly intelligent, professional AI assistant. Provide clear, accurate, and well-structured responses.',
    friendly: 'You are a warm, friendly, and helpful AI assistant. Be conversational and approachable while still being helpful and accurate.',
    creative: 'You are a creative and imaginative AI assistant. Think outside the box, use vivid language, and approach problems from unique angles.',
  };
  const lengthMap = {
    short: 'Be concise and brief. Get to the point quickly.',
    balanced: 'Provide thorough but appropriately concise responses.',
    detailed: 'Provide comprehensive, detailed explanations with examples where useful.',
  };
  return `${styleMap[App.settings.responseStyle] || styleMap.professional} ${lengthMap[App.settings.responseLength] || lengthMap.balanced} You are called Scarlet AI.`;
}

function getMaxTokens() {
  return App.settings.responseLength === 'short' ? 512 : App.settings.responseLength === 'detailed' ? 4096 : 1500;
}

// ============================================================
// MESSAGE ACTIONS
// ============================================================
window.copyMsg = function(msgId) {
  const chat = getActiveChat();
  if (!chat) return;
  const msg = chat.messages.find(m => m.id === msgId);
  if (!msg) return;
  navigator.clipboard.writeText(msg.text || '').then(() => toast('Copied!', 'success')).catch(() => toast('Copy failed'));
};

window.regenerateMsg = async function(msgId) {
  if (App.isLoading || !App.settings.apiKey) return;
  const chat = getActiveChat();
  if (!chat) return;
  const msgIndex = chat.messages.findIndex(m => m.id === msgId);
  if (msgIndex < 0) return;
  // Find last user message before this
  let userMsg = null;
  for (let i = msgIndex - 1; i >= 0; i--) {
    if (chat.messages[i].role === 'user') { userMsg = chat.messages[i]; break; }
  }
  if (!userMsg) return;
  // Remove old AI response DOM
  const old = $(msgId);
  if (old) old.remove();
  // Remove from messages array
  chat.messages.splice(msgIndex, 1);
  save();

  App.isLoading = true;
  els.sendBtn.style.opacity = '0.5';
  const placeholderMsg = addMessage('assistant', { text: 'Thinking...', role: 'assistant' });
  appendMessageDOM(placeholderMsg);
  showTypingIndicator();

try {
  const aiText = await callGemini(userMsg.text || '', userMsg.imageData);
  
  removeTypingIndicator();
  
  // update existing message instead of adding new one
  placeholderMsg.text = aiText;
  renderMessages(getActiveChat().messages);
  
} catch (err) {
  removeTypingIndicator();
  
  const errMsg = addMessage('model', {
    text: `Regeneration failed: ${err.message}`,
    role: 'model'
  });
  
  appendMessageDOM(errMsg);
  
} finally {
  App.isLoading = false;
  els.sendBtn.style.opacity = '1';
  scrollToBottom();
}
};

window.openLightbox = function(src) {
  els.lightboxImg.src = src;
  els.lightbox.classList.add('open');
};

// ============================================================
// FILE / IMAGE UPLOAD
// ============================================================
function setupFileUpload() {
  if (!els.fileBtn && !els.imageBtn && !els.fileInput && !els.imageInput) return;

  els.fileBtn?.addEventListener('click', () => els.fileInput?.click());
  els.imageBtn?.addEventListener('click', () => els.imageInput?.click());

  els.fileInput?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      reader.onload = async evt => {
        const typedArray = new Uint8Array(evt.target.result);
        const text = await extractPDFText(typedArray);
        App.pendingAttachments.push({
          type: 'file',
          name: file.name,
          content: text
        });
        renderAttachmentPreviews();
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = evt => {
        App.pendingAttachments.push({
          type: 'file',
          name: file.name,
          content: evt.target.result
        });
        renderAttachmentPreviews();
      };
      reader.readAsText(file);
    }

    e.target.value = '';
  });

  els.imageInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      App.pendingAttachments.push({
        type: 'image',
        name: file.name,
        data: evt.target.result
      });
      renderAttachmentPreviews();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
}

// ============================================================
// VOICE INPUT
// ============================================================
function setupVoiceInput() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) { els.voiceBtn.style.display = 'none'; return; }
  App.recognition = new SpeechRec();
  App.recognition.continuous = false;
  App.recognition.lang = 'en-US';
  App.recognition.onresult = e => {
    els.messageInput.value += e.results[0][0].transcript + ' ';
    autoResizeTextarea();
  };
  App.recognition.onend = () => {
    App.isRecording = false;
    els.voiceBtn.classList.remove('active');
  };
  App.recognition.onerror = () => {
    App.isRecording = false;
    els.voiceBtn.classList.remove('active');
    toast('Voice input error', 'error');
  };
  els.voiceBtn.addEventListener('click', () => {
    if (App.isRecording) {
      App.recognition.stop();
    } else {
      App.recognition.start();
      App.isRecording = true;
      els.voiceBtn.classList.add('active');
    }
  });
}

// ============================================================
// SETTINGS MODAL
// ============================================================
function openSettings() {
  syncSettingsUI();
  els.settingsBackdrop.classList.add('open');
}
function closeSettings() {
  els.settingsBackdrop.classList.remove('open');
}

// ============================================================
// SIDEBAR
// ============================================================
function toggleSidebar() {
  els.sidebar.classList.toggle('open');
  els.sidebarOverlay.classList.toggle('open');
}
function closeSidebar() {
  els.sidebar.classList.remove('open');
  els.sidebarOverlay.classList.remove('open');
}

// ============================================================
// EVENTS
// ============================================================
function bindEvents() {
  // New chat
  safeBind(els.newChatBtn, 'click', () => {
    newChat();
    closeSidebar();
  });

  // Send message
  safeBind(els.sendBtn, 'click', sendMessage);

  safeBind(els.messageInput, 'keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  safeBind(els.messageInput, 'input', autoResizeTextarea);

  // Sidebar
  safeBind(els.hamburger, 'click', toggleSidebar);
  safeBind(els.sidebarClose, 'click', closeSidebar);
  safeBind(els.sidebarOverlay, 'click', closeSidebar);

  // Search
  safeBind(els.searchChats, 'input', () => {
    renderChatList(els.searchChats.value);
  });

  // Settings
  safeBind(els.openSettings, 'click', openSettings);
  safeBind(els.topSettingsBtn, 'click', openSettings);
  safeBind(els.closeSettings, 'click', closeSettings);

  safeBind(els.settingsBackdrop, 'click', e => {
    if (e.target === els.settingsBackdrop) closeSettings();
  });

  // Lightbox
  safeBind(els.lightboxClose, 'click', () => {
    els.lightbox?.classList.remove('open');
  });

  safeBind(els.lightbox, 'click', e => {
    if (e.target === els.lightbox) {
      els.lightbox.classList.remove('open');
    }
  });

  // Prompt chips
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (!els.messageInput) return;
      els.messageInput.value = chip.dataset.prompt || '';
      autoResizeTextarea?.();
      els.messageInput.focus();
    });
  });

  // File upload (safe guard)
  if (typeof setupFileUpload === 'function') {
    try {
      setupFileUpload();
    } catch (err) {
      console.warn('File upload setup failed:', err);
    }
  }

  // Escape key (global safe)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSettings?.();
      els.lightbox?.classList.remove('open');
      closeSidebar?.();
    }
  });
}

// ============================================================
// HELPERS
// ============================================================
function autoResizeTextarea() {
  const ta = els.messageInput;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
}

function safeBind(el, event, handler) {
  if (!el) return;
  el.addEventListener(event, handler);
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = message;
  els.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease both';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}
async function extractPDFText(uint8Array) {
  try {
    const pdfjsLib = window.pdfjsLib;

    if (!pdfjsLib) {
      return "PDF text extraction not available. Please paste text manually.";
    }

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str).join(" ");
      text += strings + "\n";
    }

    return text;
  } catch (err) {
    return "Could not read PDF content.";
  }
    }
// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', init);
