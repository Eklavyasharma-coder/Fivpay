import uuid
from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from backend.app.models.models import db, Account, Transaction, User, AuditLog
from backend.app.middleware.auth import login_required
from backend.app.services.payment_provider import PaymentProviderAdapter

tx_bp = Blueprint("tx_bp", __name__)

@tx_bp.get("")
@login_required
def list_transactions():
    user = g.current_user
    account = g.current_account

    if not account:
        return jsonify({"transactions": [], "total": 0}), 200

    query = Transaction.query

    # Admin with ?all=true can view the entire system ledger
    show_all = request.args.get("all", "false").lower() == "true" and user.role == "admin"

    if not show_all:
        query = query.filter(
            (Transaction.sender_account_id == account.id) |
            (Transaction.receiver_account_id == account.id)
        )

    # Optional Filters
    category = request.args.get("category")
    if category and category.lower() != "all":
        query = query.filter(Transaction.category.ilike(category))

    search = request.args.get("search", "").strip()
    if search:
        query = query.filter(
            (Transaction.reference.ilike(f"%{search}%")) |
            (Transaction.note.ilike(f"%{search}%")) |
            (Transaction.category.ilike(f"%{search}%"))
        )

    query = query.order_by(Transaction.created_at.desc())

    limit = min(int(request.args.get("limit", 50)), 100)
    offset = int(request.args.get("offset", 0))

    total = query.count()
    records = query.offset(offset).limit(limit).all()

    tx_list = [tx.to_dict(current_account_id=account.id if not show_all else None) for tx in records]

    return jsonify({
        "transactions": tx_list,
        "total": total,
        "limit": limit,
        "offset": offset
    }), 200


@tx_bp.post("/transfer")
@login_required
def make_transfer():
    sender_user = g.current_user
    sender_account = g.current_account

    if not sender_account:
        return jsonify({"error": "No active wallet account associated with your profile"}), 400

    data = request.get_json(silent=True) or {}
    recipient_identifier = str(data.get("recipient", "")).strip()
    note = str(data.get("note", "")).strip()[:200]
    category = str(data.get("category", "Transfer")).strip()
    idempotency_key = request.headers.get("Idempotency-Key") or data.get("idempotency_key")

    try:
        amount = Decimal(str(data.get("amount", 0)))
    except Exception:
        return jsonify({"error": "Invalid numerical amount format"}), 400

    if amount <= Decimal("0.00"):
        return jsonify({"error": "Transfer amount must be strictly greater than $0.00"}), 400

    # 1. Idempotency Check
    if idempotency_key:
        existing = Transaction.query.filter_by(idempotency_key=idempotency_key).first()
        if existing:
            return jsonify({
                "message": "Duplicate request detected: returning existing settled transaction",
                "transaction": existing.to_dict(current_account_id=sender_account.id),
                "is_duplicate": True
            }), 200

    # 2. Find Recipient Account (by Account Number or Email)
    receiver_account = None
    if "@" in recipient_identifier:
        rec_user = User.query.filter_by(email=recipient_identifier.lower()).first()
        if rec_user:
            receiver_account = Account.query.filter_by(user_id=rec_user.id).first()
    else:
        receiver_account = Account.query.filter_by(account_number=recipient_identifier).first()

    if not receiver_account:
        return jsonify({"error": f"Recipient '{recipient_identifier}' not found on FivPay network"}), 404

    if receiver_account.id == sender_account.id:
        return jsonify({"error": "Cannot transfer funds to your own source account"}), 400

    # 3. Available Balance Check
    if sender_account.balance < amount:
        return jsonify({
            "error": f"Insufficient available balance. Available: ${sender_account.balance:,.2f}"
        }), 400

    # 4. Execute Atomic Double-Entry Settlement
    try:
        sender_account.balance -= amount
        receiver_account.balance += amount

        reference = f"FP-TX-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[4:8].upper()}"

        tx = Transaction(
            reference=reference,
            sender_account_id=sender_account.id,
            receiver_account_id=receiver_account.id,
            amount=amount,
            fee=Decimal("0.00"),
            currency=sender_account.currency,
            category=category,
            note=note or f"Payment to {receiver_account.owner.name}",
            type="transfer",
            status="completed",
            idempotency_key=idempotency_key
        )
        db.session.add(tx)

        # Audit log for transfer
        audit = AuditLog(
            actor_user_id=sender_user.id,
            action="TRANSFER_EXECUTED",
            resource_type="TRANSACTION",
            resource_id=reference,
            ip_address=request.remote_addr,
            details_json=f'{{"amount": {float(amount)}, "recipient": "{receiver_account.account_number}"}}'
        )
        db.session.add(audit)
        db.session.commit()

        return jsonify({
            "message": "Payment authorized and settled successfully",
            "transaction": tx.to_dict(current_account_id=sender_account.id),
            "new_balance": float(sender_account.balance)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to execute financial settlement: {str(e)}"}), 500
