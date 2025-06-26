# TransiGenius Dashboard Pages Requirements

This document outlines the detailed requirements for building each of the specialized dashboard pages in the TransiGenius application. Each page serves a specific analytical function within the Bangalore transport network analysis system.

## Common Components Across All Pages

Before diving into page-specific requirements, these components should be consistent across all dashboard pages:

1. **Page Container**
   - Full-height container with proper padding
   - Responsive design with mobile breakpoints
   - Header section with page title and action buttons
   - Content area with appropriate scrolling behavior

2. **Data Loading States**
   - Loading skeleton UI for initial data fetch
   - Error state handling with user-friendly messages
   - Empty state handling with guidance for users

3. **API Integration**
   - Connection to relevant backend endpoints
   - Error handling for failed API calls
   - Data caching where appropriate
   - Optimistic UI updates where possible

4. **Responsive Behavior**
   - Mobile-first approach with appropriate breakpoints
   - Collapsible sections on smaller screens
   - Touch-friendly controls for mobile devices

5. **Theme Support**
   - Respect dark/light mode toggle from main layout
   - Consistent color palette with primary/secondary colors
   - Accessible contrast ratios in both modes

---

## 1. Network Analysis Page

The Network Analysis page focuses on identifying critical nodes and analyzing the structure of Bangalore's transport network using graph theory algorithms.

### Core Components

#### 1.1 Analysis Control Panel
- **Requirements:**
  - Algorithm selection dropdown (betweenness_centrality, closeness_centrality, degree_centrality)
  - Year selection slider or dropdown (2013-2025)
  - Network type filter (road, bus, metro, combined)
  - Top N nodes input field with validation (default: 10)
  - Run analysis button with loading state
  - Save analysis results option

#### 1.2 Results Visualization Map
- **Requirements:**
  - Interactive map showing the network structure
  - Node highlighting based on criticality scores
  - Color gradient representation of criticality values
  - Ability to zoom and pan to specific areas
  - Toggle for showing/hiding different network layers
  - Click behavior to select and inspect individual nodes

#### 1.3 Critical Nodes Table
- **Requirements:**
  - Sortable table showing top critical nodes
  - Columns: Rank, Node ID, Type (intersection, bus stop, etc.), Criticality Score, Location
  - Pagination for large result sets
  - Search/filter functionality
  - Export to CSV/Excel option
  - Row selection to highlight corresponding node on map

#### 1.4 Network Metrics Dashboard
- **Requirements:**
  - Overall network statistics (total nodes, edges, density)
  - Graph metrics visualization (diameter, average path length)
  - Community detection results summary
  - Comparison with historical metrics (if available)
  - Downloadable PDF report option

#### 1.5 Comparative Analysis Tool
- **Requirements:**
  - Ability to compare results across different:
    - Years (temporal analysis)
    - Algorithms (methodological comparison)
    - Network types (modality comparison)
  - Side-by-side visualization of comparative results
  - Delta metrics highlighting significant changes

### API Integration
- Backend Tool: `analyze_network_criticality`
- Parameters:
  - `analysis_year`: Selected year from UI
  - `algorithm_type`: Selected algorithm
  - `top_n`: User input value
- Visualization updates using `update_dashboard_visualization`

---

## 2. Real-time Traffic Page

The Real-time Traffic page presents current traffic conditions and incidents across Bangalore, with filtering and alert capabilities.

### Core Components

#### 2.1 Traffic Control Panel
- **Requirements:**
  - Data type selector (flow, incidents, or both)
  - Area of interest selector with autocompletion
  - Refresh interval selector (30s, 1m, 5m, manual)
  - Traffic layer visibility toggles
  - Severity filter for incidents (minor, moderate, major)
  - Quick navigation to key areas (CBD, Tech Corridor, etc.)

#### 2.2 Traffic Flow Map
- **Requirements:**
  - Real-time traffic flow visualization with color coding
    - Green: Free flow
    - Yellow: Moderate congestion
    - Red: Heavy congestion
    - Black: Standstill
  - Traffic speed indicators on major roads
  - Dynamic road width based on importance/congestion
  - Animated flow direction indicators
  - Hover state showing speed and congestion percentage

