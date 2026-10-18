from flask import Blueprint, request, jsonify, g
from backend.app.models.models import db, User, Account, Transaction, Expense, AuditLog
from backend.app.middleware.auth import login_required, role_required

admin_bp = Blueprint("admin_bp", __name__)

@admin_bp.get("/users")
@login_required
@role_required("admin")
def list_all_users():
    users = User.query.order_by(User.created_at.desc()).all()
    user_data = []

    for u in users:
        acc = Account.query.filter_by(user_id=u.id).first()
        user_dict = u.to_dict()
        user_dict["account_number"] = acc.account_number if acc else "N/A"
        user_dict["balance"] = float(acc.balance) if acc else 0.00
        user_dict["currency"] = acc.currency if acc else "USD"
        user_data.append(user_dict)

    return jsonify({"users": user_data, "total": len(user_data)}), 200


@admin_bp.patch("/users/<int:user_id>/status")
@login_required
@role_required("admin")
def toggle_user_status(user_id):
    admin_user = g.current_user
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User account not found"}), 404

    if user.id == admin_user.id:
        return jsonify({"error": "Administrators cannot suspend their own session account"}), 400

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if not new_status:
        new_status = "suspended" if user.status == "active" else "active"

    user.status = new_status

    audit = AuditLog(
        actor_user_id=admin_user.id,
        action="USER_STATUS_CHANGE",
        resource_type="USER",
        resource_id=str(user.id),
        ip_address=request.remote_addr,
        details_json=f'{{"target_user": "{user.email}", "new_status": "{new_status}"}}'
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": f"User '{user.name}' status set to {new_status}",
        "user": user.to_dict()
    }), 200


@admin_bp.patch("/users/<int:user_id>/role")
@login_required
@role_required("admin")
def update_user_role(user_id):
    admin_user = g.current_user
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User account not found"}), 404

    data = request.get_json(silent=True) or {}
    new_role = str(data.get("role", "")).strip().lower()

    if new_role not in ["user", "staff", "admin"]:
        return jsonify({"error": "Invalid role. Must be 'user', 'staff', or 'admin'"}), 400

    user.role = new_role

    audit = AuditLog(
        actor_user_id=admin_user.id,
        action="USER_ROLE_CHANGE",
        resource_type="USER",
        resource_id=str(user.id),
        ip_address=request.remote_addr,
        details_json=f'{{"target_user": "{user.email}", "new_role": "{new_role}"}}'
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": f"Role for '{user.name}' updated to {new_role}",
        "user": user.to_dict()
    }), 200


@admin_bp.get("/audit-logs")
@login_required
@role_required("admin")
def list_audit_logs():
    limit = min(int(request.args.get("limit", 50)), 100)
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return jsonify({"audit_logs": [log.to_dict() for log in logs]}), 200


@admin_bp.get("/metrics")
@login_required
@role_required("admin")
def get_platform_metrics():
    total_users = User.query.count()
    active_users = User.query.filter_by(status="active").count()
    total_accounts = Account.query.count()
    total_tx_count = Transaction.query.count()
    pending_expenses = Expense.query.filter_by(status="pending").count()

    # Aggregate volumes
    total_volume_query = db.session.query(db.func.sum(Transaction.amount)).scalar()
    total_volume = float(total_volume_query) if total_volume_query else 0.00

    total_reserve_query = db.session.query(db.func.sum(Account.balance)).scalar()
    total_reserve = float(total_reserve_query) if total_reserve_query else 0.00

    return jsonify({
        "metrics": {
            "total_users": total_users,
            "active_users": active_users,
            "total_accounts": total_accounts,
            "total_transactions": total_tx_count,
            "pending_expenses": pending_expenses,
            "total_volume_usd": total_volume,
            "total_reserve_usd": total_reserve,
            "system_status": "Healthy (All Rails Operational)"
        }
    }), 200
