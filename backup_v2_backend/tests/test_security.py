def test_unauthenticated_request_rejected(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401
    assert "token is missing" in res.get_json()["error"]

def test_user_cannot_access_admin_endpoints(client, auth_headers):
    user_headers = auth_headers(role="user", email="user_attacker@test.com")
    
    # Attempt to list users
    res = client.get("/api/admin/users", headers=user_headers)
    assert res.status_code == 403

    # Attempt to access audit logs
    res_audit = client.get("/api/admin/audit-logs", headers=user_headers)
    assert res_audit.status_code == 403

def test_staff_cannot_access_admin_endpoints(client, auth_headers):
    staff_headers = auth_headers(role="staff", email="staff_intruder@test.com")
    
    res = client.get("/api/admin/metrics", headers=staff_headers)
    assert res.status_code == 403

def test_qr_decode_upi_payload(client, auth_headers):
    user_headers = auth_headers(role="user", email="qr_tester@test.com")
    
    upi_qr = "upi://pay?pa=merchant@okhdfcbank&pn=Bengaluru%20Coffee&am=150.00&cu=INR&tn=Espresso%20Order"
    res = client.post("/api/qr/decode", headers=user_headers, json={"payload": upi_qr})
    assert res.status_code == 200
    data = res.get_json()
    assert data["valid"] is True
    assert data["is_upi"] is True
    assert data["recipient_account"] == "merchant@okhdfcbank"
    assert data["amount"] == 150.00

def test_qr_decode_invalid_payload(client, auth_headers):
    user_headers = auth_headers(role="user", email="qr_tester2@test.com")
    
    bad_qr = "https://random-phishing-site.xyz/fake"
    res = client.post("/api/qr/decode", headers=user_headers, json={"payload": bad_qr})
    assert res.status_code == 400
    assert res.get_json()["valid"] is False