#### 2.3 Incidents Panel
- **Requirements:**
  - Live-updating list of current traffic incidents
  - Incident details:
    - Type (accident, construction, event, etc.)
    - Location (road name, landmarks)
    - Severity level
    - Start time and estimated duration
    - Impact radius visualization
  - Sorting options (time, severity, location)
  - Click behavior to center map on incident
  - Filtering by incident type

#### 2.4 Traffic Alerts System
- **Requirements:**
  - Real-time notification system for new major incidents
  - Option to set alert preferences by:
    - Area (draw polygon or select neighborhoods)
    - Severity threshold
    - Time of day
  - In-app notification center
  - Optional sound alerts
  - Alert history log

#### 2.5 Traffic Trend Panel
- **Requirements:**
  - Mini line charts showing traffic trends over last 24 hours
  - Comparison with typical traffic patterns
  - Peak hour predictions
  - Key congestion hotspots summary
  - Travel time estimates between major points

### API Integration
- Backend Tool: `get_realtime_traffic`
- Parameters:
  - `data_type`: Selected data type from UI
  - `area_of_interest`: Selected area (optional)
- Update frequency: Based on refresh interval setting
- Visualization updates using `update_dashboard_visualization`

---

## 3. ML Forecasting Page

The ML Forecasting page leverages machine learning models to predict future traffic patterns and passenger flows, with scenario testing capabilities.

### Core Components

#### 3.1 Forecast Control Panel
- **Requirements:**
  - Forecast type selector (traffic_flow, passenger_flow)
  - Time period inputs:
    - Natural language input field
    - Date/time pickers for start/end times
    - Quick presets (morning rush, evening rush, weekend)
  - Area of interest selector with map-based selection
  - Model confidence level selector (if applicable)
  - Contributing factors toggles (weather, events, holidays)
  - Run forecast button with loading state

#### 3.2 Forecast Visualization Map
- **Requirements:**
  - Predictive heatmap overlay for forecasted conditions
  - Temporal slider to move through time periods
  - Color scale legend for interpreting heatmap
  - Toggle between absolute values and delta from normal
  - Clickable roads/areas to see detailed predictions
  - Animation option to play through the forecast period

#### 3.3 Time Series Forecasts
- **Requirements:**
  - Line charts showing predicted values over time
  - Confidence interval visualization
  - Comparison with historical averages
  - Key time point annotations (peaks, unusual patterns)
  - Multiple areas/routes comparison capability
  - Interactive zoom for detailed time segments

#### 3.4 Contributing Factors Panel
- **Requirements:**
  - Visualization of factors influencing the forecast
  - Percentage contribution of each factor
  - Weather conditions integration (if relevant)
  - Special events calendar integration
  - Holiday schedule awareness
  - Historical pattern correlation indicators

#### 3.5 Scenario Testing Tool
- **Requirements:**
  - Ability to modify input parameters for what-if testing
  - Comparative visualization of multiple scenarios
  - Parameter adjustment sliders:
    - Weather conditions
    - Event attendance
    - Day of week
    - Season
  - Save scenario functionality
  - Scenario comparison table

### API Integration
- Backend Tool: `run_ml_forecast`
- Parameters:
  - `forecast_type`: Selected forecast type
  - `time_period`: Natural language or formatted time range
  - `area_of_interest`: Selected area (optional)
- Visualization updates using `update_dashboard_visualization`

---

## 4. Reports Page

The Reports page provides access to generated reports, historical analyses, and the ability to create new static or interactive reports.

### Core Components

#### 4.1 Report Catalog
- **Requirements:**
  - Searchable/filterable grid of available reports
  - Report metadata display:
    - Title and description
    - Creation date
    - Report type (traffic, network, forecast)
    - Thumbnail preview
    - Tags/categories
  - Sorting options (date, type, name)
  - Pagination for large numbers of reports
  - Favorites/pinned reports section

