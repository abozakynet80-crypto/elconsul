/* ============================================================
   XERIA — طبقة الوصول للبيانات (Data Access Layer)
   كل عملية قراءة/كتابة تمر من هنا وتُلزم بـ tenantId
   جاهزة للاستبدال لاحقًا بـ Firestore بنفس التوقيعات تقريبًا
   ============================================================ */

const DB_KEYS = {
  tenants: 'xeria_tenants',
  users: 'xeria_users',
  clients: 'xeria_clients',
  requests: 'xeria_requests',
  timelines: 'xeria_timelines',
  currentUser: 'xeria_current_user',
  seeded: 'xeria_seeded_v1'
};

const REQUEST_STATUSES = ['new', 'in_progress', 'review', 'completed', 'delivered'];
const STATUS_LABELS = {
  new: 'جديد',
  in_progress: 'جاري التنفيذ',
  review: 'مراجعة',
  completed: 'مكتمل',
  delivered: 'تم التسليم'
};
const PRIORITY_LABELS = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
const ROLE_LABELS = { admin: 'مدير', employee: 'موظف', reception: 'استقبال' };
const CLIENT_TYPE_LABELS = { individual: 'فرد', company: 'شركة', institution: 'مؤسسة' };

/* ---------- أدوات تخزين عامة ---------- */
function _read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('خطأ في قراءة', key, e);
    return [];
  }
}
function _write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('خطأ في حفظ', key, e);
    return false;
  }
}
function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function nowIso() { return new Date().toISOString(); }

/* ============================================================
   Tenants
   ============================================================ */
function getTenant(tenantId) {
  return _read(DB_KEYS.tenants).find(t => t.id === tenantId) || null;
}

/* ============================================================
   Users (فريق العمل)
   ============================================================ */
function getUsers(tenantId) {
  return _read(DB_KEYS.users).filter(u => u.tenantId === tenantId);
}
function getUserById(tenantId, userId) {
  return getUsers(tenantId).find(u => u.id === userId) || null;
}
function addUser(tenantId, data) {
  const all = _read(DB_KEYS.users);
  const user = Object.assign({ id: uid('user'), tenantId, createdAt: nowIso(), status: 'active' }, data);
  all.push(user);
  _write(DB_KEYS.users, all);
  return user;
}

/* ============================================================
   Clients (العملاء)
   ============================================================ */
function getClients(tenantId) {
  return _read(DB_KEYS.clients).filter(c => c.tenantId === tenantId);
}
function getClientById(tenantId, clientId) {
  return getClients(tenantId).find(c => c.id === clientId) || null;
}
function addClient(tenantId, data) {
  const all = _read(DB_KEYS.clients);
  const client = Object.assign({ id: uid('client'), tenantId, createdAt: nowIso() }, data);
  all.push(client);
  _write(DB_KEYS.clients, all);
  return client;
}
function updateClient(tenantId, clientId, data) {
  const all = _read(DB_KEYS.clients);
  const idx = all.findIndex(c => c.id === clientId && c.tenantId === tenantId);
  if (idx === -1) return null;
  all[idx] = Object.assign({}, all[idx], data);
  _write(DB_KEYS.clients, all);
  return all[idx];
}
function searchClients(tenantId, query) {
  const q = (query || '').trim().toLowerCase();
  const list = getClients(tenantId);
  if (!q) return list;
  return list.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.phone || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q)
  );
}
function clientRequestCount(tenantId, clientId) {
  return getRequests(tenantId).filter(r => r.clientId === clientId).length;
}

/* ============================================================
   Requests (الطلبات)
   ============================================================ */
