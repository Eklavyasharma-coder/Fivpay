import time
from collections import defaultdict
from flask import request, jsonify, current_app

# In-memory sliding window rate limiter
_attempts = defaultdict(list)

def rate_limit(max_attempts=5, window_seconds=60):
    def decorator(f):
        def wrapper(*args, **kwargs):
            if current_app and current_app.config.get("TESTING"):
                return f(*args, **kwargs)

            # Client IP identifier
            ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
            key = f"{request.endpoint}:{ip}"
            now = time.time()

            # Clean entries older than window
            _attempts[key] = [t for t in _attempts[key] if now - t < window_seconds]

            if len(_attempts[key]) >= max_attempts:
                retry_after = int(window_seconds - (now - _attempts[key][0]))
                return jsonify({
                    "error": "Too many requests. Rate limit exceeded. Please try again later.",
                    "retry_after_seconds": max(retry_after, 1)
                }), 429

            _attempts[key].append(now)
            return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

def reset_rate_limit(endpoint, ip):
    key = f"{endpoint}:{ip}"
    if key in _attempts:
        _attempts.pop(key, None)
