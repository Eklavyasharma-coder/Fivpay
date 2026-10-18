import os
import sys

# Ensure backend directory is in python path
current_dir = os.path.abspath(os.path.dirname(__file__))
parent_dir = os.path.abspath(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from backend.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("\n" + "=" * 60)
    print("           FIVPAY CORE BANKING REST API (v1.0.0)")
    print("=" * 60)
    print(f" [OK] REST API Server listening on: http://127.0.0.1:{port}")
    print(f" [OK] Health Check endpoint:        http://127.0.0.1:{port}/api/health")
    print(f" [OK] CORS Allowed Origins:        http://localhost:4000")
    print("=" * 60 + "\n")
    app.run(host="0.0.0.0", port=port, debug=True)
