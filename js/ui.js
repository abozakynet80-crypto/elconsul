/* ============================================================
   XERIA — أدوات واجهة مشتركة
   ============================================================ */

function toast(message, type = 'success') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--show'));
  setTimeout(() => {
    el.classList.remove('toast--show');
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

function openModal(html) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal-card">${html}</div></div>`;
  root.classList.add('is-open');
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
  document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeModal));
}
function closeModal() {
  const root = document.getElementById('modalRoot');
  root.classList.remove('is-open');
  root.innerHTML = '';
}

const AR_LOCALE = 'ar-EG-u-nu-latn'; /* أرقام إنجليزية مع تنسيق عربي، متسقة مع أرقام الطلبات */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(AR_LOCALE, { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(AR_LOCALE, { month: 'short', day: 'numeric' }) + ' — ' +
    d.toLocaleTimeString(AR_LOCALE, { hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(AR_LOCALE, { month: 'short', day: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(AR_LOCALE, { hour: '2-digit', minute: '2-digit' });
}
function initials(name) {
  if (!name) return '؟';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('');
}
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function statusBadge(status) {
  return `<span class="badge badge--status-${status}">${STATUS_LABELS[status]}</span>`;
}
function priorityBadge(priority) {
  return `<span class="badge badge--prio-${priority}">${PRIORITY_LABELS[priority]}</span>`;
}
function roleBadge(role) {
  return `<span class="badge badge--role-${role}">${ROLE_LABELS[role]}</span>`;
}
function clientTypeBadge(type) {
  return `<span class="badge badge--client-${type}">${CLIENT_TYPE_LABELS[type] || ''}</span>`;
}

const ICONS = {
  home: '<svg viewBox="0 0 24 24"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/></svg>',
  clients: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17.5" cy="9" r="2.4"/><path d="M15.6 14.7c2.5.3 4.4 2.1 4.4 4.8"/></svg>',
  requests: '<svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></svg>',
  team: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 19.5c.4-3.4 2.7-5.5 5.5-5.5s5.1 2.1 5.5 5.5M13 14.3c2.5.3 4.5 2.4 5 5.2"/></svg>',
  reports: '<svg viewBox="0 0 24 24"><path d="M5 20V10M11 20V4M17 20v-7"/><path d="M3 20h18"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.13-1.36l2-1.5-2-3.46-2.3.86a7 7 0 0 0-2.36-1.36L14 3h-4l-.2 2.18A7 7 0 0 0 7.44 6.5l-2.3-.86-2 3.46 2 1.5A7 7 0 0 0 5 12c0 .46.04.9.13 1.36l-2 1.5 2 3.46 2.3-.86a7 7 0 0 0 2.36 1.36L10 21h4l.2-2.18a7 7 0 0 0 2.36-1.36l2.3.86 2-3.46-2-1.5c.09-.46.13-.9.13-1.36Z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.7-3.7"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M9 3.5H6a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 6 20.5h3"/><path d="M15.5 16.5 20 12l-4.5-4.5M20 12H9"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M7 3.5h7L18.5 8V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5V8h4.5"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M6 3.5h9L19.5 8v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M9 12h6M9 16h4"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7"/></svg>'
};
function icon(name) { return ICONS[name] || ''; }
