# Frontend

The Frontend is the user-facing React application for PeerPrep. This guide helps developers set up and test the frontend for integration with backend services.

## Overview

- Technology: React 18, Tailwind CSS, Monaco Editor
- Port: 3000 (development), 8080 (production via Nginx)
- Build: Create React App with production optimization
- Deployment: Docker with Nginx reverse proxy

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 |
| Routing | React Router DOM |
| Styling | Tailwind CSS |
| Code Editor | Monaco Editor |
| API Calls | Fetch API |
| Build Tool | Create React App |
| Production Server | Nginx |
| Containerization | Docker |

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Core app structure
│   │   ├── App.jsx             # Main application component
│   │   └── routes.jsx          # Route definitions
│   ├── features/               # Feature modules
│   │   ├── admin/              # Admin dashboard & management
│   │   ├── auth/               # Authentication pages
│   │   ├── history/            # Session history
│   │   ├── home/               # Landing page
│   │   ├── profile/            # User profile management
│   │   └── session/            # Collaboration session
│   ├── shared/                 # Reusable components
│   │   ├── api/                # API utilities
│   │   ├── auth/               # Auth utilities
│   │   ├── components/         # Shared UI components
│   │   ├── hooks/              # Custom React hooks
│   │   └── utils/              # Helper functions
│   ├── index.css               # Global styles
│   └── index.js                # React entry point
├── public/
│   └── index.html              # HTML template
├── build/                      # Production build output
├── Dockerfile                  # Container configuration
├── nginx.conf                  # Nginx reverse proxy config
├── package.json
├── tailwind.config.js
└── README.md
```

## Quick Start

### From Root Project

```powershell
# Start all services (includes frontend)
docker compose up -d

# Access frontend
# Navigate to: http://localhost:8080
```

### Development Mode

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Access at http://localhost:3000
```

### Production Build

```powershell
# Build for production
npm run build

# Build output is in ./build directory
```

## Environment Configuration

Create a `.env` file in `frontend/`:

```env
# API Configuration
REACT_APP_API_BASE=/api/v1

# WebSocket Configuration (optional)
REACT_APP_WS_BASE=ws://localhost

# Environment
REACT_APP_ENV=development
```

Note: In production, API requests to `/api/v1/*` are automatically proxied through Nginx to the appropriate backend services.

## API Integration

### API Base URL

All backend API calls use the base path `/api/v1`:

```javascript
// Example API call
const response = await fetch('/api/v1/users/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Service Endpoints

| Service | Base Path | Example |
|---------|-----------|---------|
| User Service | `/api/v1/users` | `/api/v1/users/me` |
| Question Service | `/api/v1/questions` | `/api/v1/questions/1` |
| Matching Service | `/api/v1/matching` | `/api/v1/matching/request` |
| Collaboration | `/api/v1/ws/session/active/` | WebSocket connection |

### API Utility

Located in `src/shared/api/`, provides helpers for API calls:

```javascript
import { apiClient } from 'shared/api';

// GET request
const data = await apiClient.get('/users/me');

// POST request
const result = await apiClient.post('/auth/login', {
  email: 'user@example.com',
  password: 'password'
});
```

## Docker Setup

### Building the Image

```powershell
# From frontend directory
docker build -t peerprep-frontend .

# Or from root using docker-compose
docker compose build gateway
```

### Running with Docker Compose

The frontend is served through the gateway service in docker-compose:

```yaml
gateway:
  image: nginx:alpine
  ports:
    - "8080:80"
  volumes:
    - ./gateway/nginx.dev.conf:/etc/nginx/nginx.conf:ro
    - ./frontend/build:/usr/share/nginx/html:ro
```

## Development Workflow

### Installing Dependencies

```powershell
npm install
```

### Available Scripts

```powershell
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Eject from Create React App (irreversible)
npm run eject
```

### Development Server

The development server includes:
- Hot reload on file changes
- Error overlay in browser
- Proxy configuration for API requests (via setupProxy.js)

### Proxy Configuration

In development, API requests are proxied to backend services:

```javascript
// src/setupProxy.js
module.exports = function(app) {
  app.use('/api/v1/users', createProxyMiddleware({
    target: 'http://localhost:8001',
    changeOrigin: true
  }));
  // ... other services
};
```

## Building for Production

### Production Build Process

```powershell
npm run build
```

This creates an optimized build with:
- Minified JavaScript
- Optimized CSS
- Hashed filenames for caching
- Source maps for debugging

### Build Output

```
build/
├── index.html              # Main HTML file
├── asset-manifest.json     # Asset mapping
└── static/
    ├── css/                # Compiled CSS
    ├── js/                 # Compiled JavaScript
    └── media/              # Images and fonts
