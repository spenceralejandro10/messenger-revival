const contacts = [
  { id: 'alex', name: 'Alex', status: 'online', mood: 'Disponible', initials: 'A' },
  { id: 'luna', name: 'Luna', status: 'online', mood: 'Escuchando música 🎵', initials: 'L' },
  { id: 'owen', name: 'Owen', status: 'away', mood: 'Vuelvo en un momento', initials: 'O' },
  { id: 'mia', name: 'Mia', status: 'busy', mood: 'No molestar', initials: 'M' },
  { id: 'atlas', name: 'AtlasBot', status: 'online', mood: 'Siempre conectado 🤖', initials: 'AI' }
];

const nickPool = ['Neo2005', 'BlueAngel', 'PixelDream', 'RetroStar', 'NightOwl', 'SkyWalker', 'MessengerKid'];
const stateLabels = { online: 'Disponible', away: 'Ausente', busy: 'Ocupado' };

let activeContactId = 'alex';
let toastTimer;

const els = {
  displayName: document.querySelector('#displayName'),
  statusSelect: document.querySelector('#statusSelect'),
  selfStatusDot: document.querySelector('#selfStatusDot'),
  randomNickBtn: document.querySelector('#randomNickBtn'),
  newChatBtn: document.querySelector('#newChatBtn'),
  contactSearch: document.querySelector('#contactSearch'),
  contactList: document.querySelector('#contactList'),
  onlineCounter: document.querySelector('#onlineCounter'),
  chatWindow: document.querySelector('#chatWindow'),
  chatTitle: document.querySelector('#chatTitle'),
  chatSubtitle: document.querySelector('#chatSubtitle'),
  chatStatusDot: document.querySelector('#chatStatusDot'),
  chatInfoName: document.querySelector('#chatInfoName'),
  chatAvatar: document.querySelector('#chatAvatar'),
  messagePane: document.querySelector('#messagePane'),
  messageForm: document.querySelector('#messageForm'),
  messageInput: document.querySelector('#messageInput'),
  nudgeBtn: document.querySelector('#nudgeBtn'),
  toast: document.querySelector('#toast')
};

function storageKey(contactId) {
  return `messenger-revival:${contactId}`;
}

function getMessages(contactId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(contactId))) || [];
  } catch {
    return [];
  }
}

function saveMessages(contactId, messages) {
  localStorage.setItem(storageKey(contactId), JSON.stringify(messages.slice(-100)));
}

