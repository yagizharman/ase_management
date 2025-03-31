from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from jose import JWTError, jwt
from schemas import User
import passlib.hash

router = APIRouter()

SECRET_KEY = "f6c7d661edec7b2b3a8e297c8c3b96c40f14072562a0c6f31a29463ac01b1833c9258a1095e56cc2091e78cf90d0dc271ad309752edb456bb1d9c9eacc9d9c91b131ff27d810f004b90e71a19d053ce4593e6634a9609fd84c277e56cee74a6b75ffc652eccdbe115d9120331493c84cd60b92abe07f41a1c8abfb8a793faeec2e3bbbf452277ee01c6928d85ca90206a3d720b3287b45cb84632b3eebef2cd55a8fa6748319a3c1bdf4c1c3a473905d2edd6de66a987a6d52b829952545abef2eafca7e25c8d754b98e9a4257b153a84ca23cb727bb8d52fb7b5d3af371fa8ec5506d3945ce214297ba3b67363375ea3629cdde95e12f77b9790362039b9f18"
ALGORITHM = "HS256"

@router.post("/login")
def login(username: str, password: str, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT UserId, PasswordHash FROM Users WHERE Username=?", username)
    user = cursor.fetchone()
    if user and passlib.hash.bcrypt.verify(password, user.PasswordHash):
        token_data = {"user_id": user.UserId}
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
        return {"access_token": token}
    raise HTTPException(status_code=401, detail="Invalid credentials")
