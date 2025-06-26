# TransiGenius - Bangalore Multi-layered Transport Network Analysis

## Project Overview

TransiGenius is an AI-powered transport analysis system specifically designed for Bangalore's public and road transportation networks. The system combines historical data analysis, real-time monitoring, and predictive modeling to provide comprehensive insights into urban mobility patterns.

## Architecture

### Components
- **Backend**: Python FastAPI server with 9 specialized TransiGenius tools
- **Frontend**: Next.js dashboard with interactive Google Maps visualization
- **Data Sources**: Historical GeoJSON (2014-2025), BMTC GTFS data, real-time TomTom API
- **AI Assistant**: TransiGenius - natural language interface for transport analysis

### Directory Structure
```
Transport_Analysis/
├── Public-Transport-Analysis/     # Historical data and analysis
│   ├── data_2014.geojson         # Temporal transport data
│   ├── data_2015.geojson         # ...through 2025
│   ├── bmtc/                     # BMTC GTFS data (2013)
│   ├── ProjectOSM/               # OpenStreetMap processing
│   └── Lit Review/               # Research materials
├── transport-dashboard/          # Next.js frontend application
│   ├── app/                      # Next.js app directory
│   ├── components/               # UI components (57+ components)
│   └── package.json              # Frontend dependencies
└── backend/                      # FastAPI backend (created)
    ├── main.py                   # Main API server
    ├── transigenius_tools.py     # 9 specialized tools
    ├── dashboard_integration.py  # Frontend integration
    ├── requirements.txt          # Python dependencies
    └── start_backend.py          # Startup script
```

## Quick Start

### Prerequisites
- Python 3.8 or higher
- Node.js 16+ (for frontend)
- TomTom API key (for real-time traffic data)
- Google Maps API key (for visualization)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Run the startup script**:
   ```bash
   python start_backend.py
   ```
   
   This will:
   - Check Python version compatibility
   - Install required packages
   - Create .env file template
   - Start the FastAPI server

3. **Configure API keys**:
   Edit the `.env` file with your actual API keys:
   ```env
   TOMTOM_API_KEY=your_actual_tomtom_key
   GOOGLE_MAPS_API_KEY=your_actual_google_maps_key
   ```

4. **Access the API**:
   - Server: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Health check: http://localhost:8000/api/health

### Frontend Setup (Next.js Dashboard)

1. **Navigate to dashboard directory**:
   ```bash
   cd transport-dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Access dashboard**: http://localhost:3000

## TransiGenius Tools

The system provides 9 specialized tools accessible via API endpoints:

### 1. Project Metadata (`/api/tools/project-metadata`)
- Retrieves comprehensive project information
- Data timeline, available datasets, tech stack

### 2. GTFS Routes (`/api/tools/gtfs-routes`)
- Fetches BMTC public transport route data
- Supports filtering by route ID, transport type, geographic bounds

### 3. Temporal GeoJSON (`/api/tools/temporal-geojson`)
- Historical geospatial data (2014-2025)
- Road networks, bus stops, metro lines evolution

### 4. Network Criticality Analysis (`/api/tools/network-criticality`)
- Identifies critical transport nodes
- Uses betweenness, closeness, or degree centrality algorithms

### 5. Real-time Traffic (`/api/tools/realtime-traffic`)
- Live traffic flow and incident data via TomTom API
- Current speeds, congestion levels, reported incidents

### 6. ML Forecast (`/api/tools/ml-forecast`)
- Predicts future traffic patterns and passenger flows
- Time-aware predictions with confidence scores

### 7. Disruption Simulation (`/api/tools/simulate-disruption`)
- Models "what-if" scenarios for network resilience
- Road closures, strikes, breakdowns, natural disasters

### 8. Dashboard Visualization (`/api/dashboard/update-visualization`)
- Updates frontend maps with analysis results
- GeoJSON layers, traffic heatmaps, incident markers

### 9. Static Map Reports (`/api/dashboard/generate-static-map`)
- Generates static map images for reports
- Google Maps Static API integration

## API Usage Examples

### Get Real-time Traffic Data
```bash
curl -X POST "http://localhost:8000/api/tools/realtime-traffic" \
  -H "Content-Type: application/json" \
  -d '{"data_type": "all", "area_of_interest": "MG Road"}'
```

### Analyze Network Criticality
```bash
curl -X POST "http://localhost:8000/api/tools/network-criticality" \
  -H "Content-Type: application/json" \
  -d '{"analysis_year": 2024, "algorithm_type": "betweenness_centrality", "top_n": 10}'
```

### Simulate Disruption
```bash
curl -X POST "http://localhost:8000/api/tools/simulate-disruption" \
  -H "Content-Type: application/json" \
  -d '{"disruption_scenario": "major road closure on Outer Ring Road near Marathahalli"}'
```

## Data Sources

### Historical Data (2014-2025)
- **Temporal GeoJSON files**: Evolution of transport infrastructure
- **BMTC GTFS (2013)**: Detailed public transport schedules
- **OpenStreetMap data**: Road network foundation

### Real-time Data
- **TomTom Traffic API**: Live traffic flow and incidents
- **Google Maps**: Visualization and geocoding

## Development

### Adding New Tools
1. Implement tool logic in `transigenius_tools.py`
2. Add API endpoint in `main.py`
3. Update documentation

### Frontend Integration
- Use `/api/dashboard/update-visualization` to send data to frontend
- Supported actions: display layers, highlight nodes, show heatmaps
- Real-time updates via WebSocket (future enhancement)

## Deployment

### Production Setup
1. Set `ENVIRONMENT=production` in `.env`
2. Configure proper CORS origins
3. Use production WSGI server (Gunicorn)
4. Set up reverse proxy (Nginx)

### Docker Deployment (Future)
```bash
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Submit pull request

## License

This project is part of the Bangalore Transport Network Analysis research initiative.

## Support

For issues and questions:
- Check API documentation at `/docs`
- Review tool implementations in `transigenius_tools.py`
- Validate data sources in `Public-Transport-Analysis/`

---

**TransiGenius** - Empowering Bangalore's transport future through AI-driven analysis.
