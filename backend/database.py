import pyodbc

def get_db():
    SERVER = "YH_YH"
    DATABASE = "TASK_MANAGEMENT"
    USERNAME = "admin_ap"
    PASSWORD = "adminadmin"
    connectionString = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER};DATABASE={DATABASE};UID={USERNAME};PWD={PASSWORD}'
    conn = pyodbc.connect(connectionString)
    try:
        yield conn
    finally:
        conn.close()
