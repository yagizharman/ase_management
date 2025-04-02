from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Make sure routers path is correct if structure changed
from routers import auth, tasks, users, analytics, teams, notifications  # Added teams
# Potentially add teams router if created

app = FastAPI(
    title="Task Management API",
    description="API for İş Yönetim ve Takip Platformu",
    version="1.0.0" # Add API versioning
)

# Configure CORS (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Restrict this in production! e.g., ["http://localhost:3000", "https://yourfrontend.com"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], # Added PATCH
    allow_headers=["*"], # Or specify allowed headers like ["Authorization", "Content-Type"]
    # expose_headers=["*"], # Be specific about exposed headers if needed
    max_age=3600,
)

# Database tables are created via the SQL script, not on startup.

# Include routers with consistent prefixing
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(teams.router, prefix="/api/teams", tags=["Teams"]) # Added Teams router
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])

# Optional: Add a root endpoint for health check / info
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Task Management API"}
