import urllib.parse
import uuid
import re

class QRService:
    """
    Handles FivPay Payment QR encoding and multi-rail payload validation
    including standard UPI QR parsing (pa, pn, am, tn, cu).
    """

    @staticmethod
    def generate_payment_request_payload(account_number, payee_name, amount=None, note=None, currency="USD"):
        ref = f"REQ-{uuid.uuid4().hex[:10].upper()}"
        params = {
            "protocol": "fivpay",
            "acc": account_number,
            "name": payee_name,
            "currency": currency,
            "ref": ref
        }
        if amount and float(amount) > 0:
            params["am"] = f"{float(amount):.2f}"
        if note:
            params["note"] = note

        query_str = urllib.parse.urlencode(params)
        return f"fivpay://pay?{query_str}", ref

    @staticmethod
    def parse_payload(raw_string):
        """
        Parses and validates scanned QR strings.
        Supports:
        1. FivPay Native: fivpay://pay?acc=...&name=...&am=...
        2. UPI URI: upi://pay?pa=...&pn=...&am=...&tn=...&cu=...
        """
        if not raw_string or not isinstance(raw_string, str):
            return {"valid": False, "error": "Empty or invalid QR code content"}

        raw_trimmed = raw_string.strip()

        # 1. Native FivPay Rail
        if raw_trimmed.startswith("fivpay://pay"):
            parsed = urllib.parse.urlparse(raw_trimmed)
            params = urllib.parse.parse_qs(parsed.query)

            acc = params.get("acc", [None])[0]
            name = params.get("name", ["FivPay Recipient"])[0]
            am = params.get("am", [None])[0]
            note = params.get("note", [""])[0]
            currency = params.get("currency", ["USD"])[0]
            ref = params.get("ref", [""])[0]

            if not acc:
                return {"valid": False, "error": "QR code does not contain a recipient account number"}

            return {
                "valid": True,
                "rail": "fivpay_native",
                "recipient_account": acc,
                "payee_name": name,
                "amount": float(am) if am else None,
                "currency": currency,
                "note": note,
                "reference": ref,
                "is_upi": False,
                "description": f"Verified FivPay Peer Account ({acc})"
            }

        # 2. UPI Payment Rail Detection
        elif raw_trimmed.startswith("upi://pay"):
            parsed = urllib.parse.urlparse(raw_trimmed)
            params = urllib.parse.parse_qs(parsed.query)

            pa = params.get("pa", [None])[0] # Payee VPA
            pn = params.get("pn", ["UPI Payee"])[0] # Payee Name
            am = params.get("am", [None])[0] # Amount
            tn = params.get("tn", ["UPI Payment"])[0] # Transaction Note
            cu = params.get("cu", ["INR"])[0] # Currency

            if not pa:
                return {"valid": False, "error": "Invalid UPI QR: Payee VPA ('pa') is missing"}

            # Basic VPA format check (e.g., username@bank)
            if not re.match(r"^[\w\.\-]+@[\w\-]+$", pa):
                return {"valid": False, "error": f"Invalid UPI Payee VPA format: '{pa}'"}

            return {
                "valid": True,
                "rail": "upi_external",
                "recipient_account": pa,
                "payee_name": pn,
                "amount": float(am) if am else None,
                "currency": cu,
                "note": tn,
                "reference": f"UPI-{uuid.uuid4().hex[:8].upper()}",
                "is_upi": True,
                "warning": "UPI QR detected. FivPay will simulate settlement via partner UPI gateway.",
                "description": f"UPI VPA: {pa} ({pn})"
            }

        # Unsupported or plain text fallback
        return {
            "valid": False,
            "error": "Unrecognized QR code format. Please scan a valid FivPay or supported UPI QR code."
        }
