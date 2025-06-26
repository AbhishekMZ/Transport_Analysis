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