function seedConversation(contactId) {
  const existing = getMessages(contactId);
  if (existing.length) return existing;

  const contact = contacts.find(c => c.id === contactId);
  const now = Date.now();
  const seeded = [
    { sender: 'them', text: `¡Hola! Soy ${contact.name}. Qué bueno verte conectado 😄`, time: now - 120000 },
    { sender: 'me', text: 'Estamos reviviendo el Messenger clásico. Esto apenas comienza 👋', time: now - 60000 }
  ];
  saveMessages(contactId, seeded);
  return seeded;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

function currentContact() {
  return contacts.find(c => c.id === activeContactId);
}

function renderContacts(filter = '') {
  const normalized = filter.trim().toLowerCase();
  els.contactList.innerHTML = '';

  contacts
    .filter(c => c.name.toLowerCase().includes(normalized) || c.mood.toLowerCase().includes(normalized))
    .forEach(contact => {
      const li = document.createElement('li');
      li.className = `contact-item${contact.id === activeContactId ? ' active' : ''}`;
      li.dataset.id = contact.id;
      li.innerHTML = `
        <div class="contact-mini-avatar">${contact.initials}</div>
        <span class="status-dot ${contact.status}" aria-hidden="true"></span>
        <div class="contact-copy">
          <strong>${contact.name}</strong>
          <small>${contact.mood}</small>
        </div>
      `;
      li.addEventListener('click', () => openChat(contact.id));
      els.contactList.appendChild(li);
    });

  els.onlineCounter.textContent = contacts.filter(c => c.status === 'online').length;
}

function renderMessages() {
  const messages = seedConversation(activeContactId);
  const contact = currentContact();
  els.messagePane.innerHTML = '';

  messages.forEach(message => {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${message.sender === 'me' ? 'mine' : ''}`;

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.textContent = `${message.sender === 'me' ? els.displayName.value || 'Tú' : contact.name} dice (${formatTime(message.time)}):`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = message.text;

    wrapper.append(meta, bubble);
    els.messagePane.appendChild(wrapper);
  });

  els.messagePane.scrollTop = els.messagePane.scrollHeight;
}

function openChat(contactId) {
  activeContactId = contactId;
  const contact = currentContact();

  els.chatTitle.textContent = contact.name;
  els.chatSubtitle.textContent = stateLabels[contact.status];
  els.chatInfoName.textContent = contact.name;
  els.chatAvatar.textContent = contact.initials;
  els.chatStatusDot.className = `status-dot ${contact.status}`;

  renderContacts(els.contactSearch.value);
  renderMessages();
  els.messageInput.focus();
}

function appendMessage(sender, text) {
  const messages = getMessages(activeContactId);
  messages.push({ sender, text, time: Date.now() });
  saveMessages(activeContactId, messages);
  renderMessages();
}

function simulateReply() {
  const contact = currentContact();
  const replies = [
    'Jajaja, esto sí se siente como 2005 😂',
    '¡Qué recuerdos! 👋',
    'Estoy conectado. ¿Qué hacemos ahora?',
    'Ese zumbido me desbloqueó un recuerdo 😅',
    'Messenger Revival está quedando muy retro 😎'
  ];

  window.setTimeout(() => {
    if (contact.id === activeContactId) {
      appendMessage('them', replies[Math.floor(Math.random() * replies.length)]);
    }
  }, 700 + Math.random() * 900);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('show');
  toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), 1800);
}

function triggerNudge() {
  els.chatWindow.classList.remove('nudging');
  void els.chatWindow.offsetWidth;
  els.chatWindow.classList.add('nudging');
  const contact = currentContact();

  const system = document.createElement('div');
  system.className = 'system-message';
  system.textContent = `⚡ Has enviado un zumbido a ${contact.name}.`;
  els.messagePane.appendChild(system);
  els.messagePane.scrollTop = els.messagePane.scrollHeight;
  showToast(`⚡ Zumbido enviado a ${contact.name}`);
}

els.messageForm.addEventListener('submit', event => {
  event.preventDefault();
  const text = els.messageInput.value.trim();
  if (!text) return;

  appendMessage('me', text);
  els.messageInput.value = '';
  simulateReply();
});

els.messageInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    els.messageForm.requestSubmit();
  }
});

document.querySelectorAll('.emoji-btn').forEach(button => {
  button.addEventListener('click', () => {
    els.messageInput.value += button.dataset.emoji;
    els.messageInput.focus();
  });
});

els.nudgeBtn.addEventListener('click', triggerNudge);

els.statusSelect.addEventListener('change', () => {
  els.selfStatusDot.className = `status-dot ${els.statusSelect.value}`;
  localStorage.setItem('messenger-revival:self-status', els.statusSelect.value);
  showToast(`Estado: ${stateLabels[els.statusSelect.value]}`);
});

els.displayName.addEventListener('change', () => {
  const value = els.displayName.value.trim() || 'Spencer';
  els.displayName.value = value;
  localStorage.setItem('messenger-revival:nick', value);
  renderMessages();
});

els.randomNickBtn.addEventListener('click', () => {
  const nick = nickPool[Math.floor(Math.random() * nickPool.length)];
  els.displayName.value = nick;
  localStorage.setItem('messenger-revival:nick', nick);
  renderMessages();
  showToast(`Tu nuevo apodo es ${nick}`);
});

els.newChatBtn.addEventListener('click', () => {
  const nextIndex = (contacts.findIndex(c => c.id === activeContactId) + 1) % contacts.length;
  openChat(contacts[nextIndex].id);
  showToast(`Conversación abierta con ${contacts[nextIndex].name}`);
});

els.contactSearch.addEventListener('input', event => renderContacts(event.target.value));

function init() {
  const savedNick = localStorage.getItem('messenger-revival:nick');
  const savedStatus = localStorage.getItem('messenger-revival:self-status');
  if (savedNick) els.displayName.value = savedNick;
  if (savedStatus && stateLabels[savedStatus]) {
    els.statusSelect.value = savedStatus;
    els.selfStatusDot.className = `status-dot ${savedStatus}`;
  }

  renderContacts();
  openChat(activeContactId);
}

init();