function getRequests(tenantId) {
  return _read(DB_KEYS.requests).filter(r => r.tenantId === tenantId);
}
function getRequestById(tenantId, requestId) {
  return getRequests(tenantId).find(r => r.id === requestId) || null;
}
function addRequest(tenantId, data) {
  const all = _read(DB_KEYS.requests);
  const seq = all.filter(r => r.tenantId === tenantId).length + 1;
  const request = Object.assign({
    id: uid('request'),
    tenantId,
    code: 'REQ-' + String(seq).padStart(4, '0'),
    status: 'new',
    priority: 'medium',
    notes: [],
    attachments: [],
    createdAt: nowIso()
  }, data);
  all.push(request);
  _write(DB_KEYS.requests, all);
  addTimelineEvent(tenantId, {
    requestId: request.id,
    action: 'تم إنشاء الطلب',
    oldStatus: null,
    newStatus: request.status,
    userId: data.assignedTo || null
  });
  return request;
}
function updateRequest(tenantId, requestId, data) {
  const all = _read(DB_KEYS.requests);
  const idx = all.findIndex(r => r.id === requestId && r.tenantId === tenantId);
  if (idx === -1) return null;
  all[idx] = Object.assign({}, all[idx], data);
  _write(DB_KEYS.requests, all);
  return all[idx];
}
function changeRequestStatus(tenantId, requestId, newStatus, userId) {
  const req = getRequestById(tenantId, requestId);
  if (!req) return null;
  const oldStatus = req.status;
  const updated = updateRequest(tenantId, requestId, { status: newStatus });
  addTimelineEvent(tenantId, {
    requestId,
    action: `تم تغيير الحالة من "${STATUS_LABELS[oldStatus]}" إلى "${STATUS_LABELS[newStatus]}"`,
    oldStatus,
    newStatus,
    userId
  });
  return updated;
}
function assignRequest(tenantId, requestId, userId) {
  const updated = updateRequest(tenantId, requestId, { assignedTo: userId });
  const user = getUserById(tenantId, userId);
  addTimelineEvent(tenantId, {
    requestId,
    action: `تم إسناد الطلب إلى ${user ? user.name : ''}`,
    oldStatus: null,
    newStatus: null,
    userId
  });
  return updated;
}
function addRequestNote(tenantId, requestId, note, userId) {
  const req = getRequestById(tenantId, requestId);
  if (!req) return null;
  const notes = req.notes || [];
  notes.push({ id: uid('note'), text: note, userId, createdAt: nowIso() });
  const updated = updateRequest(tenantId, requestId, { notes });
  addTimelineEvent(tenantId, {
    requestId,
    action: 'تمت إضافة ملاحظة',
    oldStatus: null,
    newStatus: null,
    userId,
    note
  });
  return updated;
}
function addRequestAttachment(tenantId, requestId, fileName) {
  const req = getRequestById(tenantId, requestId);
  if (!req) return null;
  const attachments = req.attachments || [];
  attachments.push({ id: uid('file'), name: fileName, addedAt: nowIso() });
  return updateRequest(tenantId, requestId, { attachments });
}
function searchAndFilterRequests(tenantId, { query, status, priority, assignedTo } = {}) {
  let list = getRequests(tenantId);
  const q = (query || '').trim().toLowerCase();
  if (q) {
    list = list.filter(r => {
      const client = getClientById(tenantId, r.clientId);
      return (
        (r.code || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        (client && (client.name || '').toLowerCase().includes(q))
      );
    });
  }
  if (status) list = list.filter(r => r.status === status);
  if (priority) list = list.filter(r => r.priority === priority);
  if (assignedTo) list = list.filter(r => r.assignedTo === assignedTo);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function isRequestOverdue(request) {
  if (!request.dueDate) return false;
  if (request.status === 'delivered' || request.status === 'completed') return false;
  return new Date(request.dueDate) < new Date();
}

/* ============================================================
   Timeline
   ============================================================ */
function getTimeline(tenantId, requestId) {
  return _read(DB_KEYS.timelines)
    .filter(t => t.tenantId === tenantId && t.requestId === requestId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
function addTimelineEvent(tenantId, data) {
  const all = _read(DB_KEYS.timelines);
  const event = Object.assign({ id: uid('tl'), tenantId, createdAt: nowIso() }, data);
  all.push(event);
  _write(DB_KEYS.timelines, all);
  return event;
}
function getRecentActivity(tenantId, limit = 8) {
  return _read(DB_KEYS.timelines)
    .filter(t => t.tenantId === tenantId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

/* ============================================================
   Auth (تجريبي)
   ============================================================ */
function getCurrentUser() {
  const raw = localStorage.getItem(DB_KEYS.currentUser);
  return raw ? JSON.parse(raw) : null;
}
function setCurrentUser(session) {
  _write(DB_KEYS.currentUser, session);
}
function clearCurrentUser() {
  localStorage.removeItem(DB_KEYS.currentUser);
}
function login(email, password) {
  const tenants = _read(DB_KEYS.tenants);
  const tenant = tenants.find(t => t.demoEmail === email && t.demoPassword === password);
  if (!tenant) return { ok: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
  const adminUser = getUsers(tenant.id).find(u => u.role === 'admin') || getUsers(tenant.id)[0];
  const session = { tenantId: tenant.id, userId: adminUser ? adminUser.id : null, email, loggedInAt: nowIso() };
  setCurrentUser(session);
  return { ok: true, session, tenant };
}
function logout() {
  clearCurrentUser();
}

/* ============================================================
   بيانات الديمو (Seed)
   ============================================================ */
function seedDemoData() {
  if (localStorage.getItem(DB_KEYS.seeded)) return;

  const tenantId = 'tenant_demo_001';
  _write(DB_KEYS.tenants, [{
    id: tenantId,
    name: 'مكتب المستقبل للخدمات',
    demoEmail: 'demo@xeria.test',
    demoPassword: '123456',
    createdAt: nowIso()
  }]);

  const users = [
    { id: uid('user'), tenantId, name: 'محمد', jobTitle: 'مدير المكتب', email: 'mohamed@xeria.test', phone: '01011122233', role: 'admin', status: 'active', createdAt: nowIso() },
    { id: uid('user'), tenantId, name: 'أحمد', jobTitle: 'مسؤول متابعة الطلبات', email: 'ahmed@xeria.test', phone: '01022233344', role: 'employee', status: 'active', createdAt: nowIso() },
    { id: uid('user'), tenantId, name: 'سارة', jobTitle: 'مسؤولة خدمة العملاء', email: 'sara@xeria.test', phone: '01033344455', role: 'employee', status: 'active', createdAt: nowIso() },
    { id: uid('user'), tenantId, name: 'منى', jobTitle: 'موظفة استقبال', email: 'mona@xeria.test', phone: '01044455566', role: 'reception', status: 'active', createdAt: nowIso() }
  ];
  _write(DB_KEYS.users, users);
  const [admin, ahmed, sara] = users;

  const clientsSeed = [
    { name: 'شركة النور', type: 'company', phone: '01000000001', email: 'info@alnoor.example.com', address: 'القاهرة', notes: 'عميل دائم' },
    { name: 'أحمد محمد', type: 'individual', phone: '01000000002', email: 'ahmed.m@example.com', address: 'الجيزة', notes: '' },
    { name: 'مؤسسة المستقبل', type: 'institution', phone: '01000000003', email: 'contact@almustaqbal.example.com', address: 'الإسكندرية', notes: 'يتعامل نيابة عن المؤسسة' },
    { name: 'محمد علي', type: 'individual', phone: '01000000004', email: 'mohamed.ali@example.com', address: 'المنصورة', notes: 'يفضل التواصل عبر البريد الإلكتروني' },
    { name: 'شركة الأمل', type: 'company', phone: '01000000005', email: 'info@alamal.example.com', address: 'طنطا', notes: '' }
  ];
  const clients = clientsSeed.map(c => Object.assign({ id: uid('client'), tenantId, createdAt: nowIso() }, c));
  _write(DB_KEYS.clients, clients);

  const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
  const daysAhead = n => new Date(Date.now() + n * 86400000).toISOString();

  const requestsSeed = [
    { title: 'طلب خدمة جديد', description: 'استقبال طلب خدمة جديد من العميل وتحديد نطاق العمل', clientId: clients[0].id, assignedTo: ahmed.id, status: 'new', priority: 'medium', createdAt: daysAgo(1), dueDate: daysAhead(6) },
    { title: 'مراجعة مستندات', description: 'مراجعة المستندات المقدمة من العميل والتأكد من اكتمالها', clientId: clients[1].id, assignedTo: sara.id, status: 'review', priority: 'high', createdAt: daysAgo(5), dueDate: daysAhead(1) },
    { title: 'إعداد ملف للعميل', description: 'تجهيز ملف كامل بالبيانات والمستندات الخاصة بالعميل', clientId: clients[2].id, assignedTo: ahmed.id, status: 'in_progress', priority: 'urgent', createdAt: daysAgo(2), dueDate: daysAhead(2) },
    { title: 'متابعة طلب', description: 'متابعة حالة الطلب والتأكد من سير العمل حسب الجدول الزمني', clientId: clients[3].id, assignedTo: sara.id, status: 'in_progress', priority: 'medium', createdAt: daysAgo(6), dueDate: daysAgo(1) },
    { title: 'إعداد تقرير', description: 'إعداد تقرير تفصيلي بنتائج الخدمة المقدمة', clientId: clients[3].id, assignedTo: ahmed.id, status: 'completed', priority: 'low', createdAt: daysAgo(9), dueDate: daysAgo(3) },
    { title: 'تسليم مستندات', description: 'تسليم المستندات النهائية للعميل بعد اعتمادها', clientId: clients[4].id, assignedTo: sara.id, status: 'delivered', priority: 'medium', createdAt: daysAgo(14), dueDate: daysAgo(8) },
    { title: 'طلب استشارة', description: 'تقديم استشارة أولية حول الخدمة المطلوبة', clientId: clients[2].id, assignedTo: null, status: 'new', priority: 'low', createdAt: daysAgo(0), dueDate: daysAhead(7) },
    { title: 'مراجعة بيانات العميل', description: 'التأكد من دقة بيانات العميل المسجلة في النظام', clientId: clients[0].id, assignedTo: ahmed.id, status: 'review', priority: 'medium', createdAt: daysAgo(3), dueDate: daysAhead(2) },
    { title: 'تجهيز ملف جديد', description: 'إنشاء ملف جديد لعميل حديث الانضمام', clientId: clients[4].id, assignedTo: ahmed.id, status: 'new', priority: 'high', createdAt: daysAgo(5), dueDate: daysAgo(2) },
    { title: 'تحديث بيانات الطلب', description: 'تحديث تفاصيل الطلب بعد طلب العميل تعديلات إضافية', clientId: clients[1].id, assignedTo: sara.id, status: 'completed', priority: 'low', createdAt: daysAgo(11), dueDate: daysAgo(5) },
    { title: 'متابعة مع العميل', description: 'التواصل مع العميل لمعرفة ملاحظاته على الخدمة المقدمة', clientId: clients[3].id, assignedTo: null, status: 'new', priority: 'low', createdAt: daysAgo(2), dueDate: daysAhead(5) },
    { title: 'إنهاء إجراءات الخدمة', description: 'استكمال الإجراءات النهائية وإغلاق الطلب', clientId: clients[4].id, assignedTo: ahmed.id, status: 'delivered', priority: 'high', createdAt: daysAgo(20), dueDate: daysAgo(12) }
  ];

  const requests = [];
  let seq = 1;
  requestsSeed.forEach(r => {
    const request = Object.assign({
      id: uid('request'),
      tenantId,
      code: 'REQ-' + String(seq++).padStart(4, '0'),
      notes: [],
      attachments: [{ id: uid('file'), name: 'مستند_الطلب.pdf', addedAt: r.createdAt }]
    }, r);
    requests.push(request);
  });
  _write(DB_KEYS.requests, requests);

  const timelines = [];
  requests.forEach(r => {
    timelines.push({ id: uid('tl'), tenantId, requestId: r.id, action: 'تم إنشاء الطلب', oldStatus: null, newStatus: 'new', userId: r.assignedTo, createdAt: r.createdAt });
    if (r.assignedTo) {
      const assignee = users.find(u => u.id === r.assignedTo);
      timelines.push({ id: uid('tl'), tenantId, requestId: r.id, action: `تم إسناد الطلب إلى ${assignee ? assignee.name : ''}`, oldStatus: null, newStatus: null, userId: r.assignedTo, createdAt: r.createdAt });
    }
    if (r.status !== 'new') {
      timelines.push({ id: uid('tl'), tenantId, requestId: r.id, action: `تم تغيير الحالة إلى "${STATUS_LABELS[r.status]}"`, oldStatus: 'new', newStatus: r.status, userId: r.assignedTo, createdAt: r.dueDate });
    }
  });
  _write(DB_KEYS.timelines, timelines);

  localStorage.setItem(DB_KEYS.seeded, '1');
}
