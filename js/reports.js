/* ============================================================
   XERIA — صفحة التقارير
   ============================================================ */

function renderReportsPage() {
  const tenantId = APP_STATE.tenantId;
  const requests = getRequests(tenantId);
  const clients = getClients(tenantId);
  const users = getUsers(tenantId);

  const byStatus = REQUEST_STATUSES.map(s => ({
    label: STATUS_LABELS[s],
    value: requests.filter(r => r.status === s).length,
    key: s
  }));
  const byUser = users.map(u => ({
    label: u.name,
    value: requests.filter(r => r.assignedTo === u.id).length
  })).sort((a, b) => b.value - a.value);

  const completed = requests.filter(r => r.status === 'completed' || r.status === 'delivered').length;
  const overdue = requests.filter(isRequestOverdue).length;
  const maxStatus = Math.max(1, ...byStatus.map(s => s.value));
  const maxUser = Math.max(1, ...byUser.map(u => u.value));

  return `
    <div class="page-head">
      <div><h1>التقارير</h1><p class="page-sub">نظرة عامة على أداء المكتب</p></div>
    </div>

    <div class="stat-grid">
      ${statCard('إجمالي الطلبات', requests.length)}
      ${statCard('إجمالي العملاء', clients.length)}
      ${statCard('الطلبات المكتملة', completed)}
      ${statCard('الطلبات المتأخرة', overdue, overdue > 0 ? 'warn' : '')}
    </div>

    <div class="report-grid">
      <div class="report-card">
        <h3>الطلبات حسب الحالة</h3>
        <div class="bar-chart">
          ${byStatus.map(s => `
            <div class="bar-chart__row">
              <span class="bar-chart__label">${s.label}</span>
              <div class="bar-chart__track">
                <div class="bar-chart__fill badge--status-${s.key}-bg" style="width:${(s.value / maxStatus) * 100}%"></div>
              </div>
              <span class="bar-chart__value">${s.value}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="report-card">
        <h3>الطلبات حسب الموظف</h3>
        <div class="bar-chart">
          ${byUser.length ? byUser.map(u => `
            <div class="bar-chart__row">
              <span class="bar-chart__label">${escapeHtml(u.label)}</span>
              <div class="bar-chart__track">
                <div class="bar-chart__fill bar-chart__fill--accent" style="width:${(u.value / maxUser) * 100}%"></div>
              </div>
              <span class="bar-chart__value">${u.value}</span>
            </div>
          `).join('') : '<p class="muted-sm">لا يوجد موظفون بعد</p>'}
        </div>
      </div>
    </div>
  `;
}

function statCard(label, value, tone = '') {
  return `<div class="stat-card ${tone ? 'stat-card--' + tone : ''}">
    <span class="stat-card__value">${value}</span>
    <span class="stat-card__label">${label}</span>
  </div>`;
}

function wireReportsPage() { /* لا يوجد أحداث إضافية حاليًا */ }
