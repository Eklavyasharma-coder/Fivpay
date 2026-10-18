/* ==========================================================================
   FivPay - Main Application Controller
   Navigation, Dynamic View Renderers, Theme Toggle, Modals & Event Listeners
   ========================================================================== */

class FivPayApp {
  constructor() {
    this.currentView = 'user-dashboard';
    this.isBalanceHidden = false;
    this.init();
  }

  init() {
    this.initTheme();
    this.initAuthRole();
    this.bindEvents();
    this.renderAllViews();

    // Initial chart render with small delay to allow CSS layout computation
    setTimeout(() => {
      if (window.fivpayCharts) {
        window.fivpayCharts.refreshAll();
      }
    }, 150);
  }

  /* ------------------------------------------------------------------------
     Theme Management
     ------------------------------------------------------------------------ */
  initTheme() {
    const savedTheme = localStorage.getItem('fivpay_theme') || 'dark';
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fivpay_theme', theme);

    const themeIcon = document.getElementById('theme-toggle-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }

    if (window.fivpayCharts) {
      window.fivpayCharts.refreshAll();
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    this.showToast(`Switched to ${next} mode`, 'info');
  }

  /* ------------------------------------------------------------------------
     Auth & Role Synchronization
     ------------------------------------------------------------------------ */
  initAuthRole() {
    const session = window.authManager.getSession();
    const currentRole = session ? session.role : 'user';

    this.updateRoleUI(currentRole);
  }

  updateRoleUI(role) {
    // Update role pills in header
    document.querySelectorAll('.role-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.role === role);
    });

    // Update user profile summary in sidebar
    const nameEl = document.getElementById('sidebar-user-name');
    const roleLabelEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    if (role === 'user') {
      const u = window.fivpayStore.getUser();
      if (nameEl) nameEl.textContent = u.name;
      if (roleLabelEl) roleLabelEl.textContent = u.tier;
      if (avatarEl) avatarEl.textContent = u.avatar;
    } else if (role === 'staff') {
      const s = window.fivpayStore.data.staffUser;
      if (nameEl) nameEl.textContent = s.name;
      if (roleLabelEl) roleLabelEl.textContent = 'Staff: ' + s.department;
      if (avatarEl) avatarEl.textContent = s.avatar;
    } else if (role === 'admin') {
      const a = window.fivpayStore.data.adminUser;
      if (nameEl) nameEl.textContent = a.name;
      if (roleLabelEl) roleLabelEl.textContent = a.securityLevel;
      if (avatarEl) avatarEl.textContent = a.avatar;
    }

    // Role-dependent view routing
    if (role === 'staff') {
      this.switchView('staff-workspace');
    } else if (role === 'admin') {
      this.switchView('admin-dashboard');
    } else {
      this.switchView('user-dashboard');
    }
  }

  onRoleChange(newRole) {
    window.authManager.switchRole(newRole);
    this.updateRoleUI(newRole);
    this.renderAllViews();
    this.showToast(`Switched active workspace to: ${newRole.toUpperCase()}`, 'info');
  }

  /* ------------------------------------------------------------------------
     View Navigation
     ------------------------------------------------------------------------ */
  switchView(viewName) {
    this.currentView = viewName;

    // Update Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === viewName);
    });

