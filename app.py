
import os
import sqlite3
from functools import wraps
from flask import (
    Flask, render_template, request, jsonify,
    session, redirect, url_for, g
)
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-change-this")
DATABASE = os.path.join(app.instance_path, "fivpay.db")

os.makedirs(app.instance_path, exist_ok=True)


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(error=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db():
    conn = sqlite3.connect(DATABASE)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            account_no TEXT UNIQUE NOT NULL,
            balance REAL NOT NULL DEFAULT 10000
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            amount REAL NOT NULL CHECK(amount > 0),
            note TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(sender_id) REFERENCES users(id),
            FOREIGN KEY(receiver_id) REFERENCES users(id)
        );
    """)
    conn.commit()
    conn.close()


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            if request.path.startswith("/api/"):
                return jsonify(error="Please log in first"), 401
            return redirect(url_for("index"))
        return fn(*args, **kwargs)
    return wrapper


def current_user():
    return db().execute(
        "SELECT id, name, email, account_no, balance "
        "FROM users WHERE id = ?",
        (session["user_id"],)
    ).fetchone()


@app.route("/")
def index():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))
    return render_template("index.html")


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html")


@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or request.form
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if len(name) < 2 or len(email) < 5 or len(password) < 8:
        return jsonify(error="Enter a name, valid email and password of 8+ characters"), 400

    conn = db()
    try:
        cur = conn.execute(
            """INSERT INTO users(name, email, password, account_no)
               VALUES (?, ?, ?, ?)""",
            (name, email, generate_password_hash(password),
             "FP" + os.urandom(6).hex().upper())
        )
        conn.commit()
        session.clear()
        session["user_id"] = cur.lastrowid
        return jsonify(message="Account created", redirect="/dashboard"), 201
    except sqlite3.IntegrityError:
        return jsonify(error="This email is already registered"), 409


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or request.form
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = db().execute(
        "SELECT id, password FROM users WHERE email = ?", (email,)
    ).fetchone()

    if not user or not check_password_hash(user["password"], password):
        return jsonify(error="Incorrect email or password"), 401

    session.clear()
    session["user_id"] = user["id"]
    return jsonify(message="Login successful", redirect="/dashboard")


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(message="Logged out", redirect="/")


@app.get("/api/me")
@login_required
def me():
    user = current_user()
    return jsonify(dict(user))


@app.patch("/api/profile")
@login_required
def update_profile():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()

    if len(name) < 2 or len(name) > 60:
        return jsonify(error="Name must contain 2–60 characters"), 400

    db().execute(
        "UPDATE users SET name = ? WHERE id = ?",
        (name, session["user_id"])
    )
    db().commit()
    return jsonify(message="Profile updated", name=name)


@app.get("/api/transactions")
@login_required
def transactions():
    user_id = session["user_id"]
    rows = db().execute("""
        SELECT t.id, t.amount, t.note, t.created_at,
               s.name AS sender, r.name AS receiver,
               s.id AS sender_id
        FROM transactions t
        JOIN users s ON s.id = t.sender_id
        JOIN users r ON r.id = t.receiver_id
        WHERE t.sender_id = ? OR t.receiver_id = ?
        ORDER BY t.id DESC LIMIT 100
    """, (user_id, user_id)).fetchall()

    return jsonify([
        {
            **dict(row),
            "type": "received" if row["sender_id"] != user_id else "sent"
        }
        for row in rows
    ])


@app.post("/api/pay")
@login_required
def pay():
    data = request.get_json(silent=True) or {}
    account_no = str(data.get("account_no", "")).strip().upper()
    note = str(data.get("note", "")).strip()[:100]

    try:
        amount = round(float(data.get("amount", 0)), 2)
    except (ValueError, TypeError):
        return jsonify(error="Enter a valid amount"), 400

    if not 1 <= amount <= 100000:
        return jsonify(error="Demo payment limit is ₹1 to ₹100,000"), 400

    conn = db()
    sender_id = session["user_id"]

    if not account_no:
        return jsonify(error="Enter the recipient account number"), 400

    try:
        conn.execute("BEGIN IMMEDIATE")
        sender = conn.execute(
            "SELECT balance FROM users WHERE id = ?", (sender_id,)
        ).fetchone()
        receiver = conn.execute(
            "SELECT id FROM users WHERE account_no = ?", (account_no,)
        ).fetchone()

        if not receiver:
            conn.rollback()
            return jsonify(error="Demo recipient account not found"), 404
        if receiver["id"] == sender_id:
            conn.rollback()
            return jsonify(error="You cannot pay your own account"), 400
        if sender["balance"] < amount:
            conn.rollback()
            return jsonify(error="Insufficient demo balance"), 400

        conn.execute(
            "UPDATE users SET balance = balance - ? WHERE id = ?",
            (amount, sender_id)
        )
        conn.execute(
            "UPDATE users SET balance = balance + ? WHERE id = ?",
            (amount, receiver["id"])
        )
        conn.execute(
            """INSERT INTO transactions(sender_id, receiver_id, amount, note)
               VALUES (?, ?, ?, ?)""",
            (sender_id, receiver["id"], amount, note)
        )
        conn.commit()
        return jsonify(message="Demo payment successful", amount=amount)
    except Exception:
        conn.rollback()
        app.logger.exception("Demo payment failed")
        return jsonify(error="Payment could not be recorded"), 500


@app.get("/api/health")
def health():
    return jsonify(status="ok", service="FivPay demo API")


with app.app_context():
    init_db()


if __name__ == "__main__":
    app.run(debug=True)
