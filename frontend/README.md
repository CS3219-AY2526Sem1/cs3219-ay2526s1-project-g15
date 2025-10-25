# PeerPrep Frontend

The PeerPrep Frontend is a React-based web application that provides the user interface for the PeerPrep platform — a collaborative coding interview preparation tool. It features authentication, real-time peer matching, collaborative code editing and comprises of a comprehensive list of interview questions for users to practice with.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18+ |
| Routing | React Router DOM |
| Styling | Tailwind CSS |
| Components | Custom UI + Shadcn/UI |
| Code Editor | Monaco Editor |
| API Calls | Fetch API via `shared/api` utilities |
| Containerisation | Docker |
| Reverse Proxy | Nginx (configured via base repository) |

## Project Structure

```
frontend/
├── src/
│   ├── app/               # Core app structure and routes
│   ├── features/          # Feature-based modules
│   │   ├── admin/         # Admin dashboard & question management
│   │   ├── auth/          # Login, register, email verification
│   │   ├── home/          # Home page 
│   │   ├── profile/       # Edit Profile page 
│   │   ├── session/       # Collaboration session/room 
│   ├── shared/            # Reusable components and utilities     
├── index.css              # Global CSS + Tailwind imports
├── index.js               # React entry point
├── Dockerfile             # Container setup for Nginx serving build
├── nginx.conf             # Gateway proxy config
├── package.json
├── README.md
└── tailwind.config.js
```

## Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# API Configuration
REACT_APP_API_BASE=/api/v1
```

> **Note:** In production, all `/api/v1/...` requests are automatically proxied through Nginx to their respective backend services.

## Development Setup

### Prerequisites

- Node.js 16+ and npm
- Docker (for containerized deployment)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm start
```

This runs the frontend on `http://localhost:3000` by default.

### 3. Build for Production

```bash
npm run build
```

This generates the optimized production build in the `/build` folder, which is then served by Nginx when running via Docker.

## Docker Setup

The frontend is fully containerized and integrated with the main project's `docker-compose.yml`.

### Build and Run

```bash
# From the base repository
docker compose build
docker compose up
```

This will:
- Build the React app (`npm run build`)
- Serve the built app through Nginx
- Proxy API requests to the appropriate microservices:
  - `/api/v1/users/` → User Service
  - `/api/v1/questions/` → Question Service
  - `/api/v1/matching/` → Matching Service

## Key Features

### Authentication
- User login and registration
- Email verification
- Password reset functionality
- Role-based access control (User / Admin)

### Matching & Collaboration
- Real-time peer matching via matching service
- Integrated collaborative code editor powered by Monaco
- Live code synchronization between matched peers

### Question Management (Admin)
- Add, edit, and delete coding questions
- Manage question topics, difficulty levels, constraints, and examples
- Full CRUD operations for interview questions

### Gateway Integration
- All API routes automatically proxied through Nginx
- Seamless endpoint routing between development and production
- Centralized API management

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run React development server |
| `npm run build` | Create production build |
| `npm test` | Run available tests |
| `npm run lint` | Lint codebase |
| `npm run format` | Format code using Prettier |

## API Structure (via Gateway)

| Service | Base Path | Example Endpoint |
|---------|-----------|------------------|
| User Service | `/api/v1/users` | `/api/v1/users/login` |
| Question Service | `/api/v1/questions` | `/api/v1/questions/all` |
| Matching Service | `/api/v1/matching` | `/api/v1/matching/health` |

## Best Practices

- **Always route through the gateway** for backend communication
- Use **lowercase difficulty keys** (`easy`, `medium`, `hard`) to match backend schema
- Use **environment variables** for all external endpoints
- Keep **Docker and Nginx configuration** consistent with production
- Follow **feature-based architecture** for better code organization
- Implement **proper error handling** for all API calls

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `404` on `/api/v1/...` | Check Nginx gateway routes and backend service ports |
| Frontend not updating after rebuild | Clear browser cache or rebuild Docker image |
| Admin dashboard not fetching questions | Ensure `question-service` is healthy and accessible at `/api/v1/questions` |
| Monaco Editor not loading | Verify Monaco Editor CDN is accessible or check local build |
| Authentication issues | Clear localStorage/cookies and verify JWT token validity |

