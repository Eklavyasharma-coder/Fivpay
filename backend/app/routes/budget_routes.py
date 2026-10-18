from decimal import Decimal
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from backend.app.models.models import db, Budget
from backend.app.middleware.auth import login_required

budget_bp = Blueprint("budget_bp", __name__)

@budget_bp.get("")
@login_required
def get_budgets():
    user = g.current_user
    now = datetime.utcnow()
    budgets = Budget.query.filter_by(
        user_id=user.id,
        period_month=now.month,
        period_year=now.year
    ).all()

    # If no budgets set for current month, return all user budgets
    if not budgets:
        budgets = Budget.query.filter_by(user_id=user.id).all()

    return jsonify({"budgets": [b.to_dict() for b in budgets]}), 200


@budget_bp.post("")
@login_required
def create_budget():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    category = str(data.get("category", "")).strip()
    color_hex = str(data.get("color_hex", "#0D9488")).strip()

    try:
        allocated = Decimal(str(data.get("allocated_amount", 0)))
    except Exception:
        return jsonify({"error": "Invalid allocated amount format"}), 400

    if not category:
        return jsonify({"error": "Budget category name is required"}), 400
    if allocated <= Decimal("0.00"):
        return jsonify({"error": "Allocated budget amount must be greater than $0.00"}), 400

    now = datetime.utcnow()
    budget = Budget(
        user_id=user.id,
        category=category,
        allocated_amount=allocated,
        spent_amount=Decimal("0.00"),
        period_month=now.month,
        period_year=now.year,
        color_hex=color_hex
    )
    db.session.add(budget)
    db.session.commit()

    return jsonify({
        "message": f"Monthly budget for '{category}' created",
        "budget": budget.to_dict()
    }), 201


@budget_bp.delete("/<int:budget_id>")
@login_required
def delete_budget(budget_id):
    user = g.current_user
    budget = Budget.query.filter_by(id=budget_id, user_id=user.id).first()
    if not budget:
        return jsonify({"error": "Budget not found or unauthorized"}), 404

    db.session.delete(budget)
    db.session.commit()
    return jsonify({"message": "Budget deleted successfully"}), 200
