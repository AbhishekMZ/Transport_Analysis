#!/bin/bash
# A script to restructure the TransiGenius backend project.
# Assumes it is being run from the 'backend' directory.

echo "### TransiGenius Project Restructuring Script ###"
echo "WARNING: This script will move and delete files. Please make a backup of your project first!"
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborting."
    exit 1
fi

# --- 1. Clean up root directory and duplicate/obsolete files ---
echo "--> Cleaning up obsolete and duplicate files..."
rm -f main.py                       # Remove root main.py, we will use app/main.py
rm -f transigenius_tools.py         # Obsolete, its logic will be in services/ and routes/
rm -f dashboard_integration.py      # Obsolete, its logic will be in routes/
rm -f app/core/config_updated.py      # Remove duplicate config, keeping the primary config.py
rm -f app/api/routes/geojson.py       # Remove old geojson route file before renaming the correct one
mv app/api/routes/geojson_updated.py app/api/routes/geojson.py # Rename the correct one

# --- 2. Ensure directory structure and __init__.py files exist ---
echo "--> Verifying directory structure and creating __init__.py files..."
mkdir -p app/api/routes
mkdir -p app/core
mkdir -p app/db/migrations
mkdir -p app/services
mkdir -p app/orchestration
mkdir -p data

touch app/__init__.py
touch app/api/__init__.py
touch app/api/routes/__init__.py
touch app/services/__init__.py
touch app/orchestration/__init__.py
touch data/.gitkeep

# --- 3. Create standard project files ---
echo "--> Creating standard project files (.env.example, .gitignore, README.md)..."

# Create .env.example
cat << 'EOF' > .env.example
# TransiGenius Environment Variables

# FastAPI Settings
PROJECT_NAME="TransiGenius"
ENVIRONMENT="development"

# API Keys
TOMTOM_API_KEY="your_tomtom_api_key_here"
GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"

# Database URL (PostgreSQL)
# Example: postgresql+psycopg2://user:password@host:port/dbname
DATABASE_URL="postgresql+psycopg2://transigenius:password@localhost:5432/transigenius_db"

# CORS Origins (comma-separated list of allowed origins)
BACKEND_CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
EOF

# Create .gitignore
cat << 'EOF' > .gitignore
# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# PyInstaller
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# Unit test / coverage reports
htmlcov/
.tox/
.nox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
.hypothesis/
.pytest_cache/

# Translations
*.mo
*.pot

# Django stuff:
*.log
local_settings.py
db.sqlite3
db.sqlite3-journal

# Flask stuff:
instance/
.webassets-cache

# Scrapy stuff:
.scrapy

# Sphinx documentation
docs/_build/

# Jupyter Notebook
.ipynb_checkpoints

# Environments
.env
.venv
env/
venv/
ENV/
env.bak
venv.bak

# IDE / Editor specific
.idea/
.vscode/
*.swp
*.swo
*~
EOF

# Create README.md
cat << 'EOF' > README.md
# TransiGenius Backend

This is the backend for the **TransiGenius** project, a multi-layered transport network analysis system for Bangalore.

## Project Structure

- `app/`: Main application directory.
  - `api/`: Contains all API endpoint logic.
  - `core/`: Core settings and configuration.
  - `db/`: Database models and connection logic.
  - `services/`: Business logic for various services (TomTom, OSM, GTFS, etc.).
  - `orchestration/`: Service orchestration, scheduling, and logging.
  - `main.py`: The main FastAPI application entry point.
- `data/`: Directory for data files (e.g., GeoJSON, GTFS).
- `.env.example`: Example environment variables file.
- `requirements.txt`: Python dependencies.
- `start_backend.py`: Script to start the development server.

## Setup

1.  **Create a virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Set up environment variables:**
    Copy `.env.example` to `.env` and fill in your API keys and database URL.
    ```bash
    cp .env.example .env
    ```

4.  **Run the application:**
    ```bash
    python start_backend.py
    ```
    The API will be available at `http://localhost:8000`. API documentation is at `http://localhost:8000/docs`.
EOF

echo
echo "### Restructuring complete! ###"
echo "Please review the changes. You may want to commit them to your version control system."
echo "Next steps:"
echo "1. Run 'pip install -r requirements.txt' to ensure all dependencies are met."
echo "2. Create and configure your '.env' file from the new '.env.example'."
echo "3. Run 'python start_backend.py' to test the server."

