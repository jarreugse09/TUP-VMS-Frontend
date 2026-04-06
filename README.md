# TUP VMS Frontend

React + TypeScript frontend for the TUP Visitation Management System (VMS). This app provides the user interface for dashboards, attendance, logs, QR requests, analytics, alerts, and chat across admin, staff, security, student, and visitor flows.

## Tech Stack

- React 18
- TypeScript
- Vite
- Ant Design
- React Router
- Axios
- Recharts
- Styled Components

## Core Features

- Role-based dashboards and routing
- Login and registration flows
- Attendance and log pages
- QR request management
- Analytics dashboard
- Alert notification board
- Security chat and system incident feed
- Responsive layouts for mobile, tablet, and desktop

## Project Structure

```text
src/
├── components/
├── contexts/
├── hooks/
├── pages/
├── services/
├── styles/
├── App.tsx
└── main.tsx
```

## Environment Variables

Create `.env.local` in this folder:

```env
VITE_API_URL=http://localhost:5000/api
```

Notes:

- `VITE_API_URL` must include `/api`
- for production, set it to your deployed backend URL, for example:

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

## Authentication

- JWT token is stored in `localStorage`
- Axios automatically sends `Authorization: Bearer <token>` through [api.ts](./src/services/api.ts)

## Real-Time Features

The frontend connects to the backend WebSocket for:

- new alerts
- unread badge updates
- alert read/status updates
- chat messages
- system incident feed for security users

## Routing Overview

Main route groups handled in [App.tsx](./src/App.tsx):

- `/login`
- `/register`
- `/dashboard`
- `/staff/*`
- `/security/*`
- `/user/*`
- `/alerts`
- `/chat`
- `/profile`

## Deployment Notes

For Vercel or another static host:

- set `VITE_API_URL` to your deployed backend
- make sure backend CORS allows the deployed frontend origin
- backend WebSocket host must match the deployed backend domain

## Current Dev Note

The project currently has some existing TypeScript unused-import issues in unrelated files, so `npm run build` may fail until those are cleaned up. The responsive shell and alert/chat work are already integrated in the app code.
