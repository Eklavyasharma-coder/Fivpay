-- ==============================================================================
-- FivPay Demo Seed Dataset (Simulated Sandbox Data Only)
-- Password for all demo accounts: demo1234
-- ==============================================================================

-- 1. DEMO USERS
INSERT INTO users (id, uuid, name, email, password_hash, role, status, department) VALUES
(1, 'usr-alex-001', 'Alex Mercer', 'alex.mercer@fivpay.com', 'scrypt:32768:8:1$RXledffgLJi7SsDh$b6c8690eebadc9bfb96d34527a23c5b9c0dd19602ed0425dd24ebba763d2735ca3979785d2954f793e40a8be1dae2a3b3053f01562ba39f738f60e2263c52481', 'user', 'active', 'Client Services'),
(2, 'usr-elena-002', 'Elena Rostova', 'elena.r@finmail.com', 'scrypt:32768:8:1$RXledffgLJi7SsDh$b6c8690eebadc9bfb96d34527a23c5b9c0dd19602ed0425dd24ebba763d2735ca3979785d2954f793e40a8be1dae2a3b3053f01562ba39f738f60e2263c52481', 'user', 'active', 'Retail Client'),
(3, 'stf-sarah-001', 'Sarah Jenkins', 'sarah.compliance@fivpay.com', 'scrypt:32768:8:1$RXledffgLJi7SsDh$b6c8690eebadc9bfb96d34527a23c5b9c0dd19602ed0425dd24ebba763d2735ca3979785d2954f793e40a8be1dae2a3b3053f01562ba39f738f60e2263c52481', 'staff', 'active', 'Corporate Operations & AML'),
(4, 'adm-marcus-001', 'Marcus Vance', 'marcus.admin@fivpay.com', 'scrypt:32768:8:1$RXledffgLJi7SsDh$b6c8690eebadc9bfb96d34527a23c5b9c0dd19602ed0425dd24ebba763d2735ca3979785d2954f793e40a8be1dae2a3b3053f01562ba39f738f60e2263c52481', 'admin', 'active', 'Global Infrastructure & Security');

-- 2. DEMO ACCOUNTS
INSERT INTO accounts (id, user_id, account_number, currency, balance, daily_limit, status) VALUES
(1, 1, 'FP-8829-4102-99', 'USD', 24850.75, 50000.00, 'active'),
(2, 2, 'FP-1092-7482-11', 'USD', 8420.00, 25000.00, 'active'),
(3, 3, 'FP-CORP-EXPENSE-01', 'USD', 5000.00, 10000.00, 'active'),
(4, 4, 'FP-ADMIN-TREASURY', 'USD', 250000.00, 500000.00, 'active');

-- 3. DEMO TRANSACTIONS
INSERT INTO transactions (reference, sender_account_id, receiver_account_id, amount, fee, currency, category, note, type, status, created_at) VALUES
('FP-TX-2026-9901', 2, 1, 4500.00, 0.00, 'USD', 'Income', 'Stripe Payout Settlement', 'transfer', 'completed', '2026-10-18 09:14:00'),
('FP-TX-2026-9884', 1, 2, 1299.00, 0.00, 'USD', 'Electronics', 'Apple Retail Store Hardware', 'payment', 'completed', '2026-10-17 18:32:00'),
('FP-TX-2026-9872', 1, 4, 342.50, 0.00, 'USD', 'Cloud Services', 'AWS Cloud Infrastructure Tier', 'payment', 'completed', '2026-10-16 11:20:00'),
('FP-TX-2026-9850', 2, 1, 850.00, 0.00, 'USD', 'Transfer', 'Co-working and utilities reimbursement', 'transfer', 'completed', '2026-10-15 14:45:00'),
('FP-TX-2026-9821', 1, 2, 145.80, 0.00, 'USD', 'Groceries', 'Whole Foods Organic Supply', 'payment', 'completed', '2026-10-14 19:10:00'),
('FP-TX-2026-9800', 1, 2, 620.00, 0.00, 'USD', 'Travel', 'British Airways Flight - LHR to JFK', 'payment', 'completed', '2026-10-13 10:15:00');

-- 4. DEMO BUDGETS
INSERT INTO budgets (user_id, category, allocated_amount, spent_amount, period_month, period_year, color_hex) VALUES
(1, 'Housing & Utilities', 3500.00, 2450.00, 10, 2026, '#0F172A'),
(1, 'Groceries & Dining', 1200.00, 890.00, 10, 2026, '#0D9488'),
(1, 'Tech & Cloud Software', 800.00, 650.00, 10, 2026, '#3B82F6'),
(1, 'Travel & Mobility', 1500.00, 1350.00, 10, 2026, '#F59E0B'),
(1, 'Health & Wellness', 500.00, 280.00, 10, 2026, '#10B981');

-- 5. DEMO STAFF EXPENSES
INSERT INTO expenses (id, staff_user_id, amount, currency, category, description, expense_date, receipt_filename, receipt_url, status) VALUES
(1, 3, 340.50, 'USD', 'Software Subscription', 'Team Datadog Cloud APM License - Monthly', '2026-10-16', 'receipt_datadog_oct.pdf', '/uploads/receipts/demo_datadog.pdf', 'pending'),
(2, 3, 185.00, 'USD', 'Client Relations', 'Working lunch with European liquidity partners', '2026-10-15', 'receipt_bistro_lunch.pdf', '/uploads/receipts/demo_lunch.pdf', 'approved'),
(3, 3, 89.99, 'USD', 'Hardware & Office', 'USB-C DisplayPort Cables and Multi-hub Adapter', '2026-10-12', 'receipt_amazon_cables.pdf', '/uploads/receipts/demo_cables.pdf', 'approved'),
(4, 3, 1420.00, 'USD', 'Conference & Travel', 'Fintech World Forum 2026 - Registration Pass', '2026-10-10', 'receipt_conference.pdf', '/uploads/receipts/demo_conference.pdf', 'rejected');

-- 6. DEMO EXPENSE APPROVAL NOTES
INSERT INTO expense_approvals (expense_id, admin_user_id, action, notes) VALUES
(2, 4, 'approved', 'Authorized per Department Travel & Entertainment budget guidelines.'),
(3, 4, 'approved', 'Hardware purchase verified for remote workstation setup.'),
(4, 4, 'rejected', 'Conference exceeds individual departmental allowance without prior VP sign-off.');

-- 7. AUDIT LOGS
INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, ip_address, details_json) VALUES
(4, 'SYSTEM_STARTUP', 'PLATFORM', 'fivpay-core-1', '127.0.0.1', '{"version": "1.0.0", "environment": "sandbox"}'),
(4, 'EXPENSE_APPROVED', 'EXPENSE', '2', '127.0.0.1', '{"amount": 185.00, "staff_id": 3}'),
(4, 'EXPENSE_REJECTED', 'EXPENSE', '4', '127.0.0.1', '{"amount": 1420.00, "reason": "Allowance exceeded"}');

-- 8. NOTIFICATIONS
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(1, 'Payment Received', 'You received $4,500.00 from Stripe Payout Settlement.', 'success', 0),
(1, 'Security Checkpoint', 'New login verified from IP 127.0.0.1 on Windows.', 'info', 1),
(3, 'Expense Status Updated', 'Your expense #2 for $185.00 was approved by Marcus Vance.', 'success', 0);
