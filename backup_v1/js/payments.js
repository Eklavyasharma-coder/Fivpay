/* ==========================================================================
   FivPay - Payments Engine & Demo Confirmation Flow
   Handles Send Money, 2-Step Confirmation, Receipt Generation, QR Request & Top-up
   ========================================================================== */

class PaymentsEngine {
  constructor() {
    this.pendingPayment = null;
  }

  /**
   * Quick contact auto-fill helper
   */
  selectContact(name, email, avatar) {
    const recipientInput = document.getElementById('payment-recipient');
    if (recipientInput) {
      recipientInput.value = `${name} (${email})`;
    }
    const noteInput = document.getElementById('payment-note');
    if (noteInput && !noteInput.value) {
      noteInput.value = `Transfer to ${name}`;
    }
  }

  /**
   * Step 1 -> Step 2: Validate input and launch Confirmation Modal
   */
  initiatePayment(formData) {
    const { recipient, amount, note, category } = formData;
    const numAmount = parseFloat(amount);

    if (!recipient || recipient.trim() === '') {
      window.app.showToast('Please specify a recipient name or email', 'warning');
      return false;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      window.app.showToast('Please enter a valid amount greater than $0', 'warning');
      return false;
    }

    const user = window.fivpayStore.getUser();
    if (numAmount > user.balances.USD) {
      window.app.showToast(`Insufficient funds! Your balance is $${user.balances.USD.toLocaleString()}`, 'danger');
      return false;
    }

    // Save pending payment object
    this.pendingPayment = {
      recipient: recipient.trim(),
      amount: numAmount,
      note: note || 'Peer transfer',
      category: category || 'Transfer',
      fee: 0.00,
      total: numAmount,
      reference: 'FP-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    // Close input modal and open 2-step confirmation modal
    window.app.closeModal('modal-send-money');
    this.renderConfirmationModal(this.pendingPayment);
    window.app.openModal('modal-confirm-payment');
    return true;
  }

  /**
   * Render Confirmation Details
   */
  renderConfirmationModal(payment) {
    const summaryEl = document.getElementById('confirm-payment-summary');
    if (!summaryEl) return;

    summaryEl.innerHTML = `
      <div class="receipt-card" style="margin-top: 0;">
        <div class="receipt-header">
          <div style="font-size: 0.85rem; color: var(--text-secondary);">Transferring to</div>
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">
            ${payment.recipient}
          </div>
          <div class="receipt-amount">$${payment.amount.toFixed(2)} USD</div>
          <span class="badge badge-success"><span class="badge-dot"></span> Instant Rail Verified</span>
        </div>

        <div class="receipt-row">
          <span class="label">Transfer Amount</span>
          <span class="value">$${payment.amount.toFixed(2)}</span>
        </div>
        <div class="receipt-row">
          <span class="label">FivPay Platform Fee</span>
          <span class="value text-success">$0.00 (Zero Fee Promotion)</span>
        </div>
        <div class="receipt-row">
          <span class="label">Category</span>
          <span class="value">${payment.category}</span>
        </div>
        <div class="receipt-row">
          <span class="label">Memo</span>
          <span class="value">${payment.note}</span>
        </div>
        <div class="receipt-row" style="border-top: 1px dashed var(--border-color); padding-top: 0.6rem; margin-top: 0.4rem;">
          <span class="label" style="font-weight: 700; color: var(--text-primary);">Total Debit</span>
          <span class="value text-accent" style="font-size: 1.1rem; font-weight: 800;">$${payment.total.toFixed(2)} USD</span>
        </div>
      </div>
    `;
  }

  /**
   * Step 2 -> Step 3: Process Payment with animation, then show Digital Receipt
   */
  executePayment() {
    if (!this.pendingPayment) return;

    const btnConfirm = document.getElementById('btn-confirm-transfer');
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = `<span class="spinner" style="display:inline-block; animation: spin 1s infinite linear;">⚡</span> Authorizing Rail...`;
    }

    setTimeout(() => {
      // Create new transaction in store
      const newTx = {
        id: 'tx_' + Date.now(),
        reference: this.pendingPayment.reference,
        title: `Payment to ${this.pendingPayment.recipient.split(' ')[0]}`,
        category: this.pendingPayment.category,
        recipient: this.pendingPayment.recipient,
        date: this.pendingPayment.date,
        amount: this.pendingPayment.amount,
        currency: 'USD',
        type: 'out',
        status: 'completed',
        fee: 0.00,
        icon: '💸'
      };

      window.fivpayStore.addTransaction(newTx);

      // Close confirmation modal
      window.app.closeModal('modal-confirm-payment');

      // Reset button
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = 'Authorize & Send Money';
      }

      // Render & Launch Digital Receipt Modal
      this.renderReceiptModal(this.pendingPayment);
      window.app.openModal('modal-receipt');
      window.app.showToast(`Successfully sent $${this.pendingPayment.amount.toFixed(2)} to ${this.pendingPayment.recipient}!`, 'success');

      // Refresh UI Views
      window.app.renderAllViews();
    }, 900);
  }

  /**
   * Step 4: Render Digital Receipt Modal
   */
  renderReceiptModal(payment) {
    const container = document.getElementById('receipt-modal-content');
    if (!container) return;

    container.innerHTML = `
      <div class="receipt-card">
        <div class="receipt-header">
          <div class="receipt-status-icon">✓</div>
          <h3 style="font-weight: 800; color: var(--text-primary);">Payment Confirmed!</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Transaction settled on FivPay Instant Rails</p>
          <div class="receipt-amount">$${payment.amount.toFixed(2)}</div>
          <span class="badge badge-success"><span class="badge-dot"></span> Completed</span>
        </div>

        <div class="receipt-row">
          <span class="label">Reference ID</span>
          <span class="value font-bold text-accent" style="letter-spacing: 0.5px;">${payment.reference}</span>
        </div>
        <div class="receipt-row">
          <span class="label">Timestamp</span>
          <span class="value">${payment.date}</span>
        </div>
        <div class="receipt-row">
          <span class="label">Recipient</span>
          <span class="value">${payment.recipient}</span>
        </div>
        <div class="receipt-row">
          <span class="label">Category</span>
          <span class="value">${payment.category}</span>
        </div>
        <div class="receipt-row">
          <span class="label">Payment Memo</span>
          <span class="value">${payment.note}</span>
        </div>
        <div class="receipt-row">
          <span class="label">Payment Method</span>
          <span class="value">FivPay Platinum Balance</span>
        </div>
        <div class="receipt-row" style="border-top: 1px dashed var(--border-color); padding-top: 0.6rem; margin-top: 0.4rem;">
          <span class="label" style="font-weight: 700;">Status</span>
          <span class="value text-success font-bold">100% Guaranteed & Settled</span>
        </div>
      </div>
    `;
  }

  /**
   * Simulate Quick Top-Up / Deposit
   */
  simulateTopUp(amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      window.app.showToast('Please enter a valid top-up amount', 'warning');
      return;
    }

    const tx = {
      id: 'tx_' + Date.now(),
      reference: 'FP-DEP-' + Math.floor(1000 + Math.random() * 9000),
      title: 'Direct Bank Wire Deposit',
      category: 'Deposit',
      recipient: 'FivPay Primary Wallet',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      amount: numAmount,
      currency: 'USD',
      type: 'in',
      status: 'completed',
      fee: 0.00,
      icon: '📥'
    };

    window.fivpayStore.addTransaction(tx);
    window.app.closeModal('modal-top-up');
    window.app.showToast(`Deposited $${numAmount.toLocaleString()} into your USD balance!`, 'success');
    window.app.renderAllViews();
  }
}

// Global payments instance
window.paymentsEngine = new PaymentsEngine();
