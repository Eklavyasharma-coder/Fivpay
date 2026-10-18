def test_registration_success(client):
    res = client.post("/api/auth/register", json={
        "name": "Jordan Hayes",
        "email": "jordan@fintech.test",
        "password": "SecurePassword123!",
        "role": "user"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert "token" in data
    assert data["user"]["email"] == "jordan@fintech.test"
    assert data["account"]["balance"] == 10000.00

def test_registration_duplicate_email(client):
    payload = {
        "name": "Jordan Hayes",
        "email": "duplicate@fintech.test",
        "password": "SecurePassword123!",
        "role": "user"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.get_json()["error"]

def test_login_success(client):
    client.post("/api/auth/register", json={
        "name": "Login User",
        "email": "login@fintech.test",
        "password": "Password123!",
        "role": "user"
    })

    res = client.post("/api/auth/login", json={
        "email": "login@fintech.test",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert "token" in data
    assert data["user"]["name"] == "Login User"

def test_login_invalid_password(client):
    client.post("/api/auth/register", json={
        "name": "Wrong Pass User",
        "email": "wrongpass@fintech.test",
        "password": "CorrectPassword123!",
        "role": "user"
    })

    res = client.post("/api/auth/login", json={
        "email": "wrongpass@fintech.test",
        "password": "IncorrectPassword"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.get_json()["error"]
