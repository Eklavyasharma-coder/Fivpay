/* ==========================================================================
   FivPay - Mock Data Store
   Realistic dataset for User, Staff, Admin, Transactions, Budgets & System
   ========================================================================== */

const FIVPAY_STORAGE_KEY = 'fivpay_state_v1';

const defaultMockData = {
  currentRole: 'user', // 'user' | 'staff' | 'admin'
  currentUser: {
    id: 'usr_001',
    name: 'Alex Mercer',
    email: 'alex.mercer@fivpay.com',
    role: 'user',
    avatar: 'AM',
    tier: 'Platinum Elite Member',
    accountNumber: 'FP-8829-4102-99',
    hideBalance: false,
    activeCurrency: 'USD',
    balances: {
      USD: 24850.75,
      EUR: 14200.00,
      GBP: 8950.20
    },
    cards: [
      {
        id: 'card_1',
        theme: 'primary',
        brand: 'VISA',
        name: 'Platinum Virtual',
        numberMasked: '4532 •••• •••• 8821',
        numberFull: '4532 8920 1192 8821',
        expiry: '09/28',
        cvv: '492',
        holder: 'Alex Mercer',
        spendingLimit: 10000,
        spent: 3420,
        status: 'active'
      },
      {
        id: 'card_2',
        theme: 'emerald',
        brand: 'MASTERCARD',
        name: 'Travel & Lifestyle',
        numberMasked: '5412 •••• •••• 3042',
        numberFull: '5412 7701 4429 3042',
        expiry: '12/29',
        cvv: '108',
        holder: 'Alex Mercer',
        spendingLimit: 5000,
        spent: 890,
        status: 'active'
      }
    ]
  },
  staffUser: {
    id: 'stf_001',
    name: 'Sarah Jenkins',
    email: 'sarah.compliance@fivpay.com',
    role: 'staff',
    avatar: 'SJ',
    department: 'Risk, Fraud & AML Operations',
    casesReviewedToday: 18
  },
  adminUser: {
    id: 'adm_001',
    name: 'Marcus Vance',
    email: 'marcus.admin@fivpay.com',
    role: 'admin',
    avatar: 'MV',
    title: 'Head of Global Fintech Infrastructure',
    securityLevel: 'Tier 5 (Superadmin)'
  },
  transactions: [
    {
      id: 'tx_101',
      reference: 'FP-2026-9901',
      title: 'Stripe Global Payout',
      category: 'Income',
      recipient: 'Stripe Inc.',
      date: '2026-10-18 09:14',
      amount: 4500.00,
      currency: 'USD',
      type: 'in',
      status: 'completed',
      fee: 0.00,
      icon: '💰'
    },
    {
      id: 'tx_102',
      reference: 'FP-2026-9884',
      title: 'Apple Store Regent St',
      category: 'Electronics',
      recipient: 'Apple UK Retail',
      date: '2026-10-17 18:32',
      amount: 1299.00,
      currency: 'USD',
      type: 'out',
      status: 'completed',
      fee: 0.00,
      icon: '🍎'
    },
    {
      id: 'tx_103',
      reference: 'FP-2026-9872',
      title: 'Amazon Web Services',
      category: 'Cloud Services',
      recipient: 'AWS EMEA Cloud',
      date: '2026-10-16 11:20',
      amount: 342.50,
      currency: 'USD',
      type: 'out',
      status: 'completed',
      fee: 0.00,
      icon: '☁️'
    },
    {
      id: 'tx_104',
      reference: 'FP-2026-9850',
      title: 'Transfer from Elena Rostova',
      category: 'Transfer',
      recipient: 'Elena Rostova',
      date: '2026-10-15 14:45',
      amount: 850.00,
      currency: 'USD',
      type: 'in',
      status: 'completed',
      fee: 0.00,
      icon: '👤'
    },
    {
      id: 'tx_105',
      reference: 'FP-2026-9821',
      title: 'Whole Foods Market',
      category: 'Groceries',
      recipient: 'Whole Foods Market',
      date: '2026-10-14 19:10',
      amount: 145.80,
      currency: 'USD',
      type: 'out',
      status: 'completed',
      fee: 0.00,
      icon: '🛒'
    },
    {
      id: 'tx_106',
      reference: 'FP-2026-9800',
      title: 'British Airways Flight',
      category: 'Travel',
      recipient: 'British Airways London',
      date: '2026-10-13 10:15',
      amount: 620.00,
      currency: 'USD',
      type: 'out',
      status: 'completed',
      fee: 0.00,
      icon: '✈️'
    },
    {
      id: 'tx_107',
      reference: 'FP-2026-9788',
      title: 'Freelance UI/UX Consulting',
      category: 'Income',
      recipient: 'Fintech Studio Labs',
      date: '2026-10-12 16:30',
      amount: 2800.00,
      currency: 'USD',
      type: 'in',
      status: 'completed',
      fee: 0.00,
      icon: '🎨'
    },
    {
      id: 'tx_108',
      reference: 'FP-2026-9764',
      title: 'Netflix & Spotify Bundle',
      category: 'Entertainment',
      recipient: 'Digital Media Services',
      date: '2026-10-11 08:00',
      amount: 32.99,
      currency: 'USD',
      type: 'out',
      status: 'completed',
      fee: 0.00,
      icon: '🍿'
    },
    {
      id: 'tx_109',
      reference: 'FP-2026-9742',
      title: 'High Volume Crypto Rail Transfer',
      category: 'Wire',
      recipient: 'Binance OTC Custody',
      date: '2026-10-10 22:15',
      amount: 14500.00,
      currency: 'USD',
      type: 'out',
      status: 'flagged',
      fee: 25.00,
      icon: '⚠️'
    }
  ],
  budgets: [
    {
      id: 'b1',
      category: 'Housing & Living',
      allocated: 3500,
      spent: 2450,
      color: '#6366f1',
      icon: '🏠'
    },
    {
      id: 'b2',
      category: 'Groceries & Dining',
      allocated: 1200,
      spent: 890,
      color: '#10b981',
      icon: '🍔'
    },
    {
      id: 'b3',
      category: 'Tech & Cloud Software',
      allocated: 800,
      spent: 650,
      color: '#06b6d4',
      icon: '💻'
    },
    {
      id: 'b4',
      category: 'Travel & Flight',
      allocated: 1500,
      spent: 1350,
      color: '#f59e0b',
      icon: '✈️'
    },
    {
      id: 'b5',
      category: 'Entertainment & Hobbies',
      allocated: 500,
      spent: 280,
      color: '#ec4899',
      icon: '🎮'
    }
  ],
  kycQueue: [
    {
      id: 'kyc_1',
      name: 'Elena Rostova',
      email: 'elena.r@finmail.com',
      docType: 'Passport (International)',
      docId: 'UA-892401',
      country: 'Ukraine / USA',
      submittedDate: '2026-10-18 08:30',
      riskScore: 12,
      riskLevel: 'low',
      status: 'pending',
      notes: 'Clean sanction screening. Verified biometric photo.'
    },
    {
      id: 'kyc_2',
      name: 'David Chen',
      email: 'chen.d@singaporesinglet.sg',
      docType: 'National Identity Card',
      docId: 'SG-S923184',
      country: 'Singapore',
      submittedDate: '2026-10-17 19:40',
      riskScore: 42,
      riskLevel: 'medium',
      status: 'pending',
      notes: 'Address proof dated >90 days. Secondary utility bill requested.'
    },
    {
      id: 'kyc_3',
      name: 'Liam Gallagher',
      email: 'l.gallagher@manchesterlive.co.uk',
      docType: 'Driver License & Tax ID',
      docId: 'UK-DL-99412',
      country: 'United Kingdom',
      submittedDate: '2026-10-17 14:15',
      riskScore: 78,
      riskLevel: 'high',
      status: 'flagged',
      notes: 'High velocity transaction pattern detected. PEP match alert.'
    },
    {
      id: 'kyc_4',
      name: 'Amara Okafor',
      email: 'amara.okafor@lagostech.io',
      docType: 'Voter ID & Passport',
      docId: 'NG-P882941',
      country: 'Nigeria',
      submittedDate: '2026-10-16 11:22',
      riskScore: 18,
      riskLevel: 'low',
      status: 'pending',
      notes: 'Selfie match 99.4%. High compliance confidence.'
    }
  ],
  adminUsersList: [
    { id: 'usr_001', name: 'Alex Mercer', email: 'alex.mercer@fivpay.com', role: 'user', status: 'active', balance: '$24,850.75', kycStatus: 'verified', joined: '2025-04-12' },
    { id: 'usr_002', name: 'Elena Rostova', email: 'elena.r@finmail.com', role: 'user', status: 'active', balance: '$8,420.00', kycStatus: 'pending', joined: '2026-09-01' },
    { id: 'usr_003', name: 'David Chen', email: 'chen.d@singaporesinglet.sg', role: 'user', status: 'active', balance: '$19,300.50', kycStatus: 'pending', joined: '2026-08-15' },
    { id: 'usr_004', name: 'Liam Gallagher', email: 'l.gallagher@manchesterlive.co.uk', role: 'user', status: 'suspended', balance: '$45,000.00', kycStatus: 'flagged', joined: '2026-01-20' },
    { id: 'stf_001', name: 'Sarah Jenkins', email: 'sarah.compliance@fivpay.com', role: 'staff', status: 'active', balance: '$0.00', kycStatus: 'internal', joined: '2024-11-10' },
    { id: 'adm_001', name: 'Marcus Vance', email: 'marcus.admin@fivpay.com', role: 'admin', status: 'active', balance: '$0.00', kycStatus: 'internal', joined: '2024-01-05' }
  ],
  platformMetrics: {
    totalVolume: '$42,891,420.00',
    totalUsers: '14,892',
    activeToday: '3,410',
    liquidityReserve: '$180,500,000.00',
    apiLatencyMs: '24ms',
    uptime: '99.99%'
  },
  featureFlags: {
    instantSepa: true,
    cryptoRailBridge: true,
    biometricAuth: true,
    internationalSwift: false,
    zeroFeePromotion: true
  }
};

