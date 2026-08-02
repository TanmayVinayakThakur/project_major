# 🚇 NammaRoute — Bangalore Metro Route Finder

A full-stack ride/route interface app for the Bangalore Metro (Namma Metro) network.

## Tech Stack

| Layer          | Technology                       |
|----------------|----------------------------------|
| Frontend       | React.js + Tailwind CSS          |
| Backend        | Node.js + Express                |
| Database       | MongoDB + Mongoose               |
| Authentication | JWT + bcryptjs                   |
| Routing Algo   | Dijkstra's Algorithm             |

## Project Structure

```
project_major/
├── server/                    # Backend API
│   ├── src/
│   │   ├── index.js           # Express entry point
│   │   ├── models/
│   │   │   ├── User.js        # User schema (auth)
│   │   │   ├── Station.js     # Metro station graph node
│   │   │   └── TripHistory.js # Journey history
│   │   └── seed/
│   │       └── seedStations.js # Seed 61 metro stations
│   ├── .env                   # Environment config
│   └── package.json
├── client/                    # Frontend (Phase 3)
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd server
npm install

# Seed the database with 61 Bangalore Metro stations
npm run seed

# Start the development server
npm run dev
```

## Metro Network Coverage

- **Purple Line**: Challaghatta → Whitefield (24 stations)
- **Green Line**: Madavara → Silk Institute (26 stations)
- **Yellow Line**: R.V. Road → Bommasandra (11 stations)
- **Interchanges**: Majestic (Purple ↔ Green), R.V. Road (Green ↔ Yellow)

## Development Phases

- [x] **Phase 1**: Architecture & Database Setup
- [ ] **Phase 2**: Backend API & Routing Algorithm
- [ ] **Phase 3**: Frontend Interface
- [ ] **Phase 4**: Integration & Polish