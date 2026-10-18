/* ==============================================================================
   FivPay - Centralized Backend REST API Client
   Communicates with Flask Backend on http://localhost:5000/api
   Handles JWT token management, network resilience, and error serialization.
   ============================================================================== */

const API_BASE_URL = window.FIVPAY_API_BASE || 'http://localhost:5000/api';

class FivPayApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.isOnline = false;
    this.token = localStorage.getItem('fivpay_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('fivpay_token', token);
    } else {
      localStorage.removeItem('fivpay_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('fivpay_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      this.isOnline = true;
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Request failed`);
      }

      return { success: true, data };
    } catch (err) {
      if (err.name === 'AbortError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        this.isOnline = false;
        return {
          success: false,
          offline: true,
          error: 'Backend API is currently unreachable on http://localhost:5000. Running in local sandbox mode.'
        };
      }
      return { success: false, error: err.message };
    }
  }

  /* ----------------------------------------------------------------------------
     1. Authentication Endpoints
     ---------------------------------------------------------------------------- */
  async register(name, email, password, role = 'user') {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    });
    if (res.success && res.data.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.success && res.data.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  async getProfile() {
    return await this.request('/auth/me');
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  /* ----------------------------------------------------------------------------
     2. Transactions & Transfers
     ---------------------------------------------------------------------------- */
  async listTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/transactions?${query}`);
  }

  async makeTransfer(recipient, amount, note, category = 'Transfer', idempotencyKey = null) {
    const headers = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return await this.request('/transactions/transfer', {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipient, amount, note, category, idempotency_key: idempotencyKey })
    });
  }

  /* ----------------------------------------------------------------------------
     3. Budgets & Spending Goals
     ---------------------------------------------------------------------------- */
  async listBudgets() {
    return await this.request('/budgets');
  }

  async createBudget(category, allocatedAmount, colorHex) {
    return await this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify({ category, allocated_amount: allocatedAmount, color_hex: colorHex })
    });
  }

  async deleteBudget(budgetId) {
    return await this.request(`/budgets/${budgetId}`, { method: 'DELETE' });
  }

  /* ----------------------------------------------------------------------------
     4. Staff Company Expenses
     ---------------------------------------------------------------------------- */
  async listExpenses(status = null) {
    const query = status ? `?status=${status}` : '';
    return await this.request(`/expenses${query}`);
  }

  async submitExpense(amount, category, description, expenseDate, receiptFilename = null) {
    return await this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        category,
        description,
        expense_date: expenseDate,
        receipt_filename: receiptFilename
      })
    });
  }

  async reviewExpense(expenseId, action, notes) {
    return await this.request(`/expenses/${expenseId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action, notes })
    });
  }

  /* ----------------------------------------------------------------------------
     5. Admin Management & Telemetry
     ---------------------------------------------------------------------------- */
  async listAdminUsers() {
    return await this.request('/admin/users');
  }

  async toggleUserStatus(userId, status) {
    return await this.request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async updateUserRole(userId, role) {
    return await this.request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }

  async getAdminMetrics() {
    return await this.request('/admin/metrics');
  }

  async getAuditLogs() {
    return await this.request('/admin/audit-logs');
  }

  /* ----------------------------------------------------------------------------
     6. QR Code & UPI Decoder
     ---------------------------------------------------------------------------- */
  async generateQR(amount, note) {
    return await this.request('/qr/generate', {
      method: 'POST',
      body: JSON.stringify({ amount, note })
    });
  }

  async decodeQR(payload) {
    return await this.request('/qr/decode', {
      method: 'POST',
      body: JSON.stringify({ payload })
    });
  }

  async getGatewayStatus() {
    return await this.request('/qr/gateway-status');
  }

  async checkHealth() {
    const res = await this.request('/health');
    this.isOnline = res.success;
    return res;
  }
}

// Global API instance
window.fivpayApi = new FivPayApiClient();
