# 🚇 CommuteIQ — Bangalore Metro & Cab Commute Planner

CommuteIQ is a modern, full-stack, multi-modal transportation planning application designed for commuters in Bangalore. The platform helps users find optimal metro routes and compares them in real-time with direct cab options and hybrid multi-modal journeys (combining Metro and Cab legs) to optimize for travel time, cost, or convenience.

---

## 🌟 Key Features

1. **🚇 Namma Metro Route Finder**
   - Interactive visual route planning across **61 metro stations** on the Bangalore Metro network.
   - Coverage:
     - **Purple Line**: Challaghatta ↔ Whitefield (24 stations)
     - **Green Line**: Madavara ↔ Silk Institute (26 stations)
     - **Yellow Line**: R.V. Road ↔ Bommasandra (11 stations)
     - **Interchanges**: Majestic (Purple ↔ Green), R.V. Road (Green ↔ Yellow)
   - Calculated routes using [Dijkstra's Algorithm](file:///Users/tanmaymac/Project/project_major/server/src/utils/dijkstra.js) optimizing for travel time or fare.

2. **🚗 Real-time Commute Mode Comparisons**
   - **Pure Metro**: Walk to the closest station, take the metro, and walk from the destination station to the final point.
   - **Pure Cab (Uber)**: Road distance and duration computed using OpenStreetMap road-following geometries, with fares predicted using a machine learning model.
   - **Smart Hybrid**: Walk to start, take the metro to an optimal intermediate station, and hail a cab for the remaining distance to save both time and money.

3. **🗺️ Interactive Map & Auto-Complete Search**
   - Full Leaflet-based interactive map displaying routes, lines, and custom coordinates.
   - Address auto-complete and geocoding via OpenStreetMap (OSM) Nominatim API restricted to Bangalore bounds with country-wide fallback.

4. **🧠 Machine Learning Fare Prediction**
   - A custom Random Forest Regressor model trained on **50,000 real trip records** to predict cab fares in Rupees.
   - Dynamically factors in distance (km) and the hour of the day (supporting peak hour and night surge pricing).

5. **🔐 User Profiles & Home-Sync**
   - JWT-based authentication system allowing users to register, log in, and sync their home or current location to quickly calculate routes.

---

## 💻 Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) + Tailwind CSS | Highly responsive UI with Glassmorphism, animations, and icons. |
| **Mapping** | Leaflet.js | Interactive vector mapping of metro lines and route geometries. |
| **Backend** | Node.js + Express | RESTful APIs for auth, routing, comparison, and location. |
| **Database** | MongoDB + Mongoose | Schema definitions for users, stations, and trip histories. |
| **Machine Learning**| Python + Scikit-Learn | RandomForestRegressor fare prediction trained on Uber dataset. |
| **Routing & Geo** | Dijkstra + OSM/OSRM | Core metro routing algorithm and road-following APIs. |

---

## 📁 Project Structure

```
project_major/
├── server/                           # Backend API Source
│   ├── src/
│   │   ├── index.js                  # Express Entrypoint & API server config
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT verification middleware
│   │   ├── models/
│   │   │   ├── User.js               # User authentication Schema
│   │   │   ├── Station.js            # Metro Station graph node Schema
│   │   │   └── TripHistory.js        # Journey & route history Schema
│   │   ├── routes/
│   │   │   ├── auth.js               # Sign up, Log in, Profile management
│   │   │   ├── stations.js           # Station retrieval & details
│   │   │   ├── route.js              # Dijkstra metro route calculations
│   │   │   ├── compare.js            # Metro vs. Cab vs. Hybrid comparisons
│   │   │   └── location.js           # OSM geocoding & autocomplete suggestions
│   │   ├── seed/
│   │   │   ├── seedHelper.js         # Raw coordinate mapping of lines
│   │   │   └── seedStations.js       # Main metro database seed script
│   │   └── utils/
│   │       ├── db.js                 # MongoDB connection handler
│   │       └── dijkstra.js           # Dijkstra graph traversal solver
│   ├── .env                          # Backend Environment Config
│   └── package.json
│
├── client/                           # Frontend Client Source (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth.jsx              # Sign-in/Sign-up panel
│   │   │   ├── MetroMap.jsx          # Leaflet Metro Map visualization
│   │   │   ├── RoutePlanner.jsx      # Autocomplete search & route result list
│   │   │   └── UserProfile.jsx       # User home/location preferences page
│   │   ├── App.jsx                   # React root & state orchestration
│   │   ├── index.css                 # Custom Tailwind styling & layout imports
│   │   └── main.jsx                  # React DOM mount point
│   ├── vite.config.js
│   └── package.json
│
└── csv/                              # Machine Learning Models & Datasets
    ├── uber_trips_dataset_50k.csv    # 50,000 Uber trips raw dataset
    ├── train_model.py                # RandomForest fare training script
    ├── predict.py                    # Node-accessible fare prediction parser
    ├── fare_predictor_model.pkl      # Serialized Scikit-Learn Model
    └── price_variation_by_hour.png   # ML-generated price-by-hour visual plot
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (running locally or Atlas cluster)
- Python 3.8+ (with pip)

---

### 📦 Setup Guide

#### 1. Machine Learning Model Setup & Training

First, set up your Python environment and install the required data-science packages. From the root directory:

```bash
# Install Python dependencies
pip3 install pandas numpy scikit-learn joblib matplotlib

# Train the Random Forest Regressor model (this generates the pkl and visualization)
python3 csv/train_model.py
```

*Note: The model evaluates with a Mean Absolute Error (MAE) of ~₹25 and saves a visualization at [price_variation_by_hour.png](file:///Users/tanmaymac/Project/project_major/csv/price_variation_by_hour.png).*

#### 2. Backend Server Setup

Navigate into the server folder, configure your environment, and seed the metro database:

```bash
cd server

# Install node dependencies
npm install

# Create/Edit the .env file with your configurations
# Example contents of server/.env:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/nammaroute
# JWT_SECRET=supersecrettokenkey

# Seed 61 metro stations into MongoDB
npm run seed

# Run the backend in development mode (with hot reloading)
npm run dev
```

The backend API is now running at `http://localhost:5000`.

#### 3. Frontend Client Setup

Navigate to the client folder, install dependencies, and start Vite's local dev server:

```bash
cd ../client

# Install frontend dependencies
npm install

# Run Vite dev server
npm run dev
```

Vite will serve the frontend at `http://localhost:5173`. Make sure to navigate there in your browser to interact with the map, register a user, search locations, and calculate routes!

---

## ⚙️ How Multi-Modal Compare Works

When you enter a search from point **A** to point **B**:
1. **OSM geocoding** resolves the latitude and longitude coordinates.
2. The server locates the nearest Metro stations to point **A** (start station) and point **B** (end station).
3. The server runs **Dijkstra's Algorithm** to compute the metro ride between those stations.
4. The server hits the **OSRM API** to find the exact road distance between **A** and **B**.
5. The Node.js comparison router invokes the python script `predict.py` which loads the trained Random Forest model to predict the cab price based on hour of day and distance.
6. The engine aggregates walking buffers, fares, and travel times to present a sorted comparison of **Metro**, **Direct Uber**, and **Hybrid Cab-Metro** options.

---

## 🏁 Development Phases

- [x] **Phase 1**: Architecture & Database Setup
- [x] **Phase 2**: Backend API & Routing Algorithm
- [x] **Phase 3**: Frontend Interface
- [x] **Phase 4**: Integration, Multi-Modal Comparison & Polish