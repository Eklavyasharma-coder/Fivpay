import uuid
from flask import Blueprint, request, jsonify, g
from backend.app.models.models import db, User, Account, AuditLog
from backend.app.middleware.auth import login_required, generate_token
from backend.app.middleware.rate_limiter import rate_limit, reset_rate_limit

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.post("/register")
@rate_limit(max_attempts=6, window_seconds=60)
def register():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    # SECURITY: Public registration is strictly restricted to regular 'user' role
    # Staff and Admin roles MUST be provisioned by an administrator or server-side CLI
    role = "user"
    department = str(data.get("department", "Retail Client")).strip()

    if len(name) < 2 or len(name) > 80:
        return jsonify({"error": "Full name must be between 2 and 80 characters"}), 400
    if len(email) < 5 or "@" not in email or "." not in email:
        return jsonify({"error": "Please provide a valid email address"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email address already exists"}), 409

    try:
        user = User(
            uuid=str(uuid.uuid4()),
            name=name,
            email=email,
            role=role,
            status="active",
            department=department
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        # Allocate primary wallet account with initial sandbox credit
        acc_num = f"FP-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[4:8].upper()}-99"
        account = Account(
            user_id=user.id,
            account_number=acc_num,
            currency="USD",
            balance=10000.00,
            status="active"
        )
        db.session.add(account)

        audit = AuditLog(
            actor_user_id=user.id,
            action="USER_REGISTRATION",
            resource_type="USER",
            resource_id=str(user.id),
            ip_address=request.remote_addr,
            details_json=f'{{"email": "{email}", "role": "user"}}'
        )
        db.session.add(audit)
        db.session.commit()

        token = generate_token(user.id, user.role, user.email)
        return jsonify({
            "message": "Account created successfully",
            "token": token,
            "user": user.to_dict(),
            "account": account.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to complete registration: {str(e)}"}), 500


@auth_bp.post("/login")
@rate_limit(max_attempts=5, window_seconds=60)
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        # Generic error message to prevent account enumeration
        return jsonify({"error": "Invalid email or password credentials"}), 401

    if user.status == "suspended":
        return jsonify({"error": "Account is suspended. Please contact FivPay compliance."}), 403

    # Reset rate limiter upon successful authentication
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
    reset_rate_limit(request.endpoint, ip)

    token = generate_token(user.id, user.role, user.email)
    account = Account.query.filter_by(user_id=user.id).first()

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict(),
        "account": account.to_dict() if account else None
    }), 200


@auth_bp.get("/me")
@login_required
def get_current_user_profile():
    account = Account.query.filter_by(user_id=g.current_user.id).first()
    return jsonify({
        "user": g.current_user.to_dict(),
        "account": account.to_dict() if account else None
    }), 200


@auth_bp.post("/logout")
@login_required
def logout():
    return jsonify({"message": "Successfully logged out"}), 200
