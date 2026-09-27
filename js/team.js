/* ============================================================
   XERIA — صفحة فريق العمل
   ============================================================ */

function renderTeamPage() {
  const tenantId = APP_STATE.tenantId;
  const users = getUsers(tenantId);
  const requests = getRequests(tenantId);

  return `
    <div class="page-head">
      <div><h1>فريق العمل</h1><p class="page-sub">${users.length} أعضاء في الفريق</p></div>
    </div>
    <div class="card-grid">
      ${users.map(u => teamCardHtml(u, requests)).join('')}
    </div>
  `;
}

function teamCardHtml(u, requests) {
  const assigned = requests.filter(r => r.assignedTo === u.id).length;
  return `
    <div class="entity-card">
      <div class="entity-card__top">
        <div class="avatar avatar--cyan">${initials(u.name)}</div>
        <div class="entity-card__title">
          <strong>${escapeHtml(u.name)}</strong>
          <span>${escapeHtml(u.jobTitle || '')}</span>
        </div>
      </div>
      <div class="entity-card__meta">
        <span>${escapeHtml(u.email || '—')}</span>
        <span>${escapeHtml(u.phone || '—')}</span>
      </div>
      <div class="entity-card__foot">
        ${roleBadge(u.role)}
        <span class="chip">${assigned} طلب مسند</span>
      </div>
      <div class="entity-card__status-dot ${u.status === 'active' ? 'is-active' : ''}"></div>
    </div>
  `;
}

function wireTeamPage() { /* لا يوجد أحداث إضافية حاليًا */ }
