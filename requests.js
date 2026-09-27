/* ============================================================
   XERIA — صفحة الطلبات
   ============================================================ */

const requestsFilterState = { query: '', status: '', priority: '', assignedTo: '' };

function renderRequestsPage() {
  const tenantId = APP_STATE.tenantId;
  const list = searchAndFilterRequests(tenantId, requestsFilterState);
  const users = getUsers(tenantId);

  return `
    <div class="page-head">
      <div>
        <h1>الطلبات</h1>
        <p class="page-sub">${list.length} طلب مطابق</p>
      </div>
      <button class="btn btn--primary" id="addRequestBtn">${icon('plus')}<span>طلب جديد</span></button>
    </div>

    <div class="toolbar toolbar--wrap">
      <label class="search-box">
        ${icon('search')}
        <input type="text" id="reqSearchInput" placeholder="ابحث برقم الطلب، العنوان أو اسم العميل" value="${escapeHtml(requestsFilterState.query)}" />
      </label>
      <select id="reqStatusFilter" class="select">
        <option value="">كل الحالات</option>
        ${REQUEST_STATUSES.map(s => `<option value="${s}" ${requestsFilterState.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
      </select>
      <select id="reqPriorityFilter" class="select">
        <option value="">كل الأولويات</option>
        ${Object.keys(PRIORITY_LABELS).map(p => `<option value="${p}" ${requestsFilterState.priority === p ? 'selected' : ''}>${PRIORITY_LABELS[p]}</option>`).join('')}
      </select>
      <select id="reqAssigneeFilter" class="select">
        <option value="">كل الموظفين</option>
        ${users.map(u => `<option value="${u.id}" ${requestsFilterState.assignedTo === u.id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
      </select>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>رقم الطلب</th><th>العميل</th><th>العنوان</th><th>الموظف</th>
            <th>الحالة</th><th>الأولوية</th><th>الإنشاء</th><th>التسليم</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${list.length ? list.map(requestRowHtml).join('') : `<tr><td colspan="9">${emptyState('لا توجد طلبات مطابقة', 'جرّب تعديل الفلاتر أو أضف طلبًا جديدًا')}</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="mobile-cards">
      ${list.length ? list.map(requestCardHtml).join('') : ''}
    </div>
  `;
}

function requestRowHtml(r) {
  const client = getClientById(APP_STATE.tenantId, r.clientId);
  const assignee = r.assignedTo ? getUserById(APP_STATE.tenantId, r.assignedTo) : null;
  const overdue = isRequestOverdue(r);
  return `
    <tr data-open-request="${r.id}" class="${overdue ? 'row--overdue' : ''}">
      <td class="mono">${r.code}</td>
      <td>${escapeHtml(client ? client.name : '—')}</td>
      <td>${escapeHtml(r.title)}</td>
      <td>${assignee ? escapeHtml(assignee.name) : '<span class="muted-sm">غير مسند</span>'}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${priorityBadge(r.priority)}</td>
      <td>${fmtDate(r.createdAt)}</td>
      <td>${overdue ? `<span class="overdue-tag">متأخر · ${fmtDate(r.dueDate)}</span>` : fmtDate(r.dueDate)}</td>
      <td><button class="icon-btn">${icon('chevron')}</button></td>
    </tr>
  `;
}

function requestCardHtml(r) {
  const client = getClientById(APP_STATE.tenantId, r.clientId);
  const assignee = r.assignedTo ? getUserById(APP_STATE.tenantId, r.assignedTo) : null;
  const overdue = isRequestOverdue(r);
  return `
    <div class="entity-card" data-open-request="${r.id}">
      <div class="entity-card__top">
        <span class="mono">${r.code}</span>
        ${statusBadge(r.status)}
      </div>
      <strong class="entity-card__req-title">${escapeHtml(r.title)}</strong>
      <div class="entity-card__meta">
        <span>${escapeHtml(client ? client.name : '—')}</span>
        <span>${assignee ? escapeHtml(assignee.name) : 'غير مسند'}</span>
      </div>
      <div class="entity-card__foot">
        ${priorityBadge(r.priority)}
        ${overdue ? `<span class="overdue-tag">متأخر</span>` : `<span class="muted-sm">${fmtDate(r.dueDate)}</span>`}
      </div>
    </div>
  `;
}

function wireRequestsPage() {
  const q = document.getElementById('reqSearchInput');
  if (q) q.addEventListener('input', (e) => { requestsFilterState.query = e.target.value; rerenderCurrentPageBody(); });
  const s = document.getElementById('reqStatusFilter');
  if (s) s.addEventListener('change', (e) => { requestsFilterState.status = e.target.value; rerenderCurrentPageBody(); });
  const p = document.getElementById('reqPriorityFilter');
  if (p) p.addEventListener('change', (e) => { requestsFilterState.priority = e.target.value; rerenderCurrentPageBody(); });
  const a = document.getElementById('reqAssigneeFilter');
  if (a) a.addEventListener('change', (e) => { requestsFilterState.assignedTo = e.target.value; rerenderCurrentPageBody(); });
  const addBtn = document.getElementById('addRequestBtn');
  if (addBtn) addBtn.addEventListener('click', () => openRequestForm());
  document.querySelectorAll('[data-open-request]').forEach(el => {
    el.addEventListener('click', () => openRequestDetails(el.getAttribute('data-open-request')));
  });
}

function openRequestForm() {
  const tenantId = APP_STATE.tenantId;
  const clients = getClients(tenantId);
  const users = getUsers(tenantId);
  openModal(`
    <div class="modal-head">
      <h2>طلب جديد</h2>
      <button class="icon-btn" data-close-modal>${icon('close')}</button>
    </div>
    <form id="requestForm" class="form-grid">
      <label class="field field--full"><span>العميل *</span>
        <select id="rf_client" required>
          <option value="">اختر العميل</option>
          ${clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </label>
      <label class="field field--full"><span>عنوان الطلب *</span><input required id="rf_title" placeholder="مثال: طلب خدمة جديد للعميل" /></label>
      <label class="field field--full"><span>وصف الطلب</span><textarea id="rf_desc" rows="2"></textarea></label>
      <label class="field"><span>الموظف المسؤول</span>
        <select id="rf_assignee">
          <option value="">بدون إسناد</option>
          ${users.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>الأولوية</span>
        <select id="rf_priority">
          ${Object.entries(PRIORITY_LABELS).map(([k, v]) => `<option value="${k}" ${k === 'medium' ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>الموعد المتوقع</span><input type="date" id="rf_due" /></label>
      <div class="modal-actions">
        <button type="button" class="btn btn--ghost" data-close-modal>إلغاء</button>
        <button type="submit" class="btn btn--primary">إنشاء الطلب</button>
      </div>
    </form>
  `);
  document.getElementById('requestForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const clientId = document.getElementById('rf_client').value;
    const title = document.getElementById('rf_title').value.trim();
    if (!clientId || !title) { toast('من فضلك أكمل الحقول المطلوبة', 'error'); return; }
    const due = document.getElementById('rf_due').value;
    addRequest(tenantId, {
      clientId,
      title,
      description: document.getElementById('rf_desc').value.trim(),
      assignedTo: document.getElementById('rf_assignee').value || null,
      priority: document.getElementById('rf_priority').value,
      dueDate: due ? new Date(due).toISOString() : null
    });
    toast('تم إنشاء الطلب بنجاح');
    closeModal();
    rerenderCurrentPageBody();
    refreshSidebarBadges();
  });
}

function openRequestDetails(requestId) {
  const tenantId = APP_STATE.tenantId;
  const r = getRequestById(tenantId, requestId);
  if (!r) return;
  const client = getClientById(tenantId, r.clientId);
  const users = getUsers(tenantId);
  const assignee = r.assignedTo ? getUserById(tenantId, r.assignedTo) : null;
  const timeline = getTimeline(tenantId, requestId);

  openModal(`
    <div class="modal-head">
      <h2>${escapeHtml(r.title)} <span class="mono muted-sm">${r.code}</span></h2>
      <button class="icon-btn" data-close-modal>${icon('close')}</button>
    </div>

    <div class="req-detail-tabs">
      <button class="tab-btn is-active" data-tab="info">البيانات</button>
      <button class="tab-btn" data-tab="timeline">Timeline</button>
      <button class="tab-btn" data-tab="notes">الملاحظات</button>
      <button class="tab-btn" data-tab="files">المرفقات</button>
    </div>

    <div class="tab-pane" data-pane="info">
      <div class="detail-grid">
        <div><span>العميل</span><strong>${escapeHtml(client ? client.name : '—')}</strong></div>
        <div><span>الحالة الحالية</span>${statusBadge(r.status)}</div>
        <div><span>الأولوية</span>${priorityBadge(r.priority)}</div>
        <div><span>تاريخ الإنشاء</span><strong>${fmtDate(r.createdAt)}</strong></div>
        <div><span>الموعد المتوقع</span><strong>${fmtDate(r.dueDate)}</strong></div>
        <div><span>الموظف المسؤول</span><strong>${assignee ? escapeHtml(assignee.name) : 'غير مسند'}</strong></div>
      </div>
      ${r.description ? `<p class="detail-notes">${escapeHtml(r.description)}</p>` : ''}

      <div class="req-actions">
        <label class="field field--inline">
          <span>تغيير الحالة</span>
          <select id="statusSelect">
            ${REQUEST_STATUSES.map(s => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
          </select>
        </label>
        <label class="field field--inline">
          <span>إسناد إلى</span>
          <select id="assigneeSelect">
            <option value="">بدون إسناد</option>
            ${users.map(u => `<option value="${u.id}" ${r.assignedTo === u.id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>

    <div class="tab-pane" data-pane="timeline" hidden>
      <div class="timeline">
        ${timeline.length ? timeline.map(timelineEventHtml).join('') : '<p class="muted-sm">لا توجد أحداث بعد</p>'}
      </div>
    </div>

    <div class="tab-pane" data-pane="notes" hidden>
      <div class="notes-list">
        ${(r.notes && r.notes.length) ? r.notes.map(n => `
          <div class="note-item">
            <div class="note-item__head"><strong>${escapeHtml(getUserById(tenantId, n.userId)?.name || 'مستخدم النظام')}</strong><span>${fmtDateTime(n.createdAt)}</span></div>
            <p>${escapeHtml(n.text)}</p>
          </div>`).join('') : '<p class="muted-sm">لا توجد ملاحظات بعد</p>'}
      </div>
      <form id="noteForm" class="note-form">
        <textarea id="noteText" rows="2" placeholder="أضف ملاحظة جديدة..." required></textarea>
        <button type="submit" class="btn btn--primary btn--sm">إضافة الملاحظة</button>
      </form>
    </div>

    <div class="tab-pane" data-pane="files" hidden>
      <div class="files-list">
        ${(r.attachments && r.attachments.length) ? r.attachments.map(f => `
          <div class="file-item">${icon('file')}<span>${escapeHtml(f.name)}</span><span class="muted-sm">${fmtDate(f.addedAt)}</span></div>
        `).join('') : '<p class="muted-sm">لا توجد مرفقات بعد</p>'}
      </div>
      <button class="btn btn--ghost btn--sm" id="addMockAttachment">${icon('plus')}<span>إضافة مرفق (تجريبي)</span></button>
      <p class="muted-sm hint-sm">رفع الملفات الفعلي غير مفعّل في نسخة الديمو.</p>
    </div>
  `);

  wireRequestDetailTabs();

  document.getElementById('statusSelect').addEventListener('change', (e) => {
    changeRequestStatus(tenantId, requestId, e.target.value, getCurrentUser()?.userId);
    toast('تم تحديث حالة الطلب');
    refreshSidebarBadges();
    if (APP_STATE.currentPage === 'requests') rerenderCurrentPageBody();
    if (APP_STATE.currentPage === 'dashboard') rerenderCurrentPageBody();
    openRequestDetails(requestId);
  });
  document.getElementById('assigneeSelect').addEventListener('change', (e) => {
    assignRequest(tenantId, requestId, e.target.value || null);
    toast('تم تحديث إسناد الطلب');
    if (APP_STATE.currentPage === 'requests') rerenderCurrentPageBody();
    openRequestDetails(requestId);
  });
  document.getElementById('noteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = document.getElementById('noteText').value.trim();
    if (!text) return;
    addRequestNote(tenantId, requestId, text, getCurrentUser()?.userId);
    toast('تمت إضافة الملاحظة');
    openRequestDetails(requestId);
  });
  const attachBtn = document.getElementById('addMockAttachment');
  if (attachBtn) attachBtn.addEventListener('click', () => {
    addRequestAttachment(tenantId, requestId, `مرفق_${(r.attachments?.length || 0) + 1}.pdf`);
    toast('تمت إضافة المرفق');
    openRequestDetails(requestId);
  });
}

function timelineEventHtml(ev) {
  const user = ev.userId ? getUserById(APP_STATE.tenantId, ev.userId) : null;
  return `
    <div class="timeline__row">
      <div class="timeline__time">${fmtTime(ev.createdAt)}<span>${fmtDateShort(ev.createdAt)}</span></div>
      <div class="timeline__dot"></div>
      <div class="timeline__body">
        <strong>${escapeHtml(ev.action)}</strong>
        ${user ? `<span class="muted-sm">${escapeHtml(user.name)}</span>` : ''}
        ${ev.note ? `<p>${escapeHtml(ev.note)}</p>` : ''}
      </div>
    </div>
  `;
}

function wireRequestDetailTabs() {
  const tabs = document.querySelectorAll('.req-detail-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const name = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.hidden = pane.getAttribute('data-pane') !== name;
      });
    });
  });
}
