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

@pytest.fixture
def auth_headers(client):
    """Helper that creates user and returns JWT header"""
    def _get_headers(role="user", email="user@test.com", password="password123"):
        # Register or get user
        res = client.post("/api/auth/register", json={
            "name": f"Test {role.capitalize()}",
            "email": email,
            "password": password,
            "role": role
        })
        token = res.get_json()["token"]
        return {"Authorization": f"Bearer {token}"}
    return _get_headers
