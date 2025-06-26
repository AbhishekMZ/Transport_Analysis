#!/usr/bin/env python3
"""
TransiGenius Backend Startup Script
"""

import subprocess
import sys
import os
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✓ Python {sys.version.split()[0]} detected")

def install_requirements():
    """Install required packages"""
    print("Installing requirements...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("✓ Requirements installed successfully")
    except subprocess.CalledProcessError:
        print("Error: Failed to install requirements")
        sys.exit(1)

def check_env_file():
    """Check if .env file exists"""
    env_file = Path(".env")
    if not env_file.exists():
        print("Warning: .env file not found")
        print("Please copy .env.example to .env and configure your API keys")
        
        # Create a basic .env file
        with open(".env", "w") as f:
            f.write("# TransiGenius API Configuration\n")
            f.write("TOMTOM_API_KEY=your_tomtom_api_key_here\n")
            f.write("GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here\n")
            f.write("ENVIRONMENT=development\n")
        
        print("✓ Created basic .env file - please update with your API keys")
    else:
        print("✓ .env file found")

def start_server():
    """Start the FastAPI server"""
    print("Starting TransiGenius backend server...")
    print("Server will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("Press Ctrl+C to stop the server")
    
    try:
        subprocess.run([sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Error starting server: {e}")

def main():
    """Main startup function"""
    print("=== TransiGenius Backend Startup ===")
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    check_python_version()
    install_requirements()
    check_env_file()
    start_server()

if __name__ == "__main__":
    main()
