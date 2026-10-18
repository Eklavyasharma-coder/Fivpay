import uuid
from flask import Blueprint, request, jsonify, g
from backend.app.models.models import db, User, Account, AuditLog
from backend.app.middleware.auth import login_required, generate_token

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    role = str(data.get("role", "user")).strip().lower()
    department = str(data.get("department", "Retail")).strip()

    if len(name) < 2:
        return jsonify({"error": "Full name must be at least 2 characters"}), 400
    if len(email) < 5 or "@" not in email:
        return jsonify({"error": "Please provide a valid email address"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400

    if role not in ["user", "staff", "admin"]:
        role = "user"

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

        # Create primary USD account with initial sandbox balance for testing
        acc_num = f"FP-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[4:8].upper()}-99"
        account = Account(
            user_id=user.id,
            account_number=acc_num,
            currency="USD",
            balance=10000.00 if role == "user" else 5000.00,
            status="active"
        )
        db.session.add(account)

        # Log audit record
        audit = AuditLog(
            actor_user_id=user.id,
            action="USER_REGISTRATION",
            resource_type="USER",
            resource_id=str(user.id),
            ip_address=request.remote_addr,
            details_json=f'{{"email": "{email}", "role": "{role}"}}'
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
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password credentials"}), 401

    if user.status == "suspended":
        return jsonify({"error": "Account is suspended. Please contact FivPay compliance."}), 403

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
