"""
FivPay Production WSGI Entry Point
For production deployment with Gunicorn, uWSGI, Waitress, or Cloud Platforms
(Render, Railway, Fly.io, Heroku, AWS Elastic Beanstalk).

Example usage:
  gunicorn backend.wsgi:app --bind 0.0.0.0:$PORT --workers 4 --threads 2
"""
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
