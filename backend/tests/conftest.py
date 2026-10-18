import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.app.config import Config
from backend.app.models.models import db, User, Account

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-jwt-secret-key-that-is-at-least-32-characters-long-fivpay-secure"
    SECRET_KEY = "test-flask-secret-key-that-is-at-least-32-characters-long-fivpay-secure"

@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def runner(app):
    return app.test_cli_runner()

import uuid
from backend.app.middleware.auth import generate_token

@pytest.fixture
def auth_headers(app):
    """Helper that creates user and returns JWT header with appropriate role"""
    def _get_headers(role="user", email="user@test.com", password="password123"):
        with app.app_context():
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(
                    uuid=str(uuid.uuid4()),
                    name=f"Test {role.capitalize()}",
                    email=email,
                    role=role,
                    status="active",
                    department="Engineering"
                )
                user.set_password(password)
                db.session.add(user)
                db.session.flush()
                acc = Account(
                    user_id=user.id,
                    account_number=f"FP-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[4:8].upper()}-99",
                    currency="USD",
                    balance=10000.00,
                    status="active"
                )
                db.session.add(acc)
                db.session.commit()
            token = generate_token(user.id, user.role, user.email)
            return {"Authorization": f"Bearer {token}"}
    return _get_headers
