from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from app.core.config import settings
from .models import Base  # Import Base from models

# The database URL from your settings
DATABASE_URL = settings.DATABASE_URL

# Create the SQLAlchemy engine
# The connect_args are specific to SQLite and prevent a common threading error
engine_args = {}
if "sqlite" in DATABASE_URL:
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_args)

# Create a SessionLocal class for database sessions
# scoped_session provides a thread-local session, which is good practice
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

# A function to create all tables in the database.
def init_db():
    """
    Creates all database tables defined in the models.
    This should be run once when the application is initialized.
    """
    # Import all models here before initializing the DB
    # so that they are registered with the Base metadata
    from . import models
    Base.metadata.create_all(bind=engine)
    print("Database tables created (if they didn't exist).")

# Dependency for FastAPI to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
