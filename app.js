/* ============================================================
   XERIA — التطبيق الرئيسي: التنقل، الداشبورد، الإقلاع
   ============================================================ */

const APP_STATE = { tenantId: null, userId: null, currentPage: 'dashboard' };

const NAV_ITEMS = [
  { key: 'dashboard', label: 'الرئيسية', icon: 'home' },
  { key: 'clients', label: 'العملاء', icon: 'clients' },
  { key: 'requests', label: 'الطلبات', icon: 'requests' },
  { key: 'team', label: 'فريق العمل', icon: 'team' },
  { key: 'reports', label: 'التقارير', icon: 'reports' },
  { key: 'settings', label: 'الإعدادات', icon: 'settings' }
];

const PAGE_RENDERERS = {
  dashboard: renderDashboardPage,
  clients: renderClientsPage,
  requests: renderRequestsPage,
  team: renderTeamPage,
  reports: renderReportsPage,
  settings: renderSettingsPage
};
const PAGE_WIRERS = {
  dashboard: wireDashboardPage,
  clients: wireClientsPage,
  requests: wireRequestsPage,
  team: wireTeamPage,
  reports: wireReportsPage,
  settings: wireSettingsPage
};

/* ---------- إقلاع التطبيق ---------- */
function bootApp() {
  const session = getCurrentUser();
  if (!session) { renderLoginScreen(); return; }
  APP_STATE.tenantId = session.tenantId;
  APP_STATE.userId = session.userId;

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  renderShell();
  navigateTo('dashboard');
}

