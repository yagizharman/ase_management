import hmac
import hashlib
import base64

def generate_hs256_signature(secret: str, message: str) -> str:
    signature = hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(signature).decode()

# Example usage
secret_key = "eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTc0MzQyMTI5MiwiaWF0IjoxNzQzNDIxMjkyfQ.-aeEbwiGg4FB5kIuEPYzTobIhoxzmNeA29nSrFvQg_I"
message = "password123"

print("HS256-style signature:")
print(generate_hs256_signature(secret_key, message))
