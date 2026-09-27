/* ============================================================
   XERIA — صفحة العملاء
   ============================================================ */

let clientsSearchQuery = '';

function renderClientsPage() {
  const tenantId = APP_STATE.tenantId;
  const list = searchClients(tenantId, clientsSearchQuery);

  return `
    <div class="page-head">
      <div>
        <h1>العملاء</h1>
        <p class="page-sub">${list.length} من أصل ${getClients(tenantId).length} عميل</p>
      </div>
      <button class="btn btn--primary" id="addClientBtn">${icon('plus')}<span>عميل جديد</span></button>
    </div>

    <div class="toolbar">
      <label class="search-box">
        ${icon('search')}
        <input type="text" id="clientSearchInput" placeholder="ابحث بالاسم، الهاتف أو البريد الإلكتروني" value="${escapeHtml(clientsSearchQuery)}" />
      </label>
    </div>

    <div class="card-grid" id="clientsGrid">
      ${list.length ? list.map(clientCardHtml).join('') : emptyState('لا يوجد عملاء مطابقون', 'جرّب كلمة بحث مختلفة أو أضف عميلًا جديدًا')}
    </div>
  `;
}

function clientCardHtml(client) {
  const count = clientRequestCount(APP_STATE.tenantId, client.id);
  return `
    <div class="entity-card" data-client-id="${client.id}">
      <div class="entity-card__top">
        <div class="avatar">${initials(client.name)}</div>
        <div class="entity-card__title">
          <strong>${escapeHtml(client.name)}</strong>
          <span>${escapeHtml(client.phone || '')}</span>
        </div>
        ${client.type ? clientTypeBadge(client.type) : ''}
      </div>
      <div class="entity-card__meta">
        <span>${escapeHtml(client.email || '—')}</span>
        <span>${escapeHtml(client.address || '—')}</span>
      </div>
      <div class="entity-card__foot">
        <span class="chip">${count} طلب</span>
        <button class="btn btn--ghost btn--sm" data-open-client="${client.id}">عرض التفاصيل</button>
      </div>
    </div>
  `;
}

function emptyState(title, sub) {
  return `<div class="empty-state">
    <div class="empty-state__icon">${icon('clients')}</div>
    <strong>${title}</strong>
    <span>${sub}</span>
  </div>`;
}

function wireClientsPage() {
  const searchInput = document.getElementById('clientSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clientsSearchQuery = e.target.value;
      rerenderCurrentPageBody();
    });
  }
  const addBtn = document.getElementById('addClientBtn');
  if (addBtn) addBtn.addEventListener('click', () => openClientForm());

  document.querySelectorAll('[data-open-client]').forEach(btn => {
    btn.addEventListener('click', () => openClientDetails(btn.getAttribute('data-open-client')));
  });
}

function openClientForm(clientId) {
  const tenantId = APP_STATE.tenantId;
  const client = clientId ? getClientById(tenantId, clientId) : null;
  openModal(`
    <div class="modal-head">
      <h2>${client ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h2>
      <button class="icon-btn" data-close-modal>${icon('close')}</button>
    </div>
    <form id="clientForm" class="form-grid">
      <label class="field"><span>الاسم *</span><input required id="cf_name" value="${escapeHtml(client?.name || '')}" /></label>
      <label class="field"><span>نوع العميل</span>
        <select id="cf_type">
          ${Object.entries(CLIENT_TYPE_LABELS).map(([k, v]) => `<option value="${k}" ${client?.type === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>رقم الهاتف *</span><input required id="cf_phone" value="${escapeHtml(client?.phone || '')}" /></label>
      <label class="field"><span>البريد الإلكتروني</span><input type="email" id="cf_email" value="${escapeHtml(client?.email || '')}" /></label>
      <label class="field field--full"><span>العنوان</span><input id="cf_address" value="${escapeHtml(client?.address || '')}" /></label>
      <label class="field field--full"><span>ملاحظات</span><textarea id="cf_notes" rows="2">${escapeHtml(client?.notes || '')}</textarea></label>
      <div class="modal-actions">
        <button type="button" class="btn btn--ghost" data-close-modal>إلغاء</button>
        <button type="submit" class="btn btn--primary">${client ? 'حفظ التعديلات' : 'إضافة العميل'}</button>
      </div>
    </form>
  `);
  document.getElementById('clientForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('cf_name').value.trim(),
      type: document.getElementById('cf_type').value,
      phone: document.getElementById('cf_phone').value.trim(),
      email: document.getElementById('cf_email').value.trim(),
      address: document.getElementById('cf_address').value.trim(),
      notes: document.getElementById('cf_notes').value.trim()
    };
    if (!data.name || !data.phone) { toast('من فضلك أكمل الحقول المطلوبة', 'error'); return; }
    if (client) {
      updateClient(tenantId, client.id, data);
      toast('تم حفظ تعديلات العميل');
    } else {
      addClient(tenantId, data);
      toast('تمت إضافة العميل بنجاح');
    }
    closeModal();
    rerenderCurrentPageBody();
    refreshSidebarBadges();
  });
}

function openClientDetails(clientId) {
  const tenantId = APP_STATE.tenantId;
  const client = getClientById(tenantId, clientId);
  if (!client) return;
  const requests = getRequests(tenantId).filter(r => r.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  openModal(`
    <div class="modal-head">
      <h2>${escapeHtml(client.name)} ${client.type ? clientTypeBadge(client.type) : ''}</h2>
      <button class="icon-btn" data-close-modal>${icon('close')}</button>
    </div>
    <div class="detail-grid">
      <div><span>الهاتف</span><strong>${escapeHtml(client.phone || '—')}</strong></div>
      <div><span>البريد الإلكتروني</span><strong>${escapeHtml(client.email || '—')}</strong></div>
      <div><span>العنوان</span><strong>${escapeHtml(client.address || '—')}</strong></div>
      <div><span>تاريخ الإضافة</span><strong>${fmtDate(client.createdAt)}</strong></div>
    </div>
    ${client.notes ? `<p class="detail-notes">${escapeHtml(client.notes)}</p>` : ''}
    <h3 class="modal-subhead">طلبات العميل (${requests.length})</h3>
    <div class="mini-list">
      ${requests.length ? requests.map(r => `
        <div class="mini-list__row" data-goto-request="${r.id}">
          <span class="mono">${r.code}</span>
          <span>${escapeHtml(r.title)}</span>
          ${statusBadge(r.status)}
        </div>`).join('') : '<p class="muted-sm">لا توجد طلبات بعد</p>'}
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn--ghost" data-close-modal>إغلاق</button>
      <button type="button" class="btn btn--primary" id="editClientFromDetails">تعديل البيانات</button>
    </div>
  `);
  document.getElementById('editClientFromDetails').addEventListener('click', () => openClientForm(clientId));
  document.querySelectorAll('[data-goto-request]').forEach(row => {
    row.addEventListener('click', () => {
      closeModal();
      navigateTo('requests');
      setTimeout(() => openRequestDetails(row.getAttribute('data-goto-request')), 50);
    });
  });
}
