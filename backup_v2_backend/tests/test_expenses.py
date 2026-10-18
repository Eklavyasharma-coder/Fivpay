def test_staff_expense_submission_and_admin_approval(client, auth_headers):
    staff_headers = auth_headers(role="staff", email="staff_agent@test.com")
    admin_headers = auth_headers(role="admin", email="admin_chief@test.com")

    # 1. Staff submits expense
    sub_res = client.post("/api/expenses", headers=staff_headers, json={
        "amount": 142.50,
        "category": "Travel",
        "description": "Taxi fares for client conference travel",
        "expense_date": "2026-10-18"
    })
    assert sub_res.status_code == 201
    expense_id = sub_res.get_json()["expense"]["id"]
    assert sub_res.get_json()["expense"]["status"] == "pending"

    # 2. Staff views their expenses
    staff_list_res = client.get("/api/expenses", headers=staff_headers)
    assert staff_list_res.status_code == 200
    assert len(staff_list_res.get_json()["expenses"]) >= 1

    # 3. Admin approves expense
    approve_res = client.post(f"/api/expenses/{expense_id}/approve", headers=admin_headers, json={
        "action": "approved",
        "notes": "Verified against conference agenda receipt"
    })
    assert approve_res.status_code == 200
    assert approve_res.get_json()["expense"]["status"] == "approved"

def test_user_cannot_access_staff_expenses(client, auth_headers):
    user_headers = auth_headers(role="user", email="regular_customer@test.com")
    res = client.get("/api/expenses", headers=user_headers)
    # Role required decorator blocks user role
    assert res.status_code == 403
    assert "Access forbidden" in res.get_json()["error"]
