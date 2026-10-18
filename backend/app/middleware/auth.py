import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g, current_app
from backend.app.models.models import User, Account

def generate_token(user_id, role, email):
    now = datetime.now(timezone.utc)
    expires = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", timedelta(hours=12))
    payload = {
        "sub": str(user_id),
        "role": str(role),
        "email": str(email),
        "iat": now,
        "exp": now + expires
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")

def decode_token(token):
    try:
        return jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
    except Exception as e:
        return None

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1].strip()

        if not token:
            return jsonify({"error": "Authentication token is missing. Please log in."}), 401

        payload = decode_token(token)
        if not payload or not payload.get("sub"):
            return jsonify({"error": "Session token has expired or is invalid. Please log in again."}), 401

        try:
            user_id = int(payload["sub"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid token subject identifier"}), 401

        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": "User account associated with this token not found."}), 401

        if user.status == "suspended":
            return jsonify({"error": "This account is currently suspended. Contact support."}), 403

        g.current_user = user
        g.current_account = Account.query.filter_by(user_id=user.id).first()
        return f(*args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated(*args, **kwargs):
            if g.current_user.role not in allowed_roles:
                return jsonify({
                    "error": f"Access forbidden. This action requires role: {', '.join(allowed_roles)}. You are '{g.current_user.role}'."
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