```

## Nginx Configuration

The production Nginx configuration (`nginx.conf`) handles:

### Static File Serving

```nginx
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

### API Proxying

```nginx
location /api/v1/users/ {
    proxy_pass http://user-service:8001/;
}

location /api/v1/questions/ {
    proxy_pass http://question-service:8003/;
}

location /api/v1/matching/ {
    proxy_pass http://matching-service:8002/api/v1/matching/;
}
```

### WebSocket Support

```nginx
location /api/v1/ws/ {
    proxy_pass http://collaboration-service:8004/api/v1/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Key Features

### Authentication
- User registration and login
- JWT token management
- Automatic token refresh
- Protected routes
- Role-based access (User/Admin)

### Matching
- Real-time peer matching interface
- Difficulty and topic selection
- WebSocket connection for instant notifications
- Match confirmation flow

### Collaboration
- Monaco-based code editor
- Real-time code synchronization
- Multi-language support
- Collaborative chat
- Cursor position tracking

### Question Management (Admin)
- CRUD operations for questions
- Topic and difficulty management
- Question activation/deactivation
- Rich text editing for descriptions

### Session History
- View past collaboration sessions
- Filter by date and difficulty
- Review submitted code

## Common Development Tasks

### Adding a New Page

1. Create component in appropriate feature directory
2. Add route in `src/app/routes.jsx`
3. Add navigation link if needed

### Adding API Endpoint

1. Add endpoint in `src/shared/api/`
2. Use apiClient for consistent error handling
3. Include proper authentication headers

### Styling Components

Uses Tailwind CSS utility classes:

```jsx
<div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
  <h2 className="text-xl font-bold">Title</h2>
</div>
```

## Testing

### Running Tests

```powershell
# Run tests in watch mode
npm test

# Run tests with coverage
npm test -- --coverage

# Run all tests once
npm test -- --watchAll=false
```

### Test Structure

Tests are located alongside components:

```
src/features/auth/
├── Login.jsx
└── Login.test.jsx
```

## Troubleshooting

### Development Server Won't Start

```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Clear cache
npm cache clean --force
```

### API Requests Failing

- Verify backend services are running: `docker compose ps`
- Check proxy configuration in `setupProxy.js`
- Verify API base URL in `.env`
- Check browser console for CORS errors
- Ensure authentication token is valid

### Build Errors

```powershell
# Clear build cache
Remove-Item -Recurse -Force build
Remove-Item -Recurse -Force node_modules/.cache

# Rebuild
npm run build
```

### Docker Build Issues

```powershell
# Rebuild without cache
docker compose build --no-cache gateway

# Check build logs
docker compose logs gateway
```

### Nginx 404 Errors

- Ensure build directory exists and is populated
- Check Nginx configuration syntax
- Verify volume mounts in docker-compose.yml
- Check Nginx logs: `docker compose logs gateway`

### WebSocket Connection Failed

- Verify Collaboration Service is running
- Check WebSocket URL format
- Ensure Nginx WebSocket proxy is configured
- Check browser console for connection errors

## Production Deployment

### Environment Variables

Set production environment variables:

```env
REACT_APP_API_BASE=/api/v1
REACT_APP_ENV=production
```

### Building for Production

```powershell
# Build optimized production bundle
npm run build

# Test production build locally
npx serve -s build -l 3000
```

### Docker Production Build

```powershell
# Build production image
docker compose build gateway

# Deploy with docker-compose
docker compose up -d gateway
```

## Performance Optimization

### Code Splitting

React Router automatically splits routes:

```javascript
const AdminDashboard = lazy(() => import('./features/admin/Dashboard'));
```

### Asset Optimization

- Images compressed and optimized
- CSS minified and bundled
- JavaScript minified with source maps
- Lazy loading for routes and components

### Caching Strategy

Nginx configured with caching headers:

```nginx
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## Additional Resources

- React Documentation: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- Monaco Editor: https://microsoft.github.io/monaco-editor/

