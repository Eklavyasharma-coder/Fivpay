import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "fivpay-core-secret-key-development-2026")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fivpay-jwt-secure-signing-key-2026")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)

    # Database Configuration (MySQL Primary with robust local SQLite fallback)
    MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.environ.get("MYSQL_PORT", 3306))
    MYSQL_USER = os.environ.get("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "")
    MYSQL_DB = os.environ.get("MYSQL_DB", "fivpay")

    # SQLAlchemy Database URI builder
    if os.environ.get("DATABASE_URL"):
        SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    elif MYSQL_PASSWORD:
        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
            "?charset=utf8mb4"
        )
    else:
        # Default local SQLite database file in backend/instance/fivpay.db
        base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
        instance_dir = os.path.join(base_dir, "instance")
        os.makedirs(instance_dir, exist_ok=True)
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(instance_dir, 'fivpay.db')}"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
    } if not SQLALCHEMY_DATABASE_URI.startswith("sqlite") else {}

    # Uploads directory
    UPLOAD_FOLDER = os.path.join(
        os.path.abspath(os.path.dirname(os.path.dirname(__file__))),
        "uploads",
        "receipts"
    )
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload

    # Payment Provider Gateway Settings
    PAYMENT_GATEWAY_MODE = os.environ.get("PAYMENT_GATEWAY_MODE", "sandbox")  # sandbox | live | mock
    PAYMENT_GATEWAY_API_KEY = os.environ.get("PAYMENT_GATEWAY_API_KEY", "")
    PAYMENT_GATEWAY_WEBHOOK_SECRET = os.environ.get("PAYMENT_GATEWAY_WEBHOOK_SECRET", "")

    # CORS Allowed Origins
    cors_env = os.environ.get("CORS_ALLOWED_ORIGINS", "")
    if cors_env:
        CORS_ORIGINS = [orig.strip() for orig in cors_env.split(",") if orig.strip()]
    else:
        CORS_ORIGINS = [
            "http://localhost:4000",
            "http://127.0.0.1:4000",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ]

