/* ==============================================================================
   FivPay - Master Application Controller
   Connects to Flask Backend API with Sandbox Fallback, SVG Icons, and RBAC
   ============================================================================== */

class FivPayMasterApp {
  constructor() {
    this.currentView = 'user-dashboard';
    this.isBalanceHidden = false;
    this.currentCurrency = 'USD';
    this.exchangeRates = { USD: 1.0, EUR: 0.92, GBP: 0.79 };
    this.init();
  }

  async init() {
    this.initTheme();
    await this.checkApiHealth();
    await this.syncAuthSession();
    this.bindEvents();
    await this.renderCurrentView();

    // Staggered charts initialization
    setTimeout(() => {
      if (window.fivpayCharts) window.fivpayCharts.refreshAll();
    }, 200);
  }

  /* ----------------------------------------------------------------------------
     1. Connectivity & Health Check
     ---------------------------------------------------------------------------- */
  async checkApiHealth() {
    const healthBadge = document.getElementById('api-health-badge');
    const res = await window.fivpayApi.checkHealth();

    if (healthBadge) {
      if (res.success) {
        healthBadge.className = 'api-status-badge online';
        healthBadge.innerHTML = `<span class="badge-dot"></span> Backend API Connected (:5000)`;
      } else {
        healthBadge.className = 'api-status-badge offline';
        healthBadge.innerHTML = `<span class="badge-dot"></span> Offline Sandbox Mode`;
      }
    }
  }

  /* ----------------------------------------------------------------------------
     2. Auth & Session Synchronization
     ---------------------------------------------------------------------------- */
  async syncAuthSession() {
    let session = window.authManager.getSession();

    // Attempt profile fetch from backend if token present
    if (window.fivpayApi.getToken()) {
      const profileRes = await window.fivpayApi.getProfile();
      if (profileRes.success && profileRes.data.user) {
        const u = profileRes.data.user;
        const acc = profileRes.data.account;
        session = {
          isLoggedIn: true,
          role: u.role,
          email: u.email,
          name: u.name,
          accountNumber: acc ? acc.account_number : 'FP-8829-4102-99',
          balance: acc ? acc.balance : 24850.75
        };
        window.authManager.saveSession(session);
      }
    }

    this.updateUserContext(session);
  }

  updateUserContext(session) {
    const role = session ? session.role : 'user';
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    if (nameEl) nameEl.textContent = session.name;
    if (roleEl) roleEl.textContent = role.toUpperCase();
    if (avatarEl) avatarEl.textContent = session.name.split(' ').map(n => n[0]).join('').substring(0, 2);

    // Update floating sandbox HUD pills
    document.querySelectorAll('.hud-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.role === role);
    });

