/* ==============================================================================
   FivPay - Client Environment & Deployment Configuration
   Enables seamless transitions between local development and cloud hosting
   (e.g., Netlify frontend + Render/Railway/Fly.io/AWS backend)
   ============================================================================== */

window.FIVPAY_CONFIG = {
  // In development, target localhost:5000. In production, change to your live API URL or override via window.FIVPAY_API_OVERRIDE
  API_BASE_URL: window.FIVPAY_API_OVERRIDE || (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://api.fivpay.com/api' // Override in production
  ),
  APP_NAME: 'FivPay Digital Banking',
  VERSION: '1.0.0',
  ENV: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'development' : 'production',
  DEFAULT_CURRENCY: 'USD',
  REQUEST_TIMEOUT_MS: 8000
};

// Backward-compatible global alias for api.js
window.FIVPAY_API_BASE = window.FIVPAY_CONFIG.API_BASE_URL;
