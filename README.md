# Real-Time Global DNS Attack Visualization System

This project visualizes real-time or simulated DNS/cyberattack activity on a 3D globe using Python, Blender, Three.js, and Globe.gl.

## Features

- 3D globe model created in Blender (earth.glb)
- Frontend setup for real-time attack visualization between source and target locations
- Python server using Flask-SocketIO for data streaming
- Research and preparation for integrating public cyber threat/IP data feeds
- Fallback to simulated data if API unavailable
- Browser-based rotating 3D globe visualization

## Requirements

- Python 3.x
- Blender (for model creation)
- Web browser with WebGL support

## Installation

1. Install Python dependencies:
   ```bash
   pip install flask flask-socketio requests
   ```

## Usage

1. Run the server:
   ```bash
   python server.py
   ```

2. Open `index.html` in your web browser.

3. The globe currently displays the frontend visualization setup for future real-time attack visualization.

## Files

- `server.py`: Python server handling data streaming
- `main.js`: Three.js client for 3D visualization
- `index.html`: HTML page
- `style.css`: Styling
- `earth.glb`: Blender 3D globe model

## Data Source

Currently researching and preparing integration of public cyber threat and DNS/network-related data sources for future real-time or simulated attack visualization.

## Customization

- Modify attack simulation logic in `server.py`
- Adjust visualization parameters in `main.js`
- Enhance the Blender model for better textures

## Skills Used

- Python networking and data processing
- Blender 3D modeling
- Three.js WebGL programming
- Real-time data visualization
- Cybersecurity concepts

## Current Project Preview

![Project Preview](screenshot.png)
