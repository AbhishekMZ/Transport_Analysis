# create_tables.py
from app.db import init_db

print("Creating database tables...")
init_db()
print("Finished creating tables.")