#### 4.2 Report Generator
- **Requirements:**
  - Report type selection (map-based, statistical, combined)
  - Data source selection:
    - Historical data range picker
    - Real-time snapshot option
    - Saved analysis results selector
    - Forecast results selector
  - Layout template selection with preview
  - Title and description fields
  - Output format options (PDF, PNG, interactive HTML)
  - Generate button with progress indicator

#### 4.3 Static Map Generator
- **Requirements:**
  - Integration with `generate_static_map_report` backend tool
  - Map type selector (roadmap, satellite, terrain, hybrid)
  - Layer visibility controls for GeoJSON data
  - Custom styling options:
    - Color schemes
    - Line weights
    - Point sizes
    - Labels visibility
  - Export resolution settings
  - Annotation tools (text, arrows, highlights)

#### 4.4 Report Viewer
- **Requirements:**
  - In-app preview of generated reports
  - Interactive elements for dynamic reports
  - Zoom and pan controls for map-based reports
  - Print functionality
  - Share options (email, link, download)
  - Commenting/annotation capability

#### 4.5 Scheduled Reports
- **Requirements:**
  - Interface to set up automatic report generation
  - Schedule configuration:
    - Frequency (daily, weekly, monthly)
    - Time of generation
    - Recipient list
  - Delivery method options (email, download, dashboard)
  - Template selection for recurring reports
  - History of generated scheduled reports

### API Integration
- Backend Tool: `generate_static_map_report`
- Parameters:
  - `geojson_data`: Selected data layers
  - `title`: User input title
  - `zoom`: Selected zoom level
  - `center`: Selected center coordinates
  - `map_type`: Selected map type
- Additional calls to other APIs for data gathering

---

## 5. Settings Page

The Settings page provides user preferences, application configuration, and administrative options.

### Core Components

#### 5.1 User Preferences
- **Requirements:**
  - Default map view settings:
    - Starting location
    - Default zoom level
    - Preferred map type
  - Theme preferences:
    - Color mode (light/dark/system)
    - Color blindness accommodations
    - Font size adjustments
  - Data display preferences:
    - Units (metric/imperial)
    - Date format
    - Time format (12h/24h)
  - Language selection (if applicable)

#### 5.2 API Configuration
- **Requirements:**
  - API key management interface
  - Status indicators for connected APIs:
    - TomTom API
    - Google Maps API
    - Other external data sources
  - Request quota monitoring
  - API usage statistics
  - Token refresh functionality
  - Proxy configuration (if applicable)

#### 5.3 Data Cache Management
- **Requirements:**
  - Cache size information
  - Clear cache options:
    - All cache
    - By data type (maps, traffic data, etc.)
    - By age
  - Cache retention policy settings
  - Preload data options for offline capabilities
  - Storage usage visualization

#### 5.4 Notification Settings
- **Requirements:**
  - Alert type toggles:
    - Major incidents
    - Critical node disruptions
    - System updates
    - Report completions
  - Notification method selection:
    - In-app
    - Browser
    - Email (if implemented)
  - Do not disturb scheduling
  - Notification history and management

#### 5.5 System Information
- **Requirements:**
  - Application version information
  - Connected backend server status
  - Last data synchronization time
  - System health metrics
  - Client-side performance statistics
  - Browser/device compatibility information
  - Error logs access (if applicable)

### API Integration
- Backend Tool: `get_project_metadata` for system information
- Local storage for user preferences
- Backend configuration endpoints as needed

---

## Implementation Priority

The suggested implementation order for these pages:

1. **Real-time Traffic Page** - Aligns with immediate focus on real-time implementation
2. **Network Analysis Page** - Core functionality for identifying critical infrastructure
3. **ML Forecasting Page** - Builds on real-time data with predictive capabilities
4. **Reports Page** - Provides output formats for analysis results
5. **Settings Page** - Can be implemented incrementally as needed

## Technology Stack Notes

- React components should use TypeScript for type safety
- Leverage existing UI component library from dashboard layout
- Map visualizations should use consistent library (react-map-gl)
- Consider Tanstack Query (React Query) for API data fetching and caching
- Use React Context for sharing state between components on the same page
- Store user preferences in localStorage with appropriate synchronization