    // Update breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) {
      breadcrumb.textContent = role === 'admin' ? 'Admin Platform Console' : role === 'staff' ? 'Staff Corporate Workspace' : 'Personal Financial Space';
    }
  }

  async switchRole(newRole) {
    window.authManager.switchRole(newRole);
    // Also attempt login to backend demo account
    let email = 'alex.mercer@fivpay.com';
    if (newRole === 'staff') email = 'sarah.compliance@fivpay.com';
    if (newRole === 'admin') email = 'marcus.admin@fivpay.com';

    await window.fivpayApi.login(email, 'demo1234');
    await this.syncAuthSession();

    if (newRole === 'staff') {
      this.switchView('staff-workspace');
    } else if (newRole === 'admin') {
      this.switchView('admin-dashboard');
    } else {
      this.switchView('user-dashboard');
    }

    this.showToast(`Switched active workspace persona to: ${newRole.toUpperCase()}`, 'info');
  }

  /* ----------------------------------------------------------------------------
     3. Workspace Navigation
     ---------------------------------------------------------------------------- */
  async switchView(viewName) {
    this.currentView = viewName;

    // Update navigation links
    document.querySelectorAll('.nav-item').forEach(link => {
      link.classList.toggle('active', link.dataset.view === viewName);
    });

    // Update visible view containers
    document.querySelectorAll('.workspace-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) targetSection.classList.add('active');

    // Close mobile drawer if open
    document.querySelector('.sidebar')?.classList.remove('open');

    await this.renderCurrentView();

    if (viewName === 'analytics' || viewName === 'user-dashboard') {
      setTimeout(() => {
        if (window.fivpayCharts) window.fivpayCharts.refreshAll();
      }, 100);
    }
  }

  async renderCurrentView() {
    if (this.currentView === 'user-dashboard') await this.renderUserDashboard();
    if (this.currentView === 'staff-workspace') await this.renderStaffWorkspace();
    if (this.currentView === 'admin-dashboard') await this.renderAdminDashboard();
    if (this.currentView === 'transactions-budgets') {
      await this.renderTransactionsLedger();
      await this.renderBudgetsList();
    }
    if (this.currentView === 'settings') this.renderSettingsView();
  }

  /* ----------------------------------------------------------------------------
     4. View Renderers
     ---------------------------------------------------------------------------- */

  /**
   * User Dashboard
   */
  async renderUserDashboard() {
    const session = window.authManager.getSession();
    const balanceEl = document.getElementById('user-balance-amount');

    let balanceVal = session.balance || 24850.75;
    let currencySymbol = '$';

    if (this.currentCurrency === 'EUR') {
      balanceVal = balanceVal * this.exchangeRates.EUR;
      currencySymbol = '€';
    } else if (this.currentCurrency === 'GBP') {
      balanceVal = balanceVal * this.exchangeRates.GBP;
      currencySymbol = '£';
    }

    if (balanceEl) {
      if (this.isBalanceHidden) {
        balanceEl.textContent = '••••••••';
      } else {
        balanceEl.textContent = `${currencySymbol}${balanceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    // Render Virtual Cards
    const cardsContainer = document.getElementById('virtual-cards-container');
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="virtual-card-box">
          <div class="flex justify-between items-center">
            <svg class="card-chip-svg" viewBox="0 0 50 35" fill="none">
              <rect width="50" height="35" rx="5" fill="#D97706"/>
              <path d="M0 12h50M0 23h50M17 0v35M33 0v35" stroke="#FDE68A" stroke-width="1.5"/>
            </svg>
            <span style="font-weight: 800; font-size: 1.1rem; letter-spacing: 1px;">VISA</span>
          </div>
          <div class="card-pan-number">
            <span>4532 •••• •••• 8821</span>
            <button class="btn btn-ghost btn-sm" style="color:#fff; padding:2px;" onclick="navigator.clipboard.writeText('4532 8920 1192 8821'); window.app.showToast('Copied card number', 'success');">
              ${window.getSvg('copy')}
            </button>
          </div>
          <div class="card-details-row">
            <div>
              <div class="card-meta-label">Cardholder</div>
              <div class="card-meta-value">${session.name}</div>
            </div>
            <div>
              <div class="card-meta-label">Expires</div>
              <div class="card-meta-value">09/28</div>
            </div>
          </div>
        </div>

        <div class="virtual-card-box emerald">
          <div class="flex justify-between items-center">
            <svg class="card-chip-svg" viewBox="0 0 50 35" fill="none">
              <rect width="50" height="35" rx="5" fill="#D97706"/>
              <path d="M0 12h50M0 23h50M17 0v35M33 0v35" stroke="#FDE68A" stroke-width="1.5"/>
            </svg>
            <span style="font-weight: 800; font-size: 1.1rem; letter-spacing: 1px;">MASTERCARD</span>
          </div>
          <div class="card-pan-number">
            <span>5412 •••• •••• 3042</span>
            <button class="btn btn-ghost btn-sm" style="color:#fff; padding:2px;" onclick="navigator.clipboard.writeText('5412 7701 4429 3042'); window.app.showToast('Copied card number', 'success');">
              ${window.getSvg('copy')}
            </button>
          </div>
          <div class="card-details-row">
            <div>
              <div class="card-meta-label">Corporate Card</div>
              <div class="card-meta-value">FivPay Treasury</div>
            </div>
            <div>
              <div class="card-meta-label">Expires</div>
              <div class="card-meta-value">12/29</div>
            </div>
          </div>
        </div>
      `;
    }

    // Render Recent Transactions (from API or local fallback)
    const recentTable = document.getElementById('recent-transactions-list');
    if (recentTable) {
      let txs = [];
      const res = await window.fivpayApi.listTransactions({ limit: 5 });
      if (res.success && res.data.transactions) {
        txs = res.data.transactions;
      } else {
        txs = window.fivpayStore.getTransactions().slice(0, 5);
      }

      recentTable.innerHTML = txs.map(tx => `
        <tr>
          <td>
            <div class="flex items-center gap-3">
              <div class="stat-icon-wrapper ${tx.type === 'in' ? 'emerald' : 'blue'}" style="width:32px; height:32px;">
                ${window.getSvg(tx.type === 'in' ? 'receive' : 'send', 'sm')}
              </div>
              <div>
                <div class="font-semibold text-primary">${tx.note || tx.title || 'Settlement Transfer'}</div>
                <div class="text-muted" style="font-size:0.75rem;">${tx.reference} • ${tx.created_at || tx.date}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-neutral">${tx.category}</span></td>
          <td class="tabular-nums font-bold ${tx.type === 'in' ? 'text-success' : 'text-primary'}">
            ${tx.type === 'in' ? '+' : '-'}$${parseFloat(tx.amount).toFixed(2)}
          </td>
          <td>
            <span class="badge ${tx.status === 'completed' ? 'badge-emerald' : tx.status === 'flagged' ? 'badge-crimson' : 'badge-amber'}">
              <span class="badge-dot"></span> ${tx.status}
            </span>
          </td>
        </tr>
      `).join('');
    }
  }

  /**
   * Staff Expense Workspace
   */
  async renderStaffWorkspace() {
    const listBody = document.getElementById('staff-expenses-table-body');
    if (!listBody) return;

    let expenses = [];
    const res = await window.fivpayApi.listExpenses();
    if (res.success && res.data.expenses) {
      expenses = res.data.expenses;
    } else {
      // Local fallback
      expenses = [
        { id: 1, amount: 340.50, category: 'Software Subscription', description: 'Datadog Cloud APM License', expense_date: '2026-10-16', receipt_filename: 'datadog.pdf', status: 'pending' },
        { id: 2, amount: 185.00, category: 'Client Relations', description: 'Working lunch with European liquidity partners', expense_date: '2026-10-15', receipt_filename: 'bistro_lunch.pdf', status: 'approved' }
      ];
    }

    listBody.innerHTML = expenses.map(e => `
      <tr>
        <td class="tabular-nums font-bold">#${e.id}</td>
        <td>
          <div class="font-semibold">${e.category}</div>
          <div class="text-muted" style="font-size:0.75rem;">${e.description}</div>
        </td>
        <td class="tabular-nums font-bold text-primary">$${parseFloat(e.amount).toFixed(2)}</td>
        <td class="text-muted" style="font-size:0.8rem;">${e.expense_date}</td>
        <td>
          <a href="#" class="btn btn-ghost btn-sm" onclick="alert('Viewing attached receipt: ' + '${e.receipt_filename}')">
            ${window.getSvg('receipt', 'sm')} Receipt
          </a>
        </td>
        <td>
          <span class="badge ${e.status === 'approved' ? 'badge-emerald' : e.status === 'rejected' ? 'badge-crimson' : 'badge-amber'}">
            <span class="badge-dot"></span> ${e.status}
          </span>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Admin Platform Console
   */
  async renderAdminDashboard() {
    // 1. Metrics
    const metricsRes = await window.fivpayApi.getAdminMetrics();
    if (metricsRes.success && metricsRes.data.metrics) {
      const m = metricsRes.data.metrics;
      document.getElementById('admin-stat-volume')?.setAttribute('data-val', `$${m.total_volume_usd.toLocaleString()}`);
      if (document.getElementById('admin-stat-volume')) document.getElementById('admin-stat-volume').textContent = `$${m.total_volume_usd.toLocaleString()}`;
      if (document.getElementById('admin-stat-users')) document.getElementById('admin-stat-users').textContent = m.total_users;
      if (document.getElementById('admin-stat-reserve')) document.getElementById('admin-stat-reserve').textContent = `$${m.total_reserve_usd.toLocaleString()}`;
      if (document.getElementById('admin-stat-pending')) document.getElementById('admin-stat-pending').textContent = m.pending_expenses;
    }

    // 2. Users Table
    const userTableBody = document.getElementById('admin-users-table');
    if (userTableBody) {
      let users = [];
      const res = await window.fivpayApi.listAdminUsers();
      if (res.success && res.data.users) {
        users = res.data.users;
      } else {
        users = window.fivpayStore.getAdminUsers();
      }

      userTableBody.innerHTML = users.map(u => `
        <tr>
          <td>
            <div class="font-semibold">${u.name}</div>
            <div class="text-muted" style="font-size:0.75rem;">${u.email}</div>
          </td>
          <td><span class="badge badge-blue">${u.role}</span></td>
          <td class="tabular-nums font-bold">$${parseFloat(u.balance || 0).toLocaleString()}</td>
          <td>
            <span class="badge ${u.status === 'active' ? 'badge-emerald' : 'badge-crimson'}">
              <span class="badge-dot"></span> ${u.status}
            </span>
          </td>
          <td>
            <div class="flex gap-1">
              <button class="btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-secondary'}" onclick="window.app.handleAdminToggleStatus(${u.id}, '${u.status}')">
                ${u.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // 3. Admin Expense Approval Queue
    const approvalQueueBody = document.getElementById('admin-expense-queue-body');
    if (approvalQueueBody) {
      const expRes = await window.fivpayApi.listExpenses('pending');
      const pendingExpenses = (expRes.success && expRes.data.expenses) ? expRes.data.expenses : [];

      if (pendingExpenses.length === 0) {
        approvalQueueBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">✓ No pending staff expense approvals in queue.</td></tr>`;
      } else {
        approvalQueueBody.innerHTML = pendingExpenses.map(e => `
          <tr>
            <td class="tabular-nums font-bold">#${e.id}</td>
            <td>${e.staff_name || 'Staff Member'}</td>
            <td>${e.category}</td>
            <td class="tabular-nums font-bold text-primary">$${parseFloat(e.amount).toFixed(2)}</td>
            <td>${e.description}</td>
            <td>
              <div class="flex gap-1">
                <button class="btn btn-sm btn-primary" onclick="window.app.handleExpenseApproval(${e.id}, 'approved')">Approve</button>
                <button class="btn btn-sm btn-danger" onclick="window.app.handleExpenseApproval(${e.id}, 'rejected')">Reject</button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    // 4. Audit Log Table
    const auditLogsBody = document.getElementById('admin-audit-logs-body');
    if (auditLogsBody) {
      const logsRes = await window.fivpayApi.getAuditLogs();
      const logs = (logsRes.success && logsRes.data.audit_logs) ? logsRes.data.audit_logs : [];
      auditLogsBody.innerHTML = logs.slice(0, 8).map(l => `
        <tr>
          <td class="text-muted" style="font-size:0.75rem;">${l.created_at}</td>
          <td><span class="badge badge-neutral">${l.action}</span></td>
          <td>${l.resource_type} #${l.resource_id || '-'}</td>
          <td class="tabular-nums text-muted" style="font-size:0.75rem;">${l.ip_address || '127.0.0.1'}</td>
        </tr>
      `).join('');
    }
  }

  async handleAdminToggleStatus(userId, currentStatus) {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const res = await window.fivpayApi.toggleUserStatus(userId, nextStatus);
    if (res.success) {
      this.showToast(`User status updated to ${nextStatus}`, 'success');
      await this.renderAdminDashboard();
    } else {
      this.showToast(res.error || 'Failed to update user status', 'danger');
    }
  }

  async handleExpenseApproval(expenseId, action) {
    const notes = prompt(`Enter administrative note for marking expense #${expenseId} as ${action}:`, `Verified by compliance`);
    if (notes === null) return; // user cancelled

    const res = await window.fivpayApi.reviewExpense(expenseId, action, notes);
    if (res.success) {
      this.showToast(`Expense #${expenseId} marked as ${action.toUpperCase()}`, action === 'approved' ? 'success' : 'warning');
      await this.renderAdminDashboard();
    } else {
      this.showToast(res.error || 'Action failed', 'danger');
    }
  }

  /**
   * Transactions Ledger
   */
  async renderTransactionsLedger() {
    const tbody = document.getElementById('full-transactions-table-body');
    if (!tbody) return;

    const search = document.getElementById('tx-search-input')?.value || '';
    const category = document.getElementById('tx-category-filter')?.value || 'all';

    let txs = [];
    const res = await window.fivpayApi.listTransactions({ search, category: category !== 'all' ? category : '' });
    if (res.success && res.data.transactions) {
      txs = res.data.transactions;
    } else {
      txs = window.fivpayStore.getTransactions();
    }

    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No transactions match your search filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = txs.map(t => `
      <tr>
        <td>
          <div class="flex items-center gap-3">
            <div class="stat-icon-wrapper ${t.type === 'in' ? 'emerald' : 'blue'}" style="width:30px; height:30px;">
              ${window.getSvg(t.type === 'in' ? 'receive' : 'send', 'sm')}
            </div>
            <div>
              <div class="font-semibold">${t.note || t.title || 'Transfer'}</div>
              <div class="text-muted" style="font-size:0.75rem;">Ref: ${t.reference}</div>
            </div>
          </div>
        </td>
        <td>${t.receiver_name || t.recipient || 'FivPay Account'}</td>
        <td><span class="badge badge-neutral">${t.category}</span></td>
        <td class="text-muted" style="font-size:0.8rem;">${t.created_at || t.date}</td>
        <td class="tabular-nums font-bold ${t.type === 'in' ? 'text-success' : 'text-primary'}">
          ${t.type === 'in' ? '+' : '-'}$${parseFloat(t.amount).toFixed(2)}
        </td>
        <td>
          <span class="badge ${t.status === 'completed' ? 'badge-emerald' : 'badge-amber'}">
            <span class="badge-dot"></span> ${t.status}
          </span>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Budgets List
   */
  async renderBudgetsList() {
    const container = document.getElementById('budgets-grid-container');
    if (!container) return;

    let budgets = [];
    const res = await window.fivpayApi.listBudgets();
    if (res.success && res.data.budgets && res.data.budgets.length > 0) {
      budgets = res.data.budgets;
    } else {
      budgets = window.fivpayStore.getBudgets();
    }

    container.innerHTML = budgets.map(b => {
      const allocated = parseFloat(b.allocated_amount || b.allocated);
      const spent = parseFloat(b.spent_amount || b.spent || 0);
      const percent = Math.min(Math.round((spent / allocated) * 100), 100);
      const isNearLimit = percent >= 85;

      return `
        <div class="card stat-card">
          <div class="flex justify-between items-center">
            <div>
              <h4 style="font-size:0.95rem; font-weight:700;">${b.category}</h4>
              <p class="tabular-nums text-muted" style="font-size:0.8rem;">$${spent.toLocaleString()} of $${allocated.toLocaleString()} spent</p>
            </div>
            <span class="badge ${isNearLimit ? 'badge-amber' : 'badge-emerald'}">${percent}%</span>
          </div>

          <div class="progress-track">
            <div class="progress-fill ${isNearLimit ? 'amber' : ''}" style="width: ${percent}%; background-color: ${b.color_hex || b.color};"></div>
          </div>

          <div class="flex justify-between text-muted" style="font-size:0.75rem;">
            <span>Remaining: $${(allocated - spent).toFixed(2)}</span>
            <span>${isNearLimit ? 'Alert: Near Limit' : 'On track'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Settings / Security View
   */
  renderSettingsView() {
    const session = window.authManager.getSession();
    const nameInput = document.getElementById('settings-name');
    const emailInput = document.getElementById('settings-email');
    const roleInput = document.getElementById('settings-role');
    const accInput = document.getElementById('settings-acc');

    if (nameInput) nameInput.value = session.name;
    if (emailInput) emailInput.value = session.email;
    if (roleInput) roleInput.value = session.role.toUpperCase();
    if (accInput) accInput.value = session.accountNumber || 'FP-8829-4102-99';
  }

  /* ----------------------------------------------------------------------------
     5. Theme Management
     ---------------------------------------------------------------------------- */
  initTheme() {
    const saved = localStorage.getItem('fivpay_theme') || 'dark';
    this.setTheme(saved);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fivpay_theme', theme);
    const themeIcon = document.getElementById('theme-toggle-icon-wrap');
    if (themeIcon) {
      themeIcon.innerHTML = window.getSvg(theme === 'light' ? 'moon' : 'sun');
    }
    if (window.fivpayCharts) window.fivpayCharts.refreshAll();
  }

  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    this.showToast(`Switched to ${next} theme`, 'info');
  }

  /* ----------------------------------------------------------------------------
     6. Modal Management & Toast Engine
     ---------------------------------------------------------------------------- */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';

      if (modalId === 'modal-request-qr') {
        const qrCanvas = document.getElementById('request-qr-canvas');
        const amt = document.getElementById('request-amount')?.value || '50.00';
        const note = document.getElementById('request-note')?.value || 'FivPay Transfer';
        window.qrEngine.renderQR(qrCanvas, `fivpay://pay?to=alex.mercer@fivpay.com&amount=${amt}&note=${encodeURIComponent(note)}`, { size: 210 });
      }
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    if (modalId === 'modal-qr-scanner') {
      const videoEl = document.getElementById('scanner-video');
      window.qrEngine.stopScanner(videoEl);
    }
  }

  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconType = type === 'success' ? 'check' : type === 'danger' ? 'alert' : 'info';
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${window.getSvg(iconType)}</div>
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ----------------------------------------------------------------------------
     7. Event Bindings
     ---------------------------------------------------------------------------- */
  bindEvents() {
    // Theme toggle
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => this.toggleTheme());

    // Navigation links
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const v = btn.dataset.view;
        if (v) this.switchView(v);
      });
    });

    // Floating Sandbox HUD pills
    document.querySelectorAll('.hud-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.switchRole(pill.dataset.role);
      });
    });

    // Balance hide/show
    document.getElementById('btn-toggle-balance')?.addEventListener('click', () => {
      this.isBalanceHidden = !this.isBalanceHidden;
      this.renderUserDashboard();
    });

    // Currency selector
    document.getElementById('currency-selector-btn')?.addEventListener('change', (e) => {
      this.currentCurrency = e.target.value;
      this.renderUserDashboard();
      this.showToast(`Active currency view set to ${this.currentCurrency}`, 'info');
    });

    // Send Money Form Submit
    const sendForm = document.getElementById('form-send-money');
    if (sendForm) {
      sendForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const recipient = document.getElementById('payment-recipient').value;
        const amount = document.getElementById('payment-amount').value;
        const note = document.getElementById('payment-note').value;
        const category = document.getElementById('payment-category').value;

        window.paymentsEngine.initiatePayment({ recipient, amount, note, category });
      });
    }

    // Confirm Payment
    document.getElementById('btn-confirm-transfer')?.addEventListener('click', () => {
      window.paymentsEngine.executePayment();
    });

    // Staff Submit Expense Form
    const expForm = document.getElementById('form-submit-expense');
    if (expForm) {
      expForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('expense-amount').value;
        const category = document.getElementById('expense-category').value;
        const description = document.getElementById('expense-desc').value;
        const date = document.getElementById('expense-date').value;

        const res = await window.fivpayApi.submitExpense(amount, category, description, date, 'receipt_upload.pdf');
        if (res.success) {
          this.showToast('Expense submitted for administrative review', 'success');
          this.closeModal('modal-submit-expense');
          expForm.reset();
          await this.renderStaffWorkspace();
        } else {
          this.showToast(res.error || 'Failed to submit expense', 'danger');
        }
      });
    }

    // Modal Close Triggers
    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', () => {
        const modalId = el.closest('.modal-overlay')?.id;
        if (modalId) this.closeModal(modalId);
      });
    });

    // Scanner
    document.getElementById('btn-action-scan')?.addEventListener('click', async () => {
      this.openModal('modal-qr-scanner');
      const videoEl = document.getElementById('scanner-video');
      await window.qrEngine.startScanner(videoEl);
    });

    // Simulate QR Scan
    document.getElementById('btn-simulate-qr-scan')?.addEventListener('click', () => {
      const demo = window.qrEngine.getRandomDemoPayload();
      this.closeModal('modal-qr-scanner');
      this.showToast(`Scanned payment request for ${demo.to}!`, 'success');

      this.openModal('modal-send-money');
      document.getElementById('payment-recipient').value = demo.email || demo.to;
      document.getElementById('payment-amount').value = demo.amount;
      document.getElementById('payment-note').value = demo.note;
    });

    // Decode pasted UPI QR
    document.getElementById('btn-decode-manual-qr')?.addEventListener('click', async () => {
      const raw = document.getElementById('manual-qr-input')?.value;
      if (!raw) {
        this.showToast('Please paste a QR payload or UPI URI', 'warning');
        return;
      }
      const res = await window.fivpayApi.decodeQR(raw);
      if (res.success && res.data.valid) {
        this.closeModal('modal-qr-scanner');
        this.showToast(`Decoded ${res.data.is_upi ? 'UPI Payee' : 'FivPay Account'}: ${res.data.payee_name}`, 'success');
        this.openModal('modal-send-money');
        document.getElementById('payment-recipient').value = res.data.recipient_account;
        if (res.data.amount) document.getElementById('payment-amount').value = res.data.amount;
        if (res.data.note) document.getElementById('payment-note').value = res.data.note;
      } else {
        this.showToast(res.error || 'Invalid QR code payload format', 'danger');
      }
    });

    // Filter transactions
    document.getElementById('tx-search-input')?.addEventListener('input', () => this.renderTransactionsLedger());
    document.getElementById('tx-category-filter')?.addEventListener('change', () => this.renderTransactionsLedger());

    // Export CSV
    document.getElementById('btn-export-tx')?.addEventListener('click', () => {
      this.exportTransactionsCSV();
    });
  }

  exportTransactionsCSV() {
    const txs = window.fivpayStore.getTransactions();
    let csv = 'Reference,Title,Recipient,Category,Date,Type,Amount,Currency,Status\n';
    txs.forEach(t => {
      csv += `"${t.reference}","${t.title || t.note}","${t.recipient || ''}","${t.category}","${t.date || t.created_at}","${t.type}","${t.amount}","USD","${t.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FivPay_Ledger_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    this.showToast('Ledger CSV report downloaded', 'success');
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FivPayMasterApp();
});
