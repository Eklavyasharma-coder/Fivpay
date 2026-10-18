import uuid
from datetime import datetime
from decimal import Decimal
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user', index=True) # 'user', 'staff', 'admin'
    status = db.Column(db.String(20), nullable=False, default='active') # 'active', 'suspended', 'pending_kyc'
    department = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    accounts = db.relationship('Account', backref='owner', lazy=True, cascade='all, delete-orphan')
    budgets = db.relationship('Budget', backref='user', lazy=True, cascade='all, delete-orphan')
    expenses = db.relationship('Expense', backref='staff_member', lazy=True, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='recipient', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "uuid": self.uuid,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "status": self.status,
            "department": self.department,
            "phone": self.phone,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Account(db.Model):
    __tablename__ = 'accounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    account_number = db.Column(db.String(32), unique=True, nullable=False, index=True)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    balance = db.Column(db.Numeric(18, 2), nullable=False, default=Decimal('0.00'))
    daily_limit = db.Column(db.Numeric(18, 2), nullable=False, default=Decimal('50000.00'))
    status = db.Column(db.String(20), nullable=False, default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "account_number": self.account_number,
            "currency": self.currency,
            "balance": float(self.balance),
            "daily_limit": float(self.daily_limit),
            "status": self.status
        }


class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    reference = db.Column(db.String(64), unique=True, nullable=False, index=True)
    sender_account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False, index=True)
    receiver_account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    fee = db.Column(db.Numeric(18, 2), nullable=False, default=Decimal('0.00'))
    currency = db.Column(db.String(3), nullable=False, default='USD')
    category = db.Column(db.String(50), nullable=False, default='Transfer')
    note = db.Column(db.String(255), default='')
    type = db.Column(db.String(20), nullable=False, default='transfer') # 'transfer', 'payment', 'deposit'
    status = db.Column(db.String(20), nullable=False, default='completed') # 'completed', 'pending', 'flagged', 'failed'
    idempotency_key = db.Column(db.String(128), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    sender_account = db.relationship('Account', foreign_keys=[sender_account_id], backref='sent_transactions')
    receiver_account = db.relationship('Account', foreign_keys=[receiver_account_id], backref='received_transactions')

    def to_dict(self, current_account_id=None):
        is_incoming = current_account_id is not None and self.receiver_account_id == current_account_id
        return {
            "id": self.id,
            "reference": self.reference,
            "sender_account_id": self.sender_account_id,
            "receiver_account_id": self.receiver_account_id,
            "sender_name": self.sender_account.owner.name if self.sender_account and self.sender_account.owner else "External",
            "receiver_name": self.receiver_account.owner.name if self.receiver_account and self.receiver_account.owner else "External",
            "amount": float(self.amount),
            "fee": float(self.fee),
            "currency": self.currency,
            "category": self.category,
            "note": self.note,
            "type": "in" if is_incoming else "out",
            "transaction_type": self.type,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else None
        }


class PaymentRequest(db.Model):
    __tablename__ = 'payment_requests'

    id = db.Column(db.Integer, primary_key=True)
    reference = db.Column(db.String(64), unique=True, nullable=False, index=True)
    creator_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    note = db.Column(db.String(255), default='')
    qr_payload = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending') # 'pending', 'completed', 'expired', 'cancelled'
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship('User', backref='payment_requests')

    def to_dict(self):
        return {
            "id": self.id,
            "reference": self.reference,
            "creator_user_id": self.creator_user_id,
            "creator_name": self.creator.name if self.creator else None,
            "amount": float(self.amount),
            "currency": self.currency,
            "note": self.note,
            "qr_payload": self.qr_payload,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Budget(db.Model):
    __tablename__ = 'budgets'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False)
    allocated_amount = db.Column(db.Numeric(18, 2), nullable=False)
    spent_amount = db.Column(db.Numeric(18, 2), nullable=False, default=Decimal('0.00'))
    period_month = db.Column(db.Integer, nullable=False)
    period_year = db.Column(db.Integer, nullable=False)
    color_hex = db.Column(db.String(10), default='#0D9488')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        allocated = float(self.allocated_amount)
        spent = float(self.spent_amount)
        percentage = round((spent / allocated * 100), 1) if allocated > 0 else 0
        return {
            "id": self.id,
            "user_id": self.user_id,
            "category": self.category,
            "allocated_amount": allocated,
            "spent_amount": spent,
            "remaining_amount": round(allocated - spent, 2),
            "percentage": percentage,
            "color_hex": self.color_hex,
            "period": f"{self.period_year}-{self.period_month:02d}"
        }


class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    staff_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    category = db.Column(db.String(60), nullable=False)
    description = db.Column(db.Text, nullable=False)
    expense_date = db.Column(db.Date, nullable=False)
    receipt_filename = db.Column(db.String(255), nullable=True)
    receipt_url = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='pending', index=True) # 'pending', 'approved', 'rejected', 'paid'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    approvals = db.relationship('ExpenseApproval', backref='expense', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            "id": self.id,
            "staff_user_id": self.staff_user_id,
            "staff_name": self.staff_member.name if self.staff_member else "Unknown",
            "department": self.staff_member.department if self.staff_member else "General",
            "amount": float(self.amount),
            "currency": self.currency,
            "category": self.category,
            "description": self.description,
            "expense_date": self.expense_date.strftime("%Y-%m-%d") if self.expense_date else None,
            "receipt_filename": self.receipt_filename,
            "receipt_url": self.receipt_url,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else None
        }


class ExpenseApproval(db.Model):
    __tablename__ = 'expense_approvals'

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expenses.id', ondelete='CASCADE'), nullable=False, index=True)
    admin_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(20), nullable=False) # 'approved', 'rejected'
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    admin = db.relationship('User', foreign_keys=[admin_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "admin_name": self.admin.name if self.admin else "Admin",
            "action": self.action,
            "notes": self.notes,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else None
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    actor_user_id = db.Column(db.Integer, nullable=True, index=True)
    action = db.Column(db.String(100), nullable=False, index=True)
    resource_type = db.Column(db.String(50), nullable=False)
    resource_id = db.Column(db.String(100), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    details_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "actor_user_id": self.actor_user_id,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "ip_address": self.ip_address,
            "details": self.details_json,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(120), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), nullable=False, default='info') # 'info', 'success', 'warning', 'alert'
    is_read = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "is_read": self.is_read,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else None
        }
