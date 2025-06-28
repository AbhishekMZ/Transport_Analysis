# 🚦 Bengaluru Traffic Analysis Dashboard

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?logo=streamlit&logoColor=white)](https://streamlit.io/)

A comprehensive real-time traffic monitoring and analysis system for Bengaluru, providing actionable insights into traffic patterns, public transport impact, and congestion hotspots.

![Dashboard Preview](https://via.placeholder.com/800x400.png?text=Bengaluru+Traffic+Dashboard+Preview)

## 🌟 Features

### 📊 Real-time Monitoring
- Live traffic data visualization
- Interactive map with traffic congestion levels
- Real-time incident reporting

### 📈 Advanced Analytics
- Historical traffic pattern analysis
- Peak hour identification
- Traffic trend forecasting
- Public transport impact assessment

### 🚍 Public Transport Integration
- BMTC bus routes and schedules
- Bus stop congestion analysis
- Traffic impact correlation

### ⚡ Alerts & Notifications
- Real-time traffic alerts
- Congestion warnings
- Alternative route suggestions

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ (Recommend using the official Python installer, not Microsoft Store version)
- pip (Python package manager)
- SQLite3 (usually comes with Python)
- Git (for cloning the repository)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bengaluru-traffic-analysis.git
   cd bengaluru-traffic-analysis
   ```

2. **Set up and activate a virtual environment** (highly recommended)
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
   
   If you encounter any issues with specific packages, try installing them manually:
   ```bash
   pip install streamlit pandas numpy plotly folium streamlit-folium python-dotenv
   ```

### Running the Application

1. **Start the Traffic Data Collector** (in a separate terminal)
   ```bash
   # In the project directory
   python traffic_collector.py
   ```
   
   The collector will start gathering traffic data and storing it in the SQLite database.

2. **Launch the Dashboard** (in a new terminal)
   ```bash
   # Make sure you're in the virtual environment
   streamlit run traffic_dashboard_main.py
   ```
   
   The dashboard should automatically open in your default web browser. If it doesn't, navigate to:
   ```
   http://localhost:8501
   ```

### Troubleshooting

1. **If you see CPU core detection warnings**:
   - The warning about `LOKY_MAX_CPU_COUNT` is harmless but can be fixed by setting the environment variable:
   ```bash
   # On Windows
   set LOKY_MAX_CPU_COUNT=4
   
   # On macOS/Linux
   export LOKY_MAX_CPU_COUNT=4
   ```
   Or add it to your environment variables permanently.

2. **If the dashboard looks different or has rendering issues**:
   - Clear your browser cache
   - Make sure you're using a modern browser (Chrome, Firefox, Edge, or Safari)
   - Check the terminal for any error messages

3. **If you encounter dependency conflicts**:
   ```bash
   # Try upgrading pip first
   pip install --upgrade pip
   
   # Then reinstall the requirements
   pip install -r requirements.txt --force-reinstall
   ```

### Common Issues

- **Streamlit not found**: Make sure you've activated your virtual environment
- **Port 8501 in use**: Use `streamlit run traffic_dashboard_main.py --server.port 8502` to use a different port
- **Database issues**: Ensure the SQLite database file has write permissions

### Stopping the Application
- Press `Ctrl+C` in both terminal windows to stop the dashboard and collector
- Deactivate the virtual environment when done:
  ```bash
  deactivate
  ```
   # On Windows
   python -m venv venv
   .\venv\Scripts\activate
   
   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Required API Keys
   TOMTOM_API_KEY=your_tomtom_api_key
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   
   # Database Configuration
   DATABASE_URL=sqlite:///traffic_data.db
   ```

5. **Run the data collector**
   ```bash
   python traffic_collector.py
   ```

6. **Start the dashboard** (in a new terminal)
   ```bash
   streamlit run traffic_dashboard_main.py
   ```

   The dashboard will be available at `http://localhost:8501`

## 🏗️ Project Structure

```
├── traffic_dashboard_main.py    # Main Streamlit application
├── traffic_collector.py        # Data collection service
├── traffic_analyzer.py         # Core traffic analysis logic
├── traffic_config.py           # Configuration settings
├── traffic_alerts.py           # Alert system
├── transport_impact.py         # Public transport impact analysis
├── traffic_patterns.py         # Traffic pattern analysis
├── bmtc_analyzer.py            # BMTC data analysis
├── requirements.txt            # Python dependencies
└── .env.example               # Example environment variables
```

## 📊 Data Collection

The system collects and processes data from multiple sources:

1. **TomTom Traffic API** - Real-time traffic data
2. **BMTC GTFS** - Public transport schedules and routes
3. **Google Maps API** - Location and routing information
4. **Local Sensors** - Custom traffic monitoring points

## 🤖 Features in Detail

### Real-time Traffic Map
- Interactive Folium-based map
- Heatmap visualization of traffic congestion
- Clickable points for detailed information
- Custom markers for incidents and alerts

### Traffic Analysis
- Hourly/Daily/Weekly traffic patterns
- Congestion prediction
- Impact of weather and events
- Historical trend analysis

### Public Transport Integration
- BMTC bus routes and schedules
- Bus stop congestion analysis
- Multi-modal transport planning

## 🛠️ Configuration

Edit `traffic_config.py` to customize:
- Monitor points
- Data collection intervals
- Alert thresholds
- Visualization settings

## 📈 Data Storage

Data is stored in a SQLite database (`traffic_data.db`) with the following main tables:
- `traffic_measurements` - Raw traffic data
- `traffic_alerts` - Generated alerts
- `gtfs_stops` - BMTC bus stop information
- `traffic_patterns` - Analyzed traffic patterns

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- TomTom for traffic data API
- BMTC for public transport data
- Streamlit for the amazing dashboard framework
- OpenStreetMap for base map data

---

Made with ❤️ in Bengaluru | [Report Issues](https://github.com/yourusername/bengaluru-traffic-analysis/issues)