function renderShell() {
  const tenant = getTenant(APP_STATE.tenantId);
  const user = getUserById(APP_STATE.tenantId, APP_STATE.userId);

  document.getElementById('app').innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar__brand">
        <div class="brand-mark">${brandMark()}</div>
        <div class="brand-text"><strong>XERIA</strong><span>${escapeHtml(tenant?.name || '')}</span></div>
      </div>
      <nav class="sidebar__nav">
        ${NAV_ITEMS.map(item => `
          <button class="nav-item" data-nav="${item.key}">
            ${icon(item.icon)}<span>${item.label}</span>
          </button>
        `).join('')}
      </nav>
      <div class="sidebar__user">
        <div class="avatar">${initials(user?.name)}</div>
        <div class="sidebar__user-info"><strong>${escapeHtml(user?.name || '')}</strong><span>${ROLE_LABELS[user?.role] || ''}</span></div>
        <button class="icon-btn" id="logoutBtn" title="تسجيل الخروج">${icon('logout')}</button>
      </div>
    </aside>

    <div class="main-col">
      <header class="topbar">
        <button class="icon-btn topbar__menu" id="mobileMenuBtn">${icon('menu')}</button>
        <div class="topbar__title" id="topbarTitle">الرئيسية</div>
        <div class="topbar__office">${escapeHtml(tenant?.name || '')}</div>
      </header>
      <main class="page" id="pageBody"></main>
    </div>

    <nav class="bottom-nav" id="bottomNav">
      ${NAV_ITEMS.filter(i => i.key !== 'settings').map(item => `
        <button class="bottom-nav__item" data-nav="${item.key}">
          ${icon(item.icon)}<span>${item.label}</span>
        </button>
      `).join('')}
    </nav>

    <div class="toast-wrap" id="toastWrap"></div>
    <div class="modal-root" id="modalRoot"></div>
  `;

  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-nav')));
  });
  document.getElementById('logoutBtn').addEventListener('click', doLogout);
  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('is-open');
  });
}

function navigateTo(page) {
  APP_STATE.currentPage = page;
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-nav') === page);
  });
  const navItem = NAV_ITEMS.find(i => i.key === page);
  document.getElementById('topbarTitle').textContent = navItem ? navItem.label : '';
  document.getElementById('sidebar').classList.remove('is-open');
  rerenderCurrentPageBody();
}

function rerenderCurrentPageBody() {
  const page = APP_STATE.currentPage;
  const renderer = PAGE_RENDERERS[page];
  if (!renderer) return;
  document.getElementById('pageBody').innerHTML = renderer();
  const wirer = PAGE_WIRERS[page];
  if (wirer) wirer();
}

function refreshSidebarBadges() {
  // مكان مخصص لتحديث أي عدادات مستقبلية في الشريط الجانبي
}

/* ============================================================
   لوحة التحكم (Dashboard)
   ============================================================ */
function renderDashboardPage() {
  const tenantId = APP_STATE.tenantId;
  const requests = getRequests(tenantId);
  const clients = getClients(tenantId);
  const activity = getRecentActivity(tenantId, 8);

  const counts = {
    total: requests.length,
    new: requests.filter(r => r.status === 'new').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    review: requests.filter(r => r.status === 'review').length,
    completed: requests.filter(r => r.status === 'completed').length,
    delivered: requests.filter(r => r.status === 'delivered').length,
    overdue: requests.filter(isRequestOverdue).length
  };

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  return `
    <div class="page-head">
      <div><h1>مرحبًا بك 👋</h1><p class="page-sub">هذه نظرة سريعة على أداء المكتب اليوم</p></div>
    </div>

    <div class="stat-grid stat-grid--8">
      ${statCard('إجمالي العملاء', clients.length)}
      ${statCard('إجمالي الطلبات', counts.total)}
      ${statCard('طلبات جديدة', counts.new)}
      ${statCard('جاري التنفيذ', counts.in_progress)}
      ${statCard('قيد المراجعة', counts.review)}
      ${statCard('مكتملة', counts.completed)}
      ${statCard('تم تسليمها', counts.delivered)}
      ${statCard('طلبات متأخرة', counts.overdue, counts.overdue > 0 ? 'warn' : '')}
    </div>

    <div class="dash-grid">
      <div class="report-card">
        <div class="report-card__head">
          <h3>الطلبات الأخيرة</h3>
          <button class="btn-link" data-nav="requests">عرض الكل</button>
        </div>
        <div class="table-wrap">
          <table class="data-table data-table--compact">
            <thead><tr><th>الرقم</th><th>العميل</th><th>العنوان</th><th>الموظف</th><th>الحالة</th><th>الأولوية</th><th>التسليم</th></tr></thead>
            <tbody>
              ${recentRequests.map(r => {
                const client = getClientById(tenantId, r.clientId);
                const assignee = r.assignedTo ? getUserById(tenantId, r.assignedTo) : null;
                return `<tr data-open-request="${r.id}">
                  <td class="mono">${r.code}</td>
                  <td>${escapeHtml(client ? client.name : '—')}</td>
                  <td>${escapeHtml(r.title)}</td>
                  <td>${assignee ? escapeHtml(assignee.name) : 'غير مسند'}</td>
                  <td>${statusBadge(r.status)}</td>
                  <td>${priorityBadge(r.priority)}</td>
                  <td>${fmtDate(r.dueDate)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="report-card">
        <h3>نشاط الفريق</h3>
        <div class="activity-list">
          ${activity.length ? activity.map(a => {
            const user = a.userId ? getUserById(tenantId, a.userId) : null;
            return `<div class="activity-row">
              <div class="activity-row__dot"></div>
              <div>
                <strong>${escapeHtml(a.action)}</strong>
                <span class="muted-sm">${user ? escapeHtml(user.name) + ' — ' : ''}${fmtDateTime(a.createdAt)}</span>
              </div>
            </div>`;
          }).join('') : '<p class="muted-sm">لا يوجد نشاط بعد</p>'}
        </div>
      </div>
    </div>
  `;
}

function wireDashboardPage() {
  document.querySelectorAll('[data-open-request]').forEach(el => {
    el.addEventListener('click', () => openRequestDetails(el.getAttribute('data-open-request')));
  });
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-nav')));
  });
}

/* ============================================================
   الإعدادات
   ============================================================ */
function renderSettingsPage() {
  const tenant = getTenant(APP_STATE.tenantId);
  const user = getUserById(APP_STATE.tenantId, APP_STATE.userId);
  return `
    <div class="page-head"><div><h1>الإعدادات</h1><p class="page-sub">بيانات المكتب والحساب الحالي</p></div></div>
    <div class="report-card">
      <h3>بيانات المكتب</h3>
      <div class="detail-grid">
        <div><span>اسم المكتب</span><strong>${escapeHtml(tenant?.name || '')}</strong></div>
        <div><span>معرّف المكتب (Tenant ID)</span><strong class="mono">${escapeHtml(tenant?.id || '')}</strong></div>
        <div><span>المستخدم الحالي</span><strong>${escapeHtml(user?.name || '')}</strong></div>
        <div><span>الدور</span>${roleBadge(user?.role)}</div>
      </div>
      <p class="muted-sm hint-sm">هذه نسخة Demo تعمل محليًا على المتصفح باستخدام localStorage. عند الانتقال إلى الإصدار الكامل سيتم ربط هذه البيانات بـ Firebase مع الحفاظ على نفس بنية عزل بيانات كل مكتب (Tenant).</p>
      <button class="btn btn--ghost btn--sm" id="resetDemoBtn">إعادة ضبط الديمو</button>
      <p class="muted-sm hint-sm">تعيد هذه الخطوة تجربة الديمو المحلية (localStorage) فقط إلى بياناتها الافتراضية، ولا علاقة لها بأي بيانات حقيقية سيتم ربطها لاحقًا عبر Firebase.</p>
    </div>
  `;
}
function wireSettingsPage() {
  const btn = document.getElementById('resetDemoBtn');
  if (btn) btn.addEventListener('click', resetLocalDemoData);
}

/* إعادة ضبط الديمو: تمسح فقط مفاتيح localStorage الخاصة بهذه النسخة التجريبية
   (xeria_*) وتعيد توليد بيانات الـ Seed الافتراضية. هذه الوظيفة خاصة ببيئة
   Demo/localStorage فقط، ولن يكون لها أي دور بعد الانتقال إلى Firebase مستقبلًا. */
function resetLocalDemoData() {
  if (!confirm('سيتم حذف كل بيانات الديمو الحالية في هذا المتصفح وإعادة إنشاء بيانات الديمو الافتراضية. متابعة؟')) return;
  Object.values(DB_KEYS).forEach(k => localStorage.removeItem(k));
  seedDemoData();
  toast('تمت إعادة ضبط الديمو إلى وضعها الافتراضي');
  logout();
  location.reload();
}

/* ============================================================
   نقطة الانطلاق
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  const session = getCurrentUser();
  if (session) {
    bootApp();
  } else {
    renderLoginScreen();
  }
});
