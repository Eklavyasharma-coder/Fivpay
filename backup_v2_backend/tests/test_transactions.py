def test_transfer_success(client, auth_headers):
    sender_headers = auth_headers(role="user", email="sender@test.com")
    
    # Register receiver
    receiver_res = client.post("/api/auth/register", json={
        "name": "Receiver User",
        "email": "receiver@test.com",
        "password": "Password123!",
        "role": "user"
    })
    receiver_acc = receiver_res.get_json()["account"]["account_number"]

    # Execute transfer
    tx_res = client.post("/api/transactions/transfer", headers=sender_headers, json={
        "recipient": receiver_acc,
        "amount": 250.00,
        "note": "Dinner split test",
        "category": "Dining"
    })
    assert tx_res.status_code == 201
    data = tx_res.get_json()
    assert data["transaction"]["amount"] == 250.00
    assert data["transaction"]["status"] == "completed"
    assert data["new_balance"] == 9750.00

def test_transfer_insufficient_funds(client, auth_headers):
    sender_headers = auth_headers(role="user", email="poor_sender@test.com")
    
    receiver_res = client.post("/api/auth/register", json={
        "name": "Receiver 2",
        "email": "receiver2@test.com",
        "password": "Password123!",
        "role": "user"
    })
    receiver_acc = receiver_res.get_json()["account"]["account_number"]

    # Attempt to transfer more than balance ($10,000)
    tx_res = client.post("/api/transactions/transfer", headers=sender_headers, json={
        "recipient": receiver_acc,
        "amount": 999999.00,
        "note": "Huge transfer"
    })
    assert tx_res.status_code == 400
    assert "Insufficient available balance" in tx_res.get_json()["error"]

def test_transfer_idempotency_protection(client, auth_headers):
    sender_headers = auth_headers(role="user", email="idempotent_sender@test.com")
    
    receiver_res = client.post("/api/auth/register", json={
        "name": "Receiver 3",
        "email": "receiver3@test.com",
        "password": "Password123!",
        "role": "user"
    })
    receiver_acc = receiver_res.get_json()["account"]["account_number"]

    idempotency_key = "idemp-key-unique-12345"
    payload = {
        "recipient": receiver_acc,
        "amount": 100.00,
        "note": "Idempotent payment",
        "idempotency_key": idempotency_key
    }

    # First request
    res1 = client.post("/api/transactions/transfer", headers=sender_headers, json=payload)
    assert res1.status_code == 201
    ref1 = res1.get_json()["transaction"]["reference"]

    # Second request with identical idempotency key
    res2 = client.post("/api/transactions/transfer", headers=sender_headers, json=payload)
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2.get("is_duplicate") is True
    assert data2["transaction"]["reference"] == ref1
