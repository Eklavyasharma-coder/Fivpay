import os
from datetime import datetime, timezone
from flask import Flask, jsonify
from flask_cors import CORS
from backend.app.config import Config
from backend.app.models.models import db, User, Account, Transaction, Budget, Expense, AuditLog

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize CORS with configurable origins
    cors_origins = app.config.get("CORS_ORIGINS", [
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ])
    CORS(app, resources={
        r"/api/*": {
            "origins": cors_origins,
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "Idempotency-Key"],
            "supports_credentials": True
        }
    })

    # Security Headers Middleware
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # Initialize SQLAlchemy database engine
    db.init_app(app)

    # Register API Blueprints
    from backend.app.routes.auth_routes import auth_bp
    from backend.app.routes.transaction_routes import tx_bp
    from backend.app.routes.expense_routes import expense_bp
    from backend.app.routes.admin_routes import admin_bp
    from backend.app.routes.budget_routes import budget_bp
    from backend.app.routes.qr_routes import qr_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(tx_bp, url_prefix="/api/transactions")
    app.register_blueprint(expense_bp, url_prefix="/api/expenses")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(budget_bp, url_prefix="/api/budgets")
    app.register_blueprint(qr_bp, url_prefix="/api/qr")

    @app.get("/api/health")
    def health():
        db_status = "connected"
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception as e:
            db_status = f"unreachable ({str(e)})"

        return jsonify({
            "status": "operational",
            "service": "FivPay Core Banking API",
            "version": "1.0.0",
            "database": db_status,
            "database_engine": app.config["SQLALCHEMY_DATABASE_URI"].split("://")[0]
        }), 200

    @app.get("/api/ready")
    def readiness():
        try:
            db.session.execute(db.text("SELECT 1"))
            return jsonify({
                "ready": True,
                "status": "ready",
                "database": "connected"
            }), 200
        except Exception:
            return jsonify({
                "ready": False,
                "status": "unready",
                "database": "unavailable"
            }), 503

    # Auto-initialize database tables and seed demo accounts if empty
    with app.app_context():
        try:
            db.create_all()
            # If no users exist, seed default demo accounts
            if User.query.count() == 0:
                seed_initial_data()
        except Exception as e:
            print(f"[FivPay] Database initialization notice: {e}")

    return app

def seed_initial_data():
    """Seeds baseline demo accounts for immediate review"""
    # Demo User
    user = User(
        uuid="usr-alex-001",
        name="Alex Mercer",
        email="alex.mercer@fivpay.com",
        role="user",
        status="active",
        department="Retail Client"
    )
    user.set_password("demo1234")
    db.session.add(user)
    db.session.flush()

    acc1 = Account(
        user_id=user.id,
        account_number="FP-8829-4102-99",
        currency="USD",
        balance=24850.75,
        status="active"
    )
    db.session.add(acc1)

    # Demo Recipient User
    user2 = User(
        uuid="usr-elena-002",
        name="Elena Rostova",
        email="elena.r@finmail.com",
        role="user",
        status="active",
        department="Retail Client"
    )
    user2.set_password("demo1234")
    db.session.add(user2)
    db.session.flush()

    acc2 = Account(
        user_id=user2.id,
        account_number="FP-1092-7482-11",
        currency="USD",
        balance=8420.00,
        status="active"
    )
    db.session.add(acc2)

    # Demo Staff
    staff = User(
        uuid="stf-sarah-001",
        name="Sarah Jenkins",
        email="sarah.compliance@fivpay.com",
        role="staff",
        status="active",
        department="Finance & Compliance Operations"
    )
    staff.set_password("demo1234")
    db.session.add(staff)
    db.session.flush()

    acc3 = Account(
        user_id=staff.id,
        account_number="FP-CORP-EXPENSE-01",
        currency="USD",
        balance=5000.00,
        status="active"
    )
    db.session.add(acc3)

    # Demo Admin
    admin = User(
        uuid="adm-marcus-001",
        name="Marcus Vance",
        email="marcus.admin@fivpay.com",
        role="admin",
        status="active",
        department="Global Infrastructure & Security"
    )
    admin.set_password("demo1234")
    db.session.add(admin)
    db.session.flush()

    acc4 = Account(
        user_id=admin.id,
        account_number="FP-ADMIN-TREASURY",
        currency="USD",
        balance=250000.00,
        status="active"
    )
    db.session.add(acc4)

    # Initial Transactions
    t1 = Transaction(
        reference="FP-TX-2026-9901",
        sender_account_id=acc2.id,
        receiver_account_id=acc1.id,
        amount=4500.00,
        currency="USD",
        category="Income",
        note="Stripe Global Payout Settlement",
        type="transfer",
        status="completed"
    )
    t2 = Transaction(
        reference="FP-TX-2026-9884",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=1299.00,
        currency="USD",
        category="Electronics",
        note="Apple Store Regent St Hardware",
        type="payment",
        status="completed"
    )
    db.session.add_all([t1, t2])

    # Initial Budgets
    b1 = Budget(user_id=user.id, category="Housing & Utilities", allocated_amount=3500, spent_amount=2450, period_month=10, period_year=2026, color_hex="#0F172A")
    b2 = Budget(user_id=user.id, category="Groceries & Dining", allocated_amount=1200, spent_amount=890, period_month=10, period_year=2026, color_hex="#0D9488")
    b3 = Budget(user_id=user.id, category="Tech & Cloud Software", allocated_amount=800, spent_amount=650, period_month=10, period_year=2026, color_hex="#3B82F6")
    db.session.add_all([b1, b2, b3])

    # Initial Staff Expenses
    e1 = Expense(
        staff_user_id=staff.id,
        amount=340.50,
        currency="USD",
        category="Software Subscription",
        description="Team Datadog Cloud APM License - Monthly",
        expense_date=datetime.now(timezone.utc).date(),
        receipt_filename="receipt_datadog_oct.pdf",
        status="pending"
    )
    e2 = Expense(
        staff_user_id=staff.id,
        amount=185.00,
        currency="USD",
        category="Client Relations",
        description="Working lunch with European liquidity partners",
        expense_date=datetime.now(timezone.utc).date(),
        receipt_filename="receipt_bistro_lunch.pdf",
        status="approved"
    )
    db.session.add_all([e1, e2])

    # Initial Audit Log
    audit = AuditLog(
        actor_user_id=admin.id,
        action="SYSTEM_INITIALIZED",
        resource_type="SYSTEM",
        resource_id="fivpay-core-1",
        details_json='{"status": "sandbox_seeded", "environment": "development"}'
    )
    db.session.add(audit)
    db.session.commit()
    print("[FivPay] Seeded initial demo users (Alex, Elena, Sarah, Marcus) with password: demo1234")
