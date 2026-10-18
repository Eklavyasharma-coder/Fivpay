from datetime import datetime
from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from backend.app.models.models import db, Expense, ExpenseApproval, Notification, AuditLog
from backend.app.middleware.auth import login_required, role_required

expense_bp = Blueprint("expense_bp", __name__)

@expense_bp.get("")
@login_required
@role_required("staff", "admin")
def list_expenses():
    user = g.current_user
    query = Expense.query

    # Staff only see their own company expense submissions
    if user.role == "staff":
        query = query.filter_by(staff_user_id=user.id)

    # Optional status filter (e.g. ?status=pending)
    status_filter = request.args.get("status")
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Expense.status == status_filter.lower())

    expenses = query.order_by(Expense.created_at.desc()).all()
    return jsonify({
        "expenses": [e.to_dict() for e in expenses],
        "count": len(expenses)
    }), 200


@expense_bp.post("")
@login_required
@role_required("staff", "admin")
def submit_expense():
    user = g.current_user
    data = request.get_json(silent=True) or {}

    try:
        amount = Decimal(str(data.get("amount", 0)))
    except Exception:
        return jsonify({"error": "Invalid expense amount specified"}), 400

    if amount <= Decimal("0.00"):
        return jsonify({"error": "Expense amount must be greater than $0.00"}), 400

    category = str(data.get("category", "")).strip()
    description = str(data.get("description", "")).strip()
    date_str = str(data.get("expense_date", "")).strip()
    receipt_filename = str(data.get("receipt_filename", "")).strip() or "receipt_attached.pdf"

    if not category:
        return jsonify({"error": "Expense category is required"}), 400
    if not description or len(description) < 5:
        return jsonify({"error": "A detailed business justification description is required"}), 400

    try:
        exp_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else datetime.utcnow().date()
    except ValueError:
        exp_date = datetime.utcnow().date()

    try:
        expense = Expense(
            staff_user_id=user.id,
            amount=amount,
            currency="USD",
            category=category,
            description=description,
            expense_date=exp_date,
            receipt_filename=receipt_filename,
            receipt_url=f"/uploads/receipts/{receipt_filename}",
            status="pending"
        )
        db.session.add(expense)

        audit = AuditLog(
            actor_user_id=user.id,
            action="EXPENSE_SUBMITTED",
            resource_type="EXPENSE",
            resource_id=str(expense.id),
            ip_address=request.remote_addr,
            details_json=f'{{"amount": {float(amount)}, "category": "{category}"}}'
        )
        db.session.add(audit)
        db.session.commit()

        return jsonify({
            "message": "Business expense submitted successfully for administrative review",
            "expense": expense.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to submit expense: {str(e)}"}), 500


@expense_bp.post("/<int:expense_id>/approve")
@login_required
@role_required("admin")
def review_expense(expense_id):
    admin_user = g.current_user
    data = request.get_json(silent=True) or {}
    action = str(data.get("action", "")).strip().lower() # 'approved' or 'rejected'
    notes = str(data.get("notes", "")).strip()

    if action not in ["approved", "rejected"]:
        return jsonify({"error": "Action must be either 'approved' or 'rejected'"}), 400

    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"error": "Expense record not found"}), 404

    try:
        expense.status = action

        approval = ExpenseApproval(
            expense_id=expense.id,
            admin_user_id=admin_user.id,
            action=action,
            notes=notes or f"Reviewed by {admin_user.name}"
        )
        db.session.add(approval)

        # Notify the staff member
        notif = Notification(
            user_id=expense.staff_user_id,
            title=f"Expense #{expense.id} {action.capitalize()}",
            message=f"Your expense for ${expense.amount:,.2f} ({expense.category}) was {action} by {admin_user.name}. Note: {notes or 'No notes provided.'}",
            type="success" if action == "approved" else "warning"
        )
        db.session.add(notif)

        # Audit log
        audit = AuditLog(
            actor_user_id=admin_user.id,
            action=f"EXPENSE_{action.upper()}",
            resource_type="EXPENSE",
            resource_id=str(expense.id),
            ip_address=request.remote_addr,
            details_json=f'{{"action": "{action}", "notes": "{notes}"}}'
        )
        db.session.add(audit)
        db.session.commit()

        return jsonify({
            "message": f"Expense #{expense.id} has been marked as {action}",
            "expense": expense.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to process expense review: {str(e)}"}), 500
