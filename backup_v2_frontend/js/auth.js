/* ==========================================================================
   FivPay - Authentication & Session Management
   Supports Login, Signup, 1-Click Demo Profiles & Role Transitions
   ========================================================================== */

const AUTH_SESSION_KEY = 'fivpay_auth_session';

class AuthManager {
  constructor() {
    this.session = this.getSession();
  }

  getSession() {
    try {
      const stored = localStorage.getItem(AUTH_SESSION_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Auth session read failed', e);
    }
    // Default demo session for immediate exploration
    return {
      isLoggedIn: true,
      role: 'user',
      email: 'alex.mercer@fivpay.com',
      name: 'Alex Mercer'
    };
  }

  saveSession(sessionData) {
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
      this.session = sessionData;
    } catch (e) {
      console.error('Failed to save session', e);
    }
  }

  login(email, password, role = 'user') {
    let name = 'Alex Mercer';
    if (role === 'staff' || email.includes('compliance') || email.includes('staff')) {
      role = 'staff';
      name = 'Sarah Jenkins';
    } else if (role === 'admin' || email.includes('admin')) {
      role = 'admin';
      name = 'Marcus Vance';
    }

    const sessionData = {
      isLoggedIn: true,
      role: role,
      email: email,
      name: name,
      loginTime: new Date().toISOString()
    };

    this.saveSession(sessionData);
    if (window.fivpayStore) {
      window.fivpayStore.setRole(role);
    }

    return sessionData;
  }

  signup(name, email, password, role = 'user') {
    const sessionData = {
      isLoggedIn: true,
      role: role,
      email: email,
      name: name,
      signupTime: new Date().toISOString()
    };

    this.saveSession(sessionData);
    if (window.fivpayStore) {
      window.fivpayStore.setRole(role);
      // Update mock current user details
      window.fivpayStore.data.currentUser.name = name;
      window.fivpayStore.data.currentUser.email = email;
      window.fivpayStore.data.currentUser.avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      window.fivpayStore.saveState();
    }

    return sessionData;
  }

  quickDemoLogin(role) {
    let email = 'alex.mercer@fivpay.com';
    let name = 'Alex Mercer';

    if (role === 'staff') {
      email = 'sarah.compliance@fivpay.com';
      name = 'Sarah Jenkins';
    } else if (role === 'admin') {
      email = 'marcus.admin@fivpay.com';
      name = 'Marcus Vance';
    }

    return this.login(email, 'demo1234', role);
  }

  logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    this.session = null;
    window.location.href = 'auth.html';
  }

  switchRole(role) {
    if (this.session) {
      this.session.role = role;
      if (role === 'user') {
        this.session.name = 'Alex Mercer';
        this.session.email = 'alex.mercer@fivpay.com';
      } else if (role === 'staff') {
        this.session.name = 'Sarah Jenkins';
        this.session.email = 'sarah.compliance@fivpay.com';
      } else if (role === 'admin') {
        this.session.name = 'Marcus Vance';
        this.session.email = 'marcus.admin@fivpay.com';
      }
      this.saveSession(this.session);
    }

    if (window.fivpayStore) {
      window.fivpayStore.setRole(role);
    }
  }
}

// Global auth instance
window.authManager = new AuthManager();
