from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from jose import JWTError, jwt
from schemas import LoginRequest, UserCreate
import bcrypt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = "your_real_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')  # ensure it's bytes
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)

@router.post("/register")
def register(user: UserCreate, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT UserId FROM Users WHERE Username=?", user.Username)
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_pw = hash_password(user.Password)
    cursor.execute("""
        INSERT INTO Users (FullName, Username, PasswordHash, Email, Role, Team)
        VALUES (?, ?, ?, ?, ?, ?)
    """, user.FullName, user.Username, hashed_pw, user.Email, user.Role, user.Team)
    db.commit()
    return {"detail": "User created successfully"}

@router.post("/login")
def login(login_data: LoginRequest, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT UserId, PasswordHash FROM Users WHERE Username=?", login_data.username)
    user = cursor.fetchone()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    user_id, password_hash = user

    if verify_password(login_data.password, password_hash):
        token_data = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
        return {"access_token": token}
    raise HTTPException(status_code=401, detail="Invalid credentials")

async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    cursor = db.cursor()
    cursor.execute("SELECT UserId FROM Users WHERE UserId=?", user_id)
    user = cursor.fetchone()
    if user is None:
        raise credentials_exception
    return {"user_id": user_id}

@router.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    # In a stateless JWT setup, we don't need to do anything server-side
    # The client will remove the token
    return {"message": "Successfully logged out"}
