/* ============================================================
   XERIA — المصادقة التجريبية
   ============================================================ */

function renderLoginScreen() {
  document.getElementById('app').style.display = 'none';
  const screen = document.getElementById('loginScreen');
  screen.style.display = 'flex';
  screen.innerHTML = `
    <div class="login-card">
      <div class="login-brand">
        <div class="login-logo">${brandMark()}</div>
        <div class="login-name">XERIA <span>| إكسيريا</span></div>
        <p class="login-tagline">نظّم شغلك في مكان واحد</p>
      </div>
      <form id="loginForm" class="login-form" novalidate>
        <label class="field">
          <span>البريد الإلكتروني</span>
          <input type="email" id="loginEmail" placeholder="demo@xeria.test" value="demo@xeria.test" required />
        </label>
        <label class="field">
          <span>كلمة المرور</span>
          <input type="password" id="loginPassword" placeholder="••••••••" value="123456" required />
        </label>
        <div id="loginError" class="login-error" hidden></div>
        <button type="submit" class="btn btn--primary btn--block">تسجيل الدخول</button>
        <button type="button" class="btn-link" id="forgotBtn">نسيت كلمة المرور؟</button>
      </form>
      <div class="login-demo-hint">
        <span>حساب تجريبي:</span>
        <code>demo@xeria.test</code> / <code>123456</code>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const result = login(email, password);
    const errBox = document.getElementById('loginError');
    if (!result.ok) {
      errBox.textContent = result.message;
      errBox.hidden = false;
      return;
    }
    errBox.hidden = true;
    bootApp();
  });

  document.getElementById('forgotBtn').addEventListener('click', () => {
    toast('لإعادة تعيين كلمة المرور، يرجى التواصل مع مدير النظام', 'info');
  });
}

function brandMark() {
  return `<svg viewBox="0 0 40 40" width="40" height="40" fill="none">
    <rect x="2" y="2" width="36" height="36" rx="11" fill="var(--navy-900)"/>
    <path d="M12 13.5 20 20l8-6.5M12 26.5 20 20l8 6.5" stroke="var(--cyan-500)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function doLogout() {
  logout();
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  renderLoginScreen();
}
