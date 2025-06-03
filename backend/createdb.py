from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError

# Conexión al servidor de PostgreSQL (base de datos por defecto)
engine = create_engine('postgresql+psycopg2://postgres:2deabril2005@localhost:5432/postgres')

# Nombre de la nueva base de datos
dbname = "video_games1"

# Intentar crear la base de datos
with engine.connect() as conn:
    try:
        conn.execution_options(isolation_level="AUTOCOMMIT").execute(text(f"CREATE DATABASE {dbname}"))
        print(f"✅ Base de datos '{dbname}' creada con éxito.")
    except ProgrammingError as e:
        print(f"⚠️  La base de datos '{dbname}' ya existe o ocurrió un error.")
