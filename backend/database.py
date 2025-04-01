import pyodbc
import os # Recommended: Use environment variables for credentials

def get_db():
    # It's highly recommended to use environment variables instead of hardcoding
    # Example using os.environ.get():
    # SERVER = os.environ.get("DB_SERVER", "YH_YH") # Default value if env var not set
    # DATABASE = os.environ.get("DB_DATABASE", "TASK_MANAGEMENT")
    # USERNAME = os.environ.get("DB_USERNAME", "admin_ap")
    # PASSWORD = os.environ.get("DB_PASSWORD", "adminadmin")

    SERVER = "YH_YH"  # <-- UPDATE if needed
    DATABASE = "TASK_MANAGEMENT_V2" # <-- UPDATE if needed (Your script uses this)
    USERNAME = "admin_ap" # <-- UPDATE if needed
    PASSWORD = "adminadmin" # <-- UPDATE if needed
    
    # Ensure you have the correct ODBC driver installed and named
    connectionString = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER};DATABASE={DATABASE};UID={USERNAME};PWD={PASSWORD}'
    
    conn = None # Initialize conn to None
    try:
        conn = pyodbc.connect(connectionString)
        yield conn
    except pyodbc.Error as ex:
        sqlstate = ex.args[0]
        print(f"Database connection error: {sqlstate} - {ex}")
        # Depending on your error handling strategy, you might raise an HTTPException here
        # For now, we let the error propagate or handle it in the endpoint
        raise # Re-raise the exception
    finally:
        if conn:
            conn.close()
