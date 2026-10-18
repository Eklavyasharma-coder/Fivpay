from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from backend.app.models.models import db, PaymentRequest
from backend.app.middleware.auth import login_required
from backend.app.services.qr_service import QRService
from backend.app.services.payment_provider import PaymentProviderAdapter

qr_bp = Blueprint("qr_bp", __name__)

@qr_bp.post("/generate")
@login_required
def generate_qr():
    user = g.current_user
    account = g.current_account

    if not account:
        return jsonify({"error": "No wallet account found"}), 400

    data = request.get_json(silent=True) or {}
    amount = data.get("amount")
    note = data.get("note", f"Payment to {user.name}")

    payload_str, reference = QRService.generate_payment_request_payload(
        account_number=account.account_number,
        payee_name=user.name,
        amount=amount,
        note=note,
        currency=account.currency
    )

    try:
        amt_decimal = Decimal(str(amount)) if amount else Decimal("0.00")
    except Exception:
        amt_decimal = Decimal("0.00")

    pr = PaymentRequest(
        reference=reference,
        creator_user_id=user.id,
        amount=amt_decimal,
        currency=account.currency,
        note=note,
        qr_payload=payload_str,
        status="pending"
    )
    db.session.add(pr)
    db.session.commit()

    return jsonify({
        "reference": reference,
        "payload": payload_str,
        "account_number": account.account_number,
        "payee_name": user.name,
        "amount": float(amt_decimal) if amt_decimal > 0 else None,
        "currency": account.currency
    }), 201


@qr_bp.post("/decode")
@login_required
def decode_qr():
    data = request.get_json(silent=True) or {}
    raw_payload = data.get("payload", "").strip()

    result = QRService.parse_payload(raw_payload)
    if not result.get("valid"):
        return jsonify({"valid": False, "error": result.get("error", "Invalid QR code")}), 400

    return jsonify(result), 200


@qr_bp.get("/gateway-status")
def gateway_status():
    adapter = PaymentProviderAdapter()
    return jsonify(adapter.get_status()), 200