    // Toggle view containers
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Close mobile sidebar if open
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Trigger charts if entering analytics or user dashboard
    if (viewName === 'analytics' || viewName === 'user-dashboard') {
      setTimeout(() => {
        if (window.fivpayCharts) window.fivpayCharts.refreshAll();
      }, 100);
    }
  }

  /* ------------------------------------------------------------------------
     Rendering Views
     ------------------------------------------------------------------------ */
  renderAllViews() {
    this.renderUserDashboard();
    this.renderStaffWorkspace();
    this.renderAdminDashboard();
    this.renderTransactionsTable();
    this.renderBudgetsView();
  }

  /**
   * 1. Render User Dashboard (Balance, Cards, Quick Stats, Recent Activity)
   */
  renderUserDashboard() {
    const user = window.fivpayStore.getUser();
    const balanceNumberEl = document.getElementById('user-balance-amount');

    if (balanceNumberEl) {
      if (this.isBalanceHidden) {
        balanceNumberEl.textContent = '••••••••';
      } else {
        const activeCurr = user.activeCurrency || 'USD';
        const val = user.balances[activeCurr] || 0;
        const symbol = activeCurr === 'EUR' ? '€' : activeCurr === 'GBP' ? '£' : '$';
        balanceNumberEl.textContent = `${symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    // Render Virtual Cards
    const cardsContainer = document.getElementById('virtual-cards-container');
    if (cardsContainer) {
      cardsContainer.innerHTML = user.cards.map(c => `
        <div class="virtual-card-wrapper">
          <div class="virtual-card ${c.theme}">
            <div class="card-top">
              <div class="card-chip"></div>
              <div class="card-brand">${c.brand}</div>
            </div>
            <div class="card-number">${c.numberMasked}</div>
            <div class="card-bottom">
              <div>
                <div class="card-holder-label">Cardholder</div>
                <div class="card-holder-name">${c.holder}</div>
              </div>
              <div>
                <div class="card-expiry-label">Expires</div>
                <div class="card-expiry-val">${c.expiry}</div>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Render Recent Transactions (Limit 5 for dashboard)
    const recentTxListEl = document.getElementById('recent-transactions-list');
    if (recentTxListEl) {
      const txs = window.fivpayStore.getTransactions().slice(0, 5);
      recentTxListEl.innerHTML = txs.map(tx => `
        <tr>
          <td>
            <div class="flex items-center gap-3">
              <span style="font-size: 1.3rem;">${tx.icon}</span>
              <div>
                <div class="font-semibold text-primary">${tx.title}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${tx.recipient} • ${tx.date}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-neutral">${tx.category}</span></td>
          <td class="font-bold ${tx.type === 'in' ? 'text-success' : 'text-primary'}">
            ${tx.type === 'in' ? '+' : '-'}$${tx.amount.toFixed(2)}
          </td>
          <td>
            <span class="badge ${tx.status === 'completed' ? 'badge-success' : tx.status === 'flagged' ? 'badge-danger' : 'badge-warning'}">
              <span class="badge-dot"></span> ${tx.status}
            </span>
          </td>
        </tr>
      `).join('');
    }
  }

  /**
   * 2. Render Staff Workspace (KYC Queue, Risk Screening, Actions)
   */
  renderStaffWorkspace() {
    const queue = window.fivpayStore.getKycQueue();
    const kycContainer = document.getElementById('kyc-queue-container');

    if (kycContainer) {
      kycContainer.innerHTML = queue.map(k => `
        <div class="kyc-card">
          <div class="kyc-header">
            <div>
              <h4 style="font-weight: 700;">${k.name}</h4>
              <p style="font-size: 0.8rem; color: var(--text-muted);">${k.email} • ${k.country}</p>
            </div>
            <span class="badge ${k.riskLevel === 'low' ? 'badge-success' : k.riskLevel === 'medium' ? 'badge-warning' : 'badge-danger'}">
              Risk: ${k.riskScore}% (${k.riskLevel})
            </span>
          </div>

          <div class="kyc-doc-preview">
            <span style="font-size: 2rem;">🪪</span>
            <div><strong>${k.docType}</strong> (#${k.docId})</div>
            <span style="font-size: 0.75rem;">Submitted ${k.submittedDate}</span>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-secondary); background: var(--bg-tertiary); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
            <strong>AML Note:</strong> ${k.notes}
          </p>

          <div class="flex items-center justify-between gap-2" style="margin-top: 0.5rem;">
            <span class="badge ${k.status === 'verified' ? 'badge-success' : k.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">
              Status: ${k.status}
            </span>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-danger" onclick="window.app.handleKycAction('${k.id}', 'rejected')">Reject</button>
              <button class="btn btn-sm btn-success" onclick="window.app.handleKycAction('${k.id}', 'verified')">Approve KYC</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  handleKycAction(kycId, newStatus) {
    window.fivpayStore.updateKycStatus(kycId, newStatus);
    this.renderStaffWorkspace();
    this.showToast(`KYC submission ${kycId} marked as ${newStatus.toUpperCase()}`, newStatus === 'verified' ? 'success' : 'warning');
  }

  /**
   * 3. Render Admin Dashboard (Platform stats, feature flags, user management)
   */
  renderAdminDashboard() {
    const adminUsers = window.fivpayStore.getAdminUsers();
    const adminTableBody = document.getElementById('admin-users-table');

    if (adminTableBody) {
      adminTableBody.innerHTML = adminUsers.map(u => `
        <tr>
          <td>
            <div class="font-semibold text-primary">${u.name}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${u.email}</div>
          </td>
          <td><span class="badge badge-primary">${u.role}</span></td>
          <td>${u.balance}</td>
          <td>
            <span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">
              <span class="badge-dot"></span> ${u.status}
            </span>
          </td>
          <td>
            <button class="btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-secondary'}" onclick="window.app.handleToggleUserStatus('${u.id}')">
              ${u.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
          </td>
        </tr>
      `).join('');
    }
  }

  handleToggleUserStatus(userId) {
    window.fivpayStore.toggleUserStatus(userId);
    this.renderAdminDashboard();
    this.showToast(`User status toggled successfully`, 'info');
  }

  handleToggleFeatureFlag(flagKey) {
    window.fivpayStore.toggleFeatureFlag(flagKey);
    this.showToast(`Platform rail flag '${flagKey}' updated`, 'success');
  }

  /**
   * 4. Render All Transactions with Search & Category Filter
   */
  renderTransactionsTable() {
    const allTxs = window.fivpayStore.getTransactions();
    const searchVal = (document.getElementById('tx-search-input')?.value || '').toLowerCase();
    const filterCat = document.getElementById('tx-category-filter')?.value || 'all';

    const filtered = allTxs.filter(tx => {
      const matchSearch = tx.title.toLowerCase().includes(searchVal) ||
                          tx.recipient.toLowerCase().includes(searchVal) ||
                          tx.reference.toLowerCase().includes(searchVal);
      const matchCat = filterCat === 'all' || tx.category.toLowerCase() === filterCat.toLowerCase();
      return matchSearch && matchCat;
    });

    const tbody = document.getElementById('full-transactions-table-body');
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">No transactions match your search filter.</td></tr>`;
      } else {
        tbody.innerHTML = filtered.map(tx => `
          <tr>
            <td>
              <div class="flex items-center gap-3">
                <span style="font-size: 1.3rem;">${tx.icon}</span>
                <div>
                  <div class="font-semibold text-primary">${tx.title}</div>
                  <div class="text-muted" style="font-size: 0.75rem;">Ref: ${tx.reference}</div>
                </div>
              </div>
            </td>
            <td>${tx.recipient}</td>
            <td><span class="badge badge-neutral">${tx.category}</span></td>
            <td class="text-muted" style="font-size: 0.85rem;">${tx.date}</td>
            <td class="font-bold ${tx.type === 'in' ? 'text-success' : 'text-primary'}">
              ${tx.type === 'in' ? '+' : '-'}$${tx.amount.toFixed(2)}
            </td>
            <td>
              <span class="badge ${tx.status === 'completed' ? 'badge-success' : tx.status === 'flagged' ? 'badge-danger' : 'badge-warning'}">
                <span class="badge-dot"></span> ${tx.status}
              </span>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  /**
   * 5. Render Budgets View & Progress Trackers
   */
  renderBudgetsView() {
    const budgets = window.fivpayStore.getBudgets();
    const container = document.getElementById('budgets-grid-container');

    if (container) {
      container.innerHTML = budgets.map(b => {
        const percent = Math.min(Math.round((b.spent / b.allocated) * 100), 100);
        const isNearLimit = percent >= 85;
        return `
          <div class="card stat-card">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span style="font-size: 1.5rem;">${b.icon}</span>
                <div>
                  <h4 style="font-size: 1rem; font-weight: 700;">${b.category}</h4>
                  <p style="font-size: 0.8rem; color: var(--text-muted);">$${b.spent.toLocaleString()} of $${b.allocated.toLocaleString()} spent</p>
                </div>
              </div>
              <span class="badge ${isNearLimit ? 'badge-danger' : 'badge-success'}">${percent}%</span>
            </div>

            <div class="progress-container">
              <div class="progress-bar ${isNearLimit ? 'danger' : ''}" style="width: ${percent}%; background-color: ${b.color};"></div>
            </div>

            <div class="flex items-center justify-between text-muted" style="font-size: 0.8rem;">
              <span>Remaining: $${(b.allocated - b.spent).toLocaleString()}</span>
              <span>${isNearLimit ? '⚠️ Approaching limit' : '✓ On track'}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  /* ------------------------------------------------------------------------
     Modal Management
     ------------------------------------------------------------------------ */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Automatically render QR canvas if opening Request QR modal
      if (modalId === 'modal-request-qr') {
        const qrCanvas = document.getElementById('request-qr-canvas');
        const amt = document.getElementById('request-amount')?.value || '50.00';
        const note = document.getElementById('request-note')?.value || 'FivPay Transfer';
        window.qrEngine.renderQR(qrCanvas, `fivpay://pay?to=alex.mercer@fivpay.com&amount=${amt}&note=${encodeURIComponent(note)}`, { size: 220 });
      }
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    // If closing scanner modal, terminate camera stream
    if (modalId === 'modal-qr-scanner') {
      const videoEl = document.getElementById('scanner-video');
      window.qrEngine.stopScanner(videoEl);
    }
  }

  /* ------------------------------------------------------------------------
     Toast Notifications
     ------------------------------------------------------------------------ */
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✓',
      danger: '✕',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ------------------------------------------------------------------------
     Event Bindings
     ------------------------------------------------------------------------ */
  bindEvents() {
    // Theme toggle button
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Mobile menu toggle
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
    });

    // Balance hide/show eye toggle
    document.getElementById('btn-toggle-balance')?.addEventListener('click', () => {
      this.isBalanceHidden = !this.isBalanceHidden;
      this.renderUserDashboard();
    });

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        if (view) this.switchView(view);
      });
    });

    // Role switcher pills in top bar
    document.querySelectorAll('.role-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.onRoleChange(pill.dataset.role);
      });
    });

    // Send Money Form Submit -> 2-Step Confirmation
    const sendForm = document.getElementById('form-send-money');
    if (sendForm) {
      sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const recipient = document.getElementById('payment-recipient').value;
        const amount = document.getElementById('payment-amount').value;
        const note = document.getElementById('payment-note').value;
        const category = document.getElementById('payment-category').value;

        window.paymentsEngine.initiatePayment({ recipient, amount, note, category });
      });
    }

    // Confirm Payment Button in Confirmation Modal
    document.getElementById('btn-confirm-transfer')?.addEventListener('click', () => {
      window.paymentsEngine.executePayment();
    });

    // Quick QR Request Money Generation
    const requestAmountInput = document.getElementById('request-amount');
    const requestNoteInput = document.getElementById('request-note');
    const updateRequestQR = () => {
      const amt = requestAmountInput?.value || '0.00';
      const note = requestNoteInput?.value || 'FivPay Transfer';
      const qrCanvas = document.getElementById('request-qr-canvas');
      const payload = `fivpay://pay?to=alex.mercer@fivpay.com&amount=${amt}&note=${encodeURIComponent(note)}`;
      window.qrEngine.renderQR(qrCanvas, payload, { size: 220 });
    };

    requestAmountInput?.addEventListener('input', updateRequestQR);
    requestNoteInput?.addEventListener('input', updateRequestQR);

    // Scan QR Code Modal Opener
    document.getElementById('btn-action-scan')?.addEventListener('click', async () => {
      this.openModal('modal-qr-scanner');
      const videoEl = document.getElementById('scanner-video');
      await window.qrEngine.startScanner(videoEl);
    });

    // Simulate QR Scan Button inside scanner modal
    document.getElementById('btn-simulate-qr-scan')?.addEventListener('click', () => {
      const demo = window.qrEngine.getRandomDemoPayload();
      this.closeModal('modal-qr-scanner');
      this.showToast(`Scanned QR code for ${demo.to}!`, 'success');

      // Pre-fill Send Money modal and open it
      this.openModal('modal-send-money');
      document.getElementById('payment-recipient').value = `${demo.to} (${demo.email})`;
      document.getElementById('payment-amount').value = demo.amount;
      document.getElementById('payment-note').value = demo.note;
      document.getElementById('payment-category').value = demo.category;
    });

    // Top-up Modal & Quick Amounts
    document.querySelectorAll('.topup-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.amount;
        window.paymentsEngine.simulateTopUp(val);
      });
    });

    // Filter transactions on typing / changing select
    document.getElementById('tx-search-input')?.addEventListener('input', () => {
      this.renderTransactionsTable();
    });
    document.getElementById('tx-category-filter')?.addEventListener('change', () => {
      this.renderTransactionsTable();
    });

    // Export Transactions to CSV
    document.getElementById('btn-export-tx')?.addEventListener('click', () => {
      this.exportTransactionsCSV();
    });

    // Add New Budget Form
    const budgetForm = document.getElementById('form-add-budget');
    if (budgetForm) {
      budgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cat = document.getElementById('budget-category-name').value;
        const amt = document.getElementById('budget-limit-amount').value;
        const color = document.getElementById('budget-color-picker').value;

        window.fivpayStore.addBudget(cat, amt, color, '🏷️');
        this.closeModal('modal-add-budget');
        this.renderBudgetsView();
        this.showToast(`Budget for ${cat} created!`, 'success');
        budgetForm.reset();
      });
    }

    // Modal close buttons (clicks on backdrop or [data-close-modal])
    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', () => {
        const modalId = el.closest('.modal-overlay')?.id;
        if (modalId) this.closeModal(modalId);
      });
    });

    // ESC key closes any active modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
          this.closeModal(m.id);
        });
      }
    });
  }

  /**
   * Helper: Export transactions as CSV download
   */
  exportTransactionsCSV() {
    const txs = window.fivpayStore.getTransactions();
    let csv = 'Reference,Title,Recipient,Category,Date,Type,Amount,Currency,Status\n';

    txs.forEach(t => {
      csv += `"${t.reference}","${t.title}","${t.recipient}","${t.category}","${t.date}","${t.type}","${t.amount}","${t.currency}","${t.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FivPay_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Downloaded transactions CSV report', 'success');
  }
}

// Instantiate on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FivPayApp();
});
