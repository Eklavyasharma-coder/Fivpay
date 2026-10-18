"""
FivPay - Secure Server-Side Administrator Bootstrap Utility
Use this CLI script to securely provision the initial administrator account.
Never expose administrator account creation over public web forms.

Usage:
    python backend/bootstrap_admin.py
    or:
    python backend/bootstrap_admin.py --email admin@fivpay.com --name "Marcus Vance" --password "YourStrongPassword123"
"""

import sys
import os
import argparse
import getpass
import uuid

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app import create_app
from backend.app.models.models import db, User, Account, AuditLog

def bootstrap_admin(email, name, password, department="Global Platform Infrastructure"):
    app = create_app()
    with app.app_context():
        email_clean = email.strip().lower()
        if len(password) < 8:
            print("ERROR: Password must be at least 8 characters long.")
            return False

        existing_user = User.query.filter_by(email=email_clean).first()
        if existing_user:
            existing_user.name = name.strip()
            existing_user.role = "admin"
            existing_user.status = "active"
            existing_user.set_password(password)
            db.session.commit()
            print(f"[OK] Existing account '{email_clean}' has been upgraded to ADMIN role and password updated.")
            return True

        admin_user = User(
            uuid=str(uuid.uuid4()),
            name=name.strip(),
            email=email_clean,
            role="admin",
            status="active",
            department=department
        )
        admin_user.set_password(password)
        db.session.add(admin_user)
        db.session.flush()

        # Create Treasury Account
        acc = Account(
            user_id=admin_user.id,
            account_number=f"FP-ADMIN-TREASURY-{uuid.uuid4().hex[:4].upper()}",
            currency="USD",
            balance=250000.00,
            status="active"
        )
        db.session.add(acc)

        audit = AuditLog(
            actor_user_id=admin_user.id,
            action="ADMIN_BOOTSTRAPPED_CLI",
            resource_type="USER",
            resource_id=str(admin_user.id),
            details_json=f'{{"email": "{email_clean}", "source": "CLI_BOOTSTRAP"}}'
        )
        db.session.add(audit)
        db.session.commit()

        print("\n" + "=" * 60)
        print(" [SUCCESS] Administrator Account Provisioned Successfully")
        print("=" * 60)
        print(f" Name:     {admin_user.name}")
        print(f" Email:    {admin_user.email}")
        print(f" Role:     {admin_user.role}")
        print(f" Account:  {acc.account_number}")
        print("=" * 60 + "\n")
        return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bootstrap FivPay Administrator Account")
    parser.add_argument("--email", help="Administrator email address")
    parser.add_argument("--name", help="Administrator full name")
    parser.add_argument("--password", help="Administrator password")

    args = parser.parse_args()

    email = args.email or input("Enter Administrator Email: ").strip()
    name = args.name or input("Enter Administrator Full Name: ").strip()
    password = args.password or getpass.getpass("Enter Administrator Password (min 8 chars): ")

    bootstrap_admin(email, name, password)
