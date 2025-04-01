from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from database import get_db
from jose import JWTError, jwt
from schemas import UserCreate, UserResponse, TokenResponse, TokenData, UserInfo # Updated schemas
import bcrypt
from datetime import datetime, timedelta, timezone
import os # For environment variables

router = APIRouter()

# It's CRITICAL to use a strong, randomly generated secret key
# and load it from environment variables, not hardcode it.
SECRET_KEY = os.environ.get("SECRET_KEY", "42f8b087f248c080cd415cb90e8b84f64ff8cee683e4b9b419eb590f053ffe5d549c360ec721a8bfd95761511c46b35047b5d6f36b161e7134143a7cc9d6f2863502fb460bc9fbaf36fe27430ace346e8fb9f3902968071124972c4ed5907d77031d4c724c878f18ef5a24b58125a43e57a05aefdae48a075d08a8a79c393f644ab2a5e09436a51e451486690c89896436def00de4156f161ff30fe824de98e6c487206af3fb2bcd8c408fc3bab1d3a40b3946db09889113d906ce4b09ed9316facb49e23ddcede3f1d58f565ef3d1667207fa20d341f8df73eca1606cb3ed2d3a1fc0889e865b61f9a83bb93e252562cd9e23c9b3ef9e472668b63daeb7f994") # CHANGE THIS
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # Or read from config

# Use tokenUrl="/api/auth/token" which matches the login endpoint path
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def hash_password(password: str) -> str:
    # Ensure password is bytes
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    # Decode back to string for storing in DB
    return hashed_bytes.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    plain_password_bytes = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password_bytes, hashed_password_bytes)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db=Depends(get_db)):
    cursor = db.cursor()
    # Check if username exists
    cursor.execute("SELECT id FROM users WHERE username=?", (user.username,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    # Check if email exists
    cursor.execute("SELECT id FROM users WHERE email=?", (user.email,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    # Check if team exists (optional, depends on requirements)
    cursor.execute("SELECT id FROM teams WHERE id=?", (user.team_id,))
    if not cursor.fetchone():
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team with id {user.team_id} does not exist"
        )

    hashed_pw = hash_password(user.password)
    try:
        cursor.execute("""
            INSERT INTO users (name, username, password_hash, email, role, team_id)
            OUTPUT INSERTED.id, INSERTED.name, INSERTED.username, INSERTED.email, INSERTED.role, INSERTED.team_id
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user.name, user.username, hashed_pw, user.email, user.role, user.team_id))
        created_user_row = cursor.fetchone()
        db.commit()

        if not created_user_row:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")

        # Map the output row to the response model
        user_data = {
            "id": created_user_row[0],
            "name": created_user_row[1],
            "username": created_user_row[2],
            "email": created_user_row[3],
            "role": created_user_row[4],
            "team_id": created_user_row[5]
        }
        return UserResponse(**user_data)

    except pyodbc.Error as e:
        db.rollback() # Rollback on error
        print(f"Database error during registration: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not register user")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error during registration: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")


# Use OAuth2PasswordRequestForm for standard token endpoint
@router.post("/token", response_model=TokenResponse) # Changed path to /token
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    cursor = db.cursor()
    # Fetch user including id, role, team_id
    cursor.execute(
        "SELECT id, username, password_hash, role, team_id FROM users WHERE username=?",
        (form_data.username,)
    )
    user = cursor.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id, username, password_hash, role, team_id = user

    if not verify_password(form_data.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Data to include in the JWT payload
    token_data = {
        "sub": username, # Use 'sub' (subject) for username as standard
        "user_id": user_id,
        "role": role,
        "team_id": team_id
    }
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data=token_data, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

# Dependency to get the current user from the token
async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)) -> UserInfo:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Extract data from payload
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        team_id: int = payload.get("team_id")

        if username is None or user_id is None or role is None: # team_id might be optional depending on logic
            raise credentials_exception

        # Optional: Verify user still exists in DB
        cursor = db.cursor()
        cursor.execute("SELECT id, username, name, email, role, team_id FROM users WHERE id=?", (user_id,))
        user_db = cursor.fetchone()
        if user_db is None:
            raise credentials_exception

        # Return user info extracted from token (or DB)
        # Using token data is faster, but DB check confirms user validity
        return UserInfo(
            id=user_db[0],
            username=user_db[1],
            name=user_db[2],
            email=user_db[3],
            role=user_db[4],
            team_id=user_db[5]
        )

    except JWTError as e:
        print(f"JWT Error: {e}") # Log the error
        raise credentials_exception
    except Exception as e:
        print(f"Error in get_current_user: {e}") # Log unexpected errors
        raise credentials_exception


@router.get("/me", response_model=UserInfo)
async def read_users_me(current_user: UserInfo = Depends(get_current_user)):
    # The dependency already fetches and validates the user
    return current_user

# Logout doesn't do much server-side with JWT, client discards token
@router.post("/logout")
async def logout():
     # Optionally: Add token to a blacklist if using a more complex setup
    return {"message": "Successfully logged out"}