class FivPayStore {
  constructor() {
    this.data = this.loadState();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(FIVPAY_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read state from localStorage', e);
    }
    return JSON.parse(JSON.stringify(defaultMockData));
  }

  saveState() {
    try {
      localStorage.setItem(FIVPAY_STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }

  resetState() {
    this.data = JSON.parse(JSON.stringify(defaultMockData));
    this.saveState();
  }

  setRole(role) {
    if (['user', 'staff', 'admin'].includes(role)) {
      this.data.currentRole = role;
      this.saveState();
    }
  }

  getRole() {
    return this.data.currentRole || 'user';
  }

  getUser() {
    return this.data.currentUser;
  }

  getTransactions() {
    return this.data.transactions;
  }

  addTransaction(tx) {
    this.data.transactions.unshift(tx);
    // Adjust balance if applicable
    if (tx.currency === 'USD') {
      if (tx.type === 'in') {
        this.data.currentUser.balances.USD += parseFloat(tx.amount);
      } else {
        this.data.currentUser.balances.USD -= parseFloat(tx.amount);
      }
    }
    this.saveState();
  }

  getBudgets() {
    return this.data.budgets;
  }

  addBudget(category, allocated, color, icon) {
    this.data.budgets.push({
      id: 'b_' + Date.now(),
      category,
      allocated: parseFloat(allocated),
      spent: 0,
      color: color || '#6366f1',
      icon: icon || '📊'
    });
    this.saveState();
  }

  getKycQueue() {
    return this.data.kycQueue;
  }

  updateKycStatus(id, newStatus) {
    const item = this.data.kycQueue.find(k => k.id === id);
    if (item) {
      item.status = newStatus;
      this.saveState();
    }
  }

  getAdminUsers() {
    return this.data.adminUsersList;
  }

  toggleUserStatus(userId) {
    const user = this.data.adminUsersList.find(u => u.id === userId);
    if (user) {
      user.status = user.status === 'active' ? 'suspended' : 'active';
      this.saveState();
    }
  }

  toggleFeatureFlag(key) {
    if (this.data.featureFlags.hasOwnProperty(key)) {
      this.data.featureFlags[key] = !this.data.featureFlags[key];
      this.saveState();
    }
  }
}

// Global store instance
window.fivpayStore = new FivPayStore();
