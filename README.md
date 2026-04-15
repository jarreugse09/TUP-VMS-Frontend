# TUP VMS Frontend

React + TypeScript frontend for the TUP Visitation Management System (VMS). This app delivers dashboards, logs, scanner flows, analytics, alerts, and chat for admin, staff, security, student, and visitor roles.

## Tech Stack

- React 18
- TypeScript
- Vite
- Ant Design
- React Router
- Axios
- Styled Components

## Project Structure

```text
src/
├── components/
│   ├── RoleGuard.tsx
│   ├── Sidebar.tsx
│   └── ...
├── contexts/
│   └── AuthContext.tsx
├── hooks/
├── pages/
│   ├── auth/
│   ├── Dashboard/
│   ├── Logs/
│   ├── admin/
│   └── scanner/
├── services/
│   ├── api.ts
│   ├── authService.ts
│   └── ...
├── config/
│   └── rolePages.ts
├── App.tsx
└── main.tsx
```

## Environment Variables

Create `.env.local` in this folder:

```env
VITE_API_URL=http://localhost:5000/api
```

Notes:

- `VITE_API_URL` should include `/api` for staging and production.
- Local development can omit `VITE_API_URL` and the app will use `http://localhost:5000/api`.

## Run Locally

Install dependencies: `npm install`

Start dev server: `npm run dev`

Build: `npm run build`

Preview build: `npm run preview`

## Authentication

- JWT token stored in `localStorage`
- Axios adds `Authorization: Bearer <token>` via `services/api.ts`
- Role access is enforced by `RoleGuard` and `rolePages.ts`

## Role-Based UI Rendering

`rolePages.ts` determines navigation + page availability:

| subRole | Pages |
|---------|-------|
| superadmin | Dashboard, Attendance, Visit Logs, Transaction Logs, Action Logs, QR Requests, Scanner, My QR, Manage Users, Analytics, Work Schedules, Special Schedules, Alerts, Chat, Photo Requests, Backup, CSV Upload, Archive, Profile |
| top_management | Scanner, Dashboard, Attendance, Visit Logs, Transaction Logs, Action Logs, My QR, Analytics, Alerts, Chat, Profile |
| dean | Scanner, Dashboard, Attendance, Transaction Logs, Action Logs, My QR, Manage Users, Analytics, Profile |
| department_head | Scanner, Dashboard, Attendance, Transaction Logs, Action Logs, My QR, Manage Users, Analytics, Profile |
| non_academic | Scanner, Dashboard, Attendance, Transaction Logs, Action Logs, QR Requests, My QR, Analytics, Profile |
| hr_head | Dashboard, Attendance, Transaction Logs, Action Logs, QR Requests, My QR, Manage Users, Analytics, Work Schedules, Special Schedules, Photo Requests, CSV Upload, Profile |
| hr_staff | Dashboard, Scanner, Attendance, Transaction Logs, QR Requests, My QR, Manage Users, Analytics, Special Schedules, CSV Upload, Profile |
| faculty | Scanner, Dashboard, Attendance, Transaction Logs, Action Logs, My QR, Analytics, Profile |
| maintenance | Scanner, Dashboard, Attendance, Transaction Logs, Action Logs, My QR, Analytics, Profile |
| security_head | Dashboard, Attendance, Visit Logs, Transaction Logs, Action Logs, Scanner, My QR, QR Requests, Manage Users, Analytics, Work Schedules, Alerts, Chat, Profile |
| security_staff | Dashboard, Attendance, Visit Logs, Transaction Logs, Action Logs, Scanner, My QR, QR Requests, Manage Users, Analytics, Alerts, Chat, Profile |
| student | Dashboard, Visit Logs, Transaction Logs, Action Logs, QR Requests, My QR, Profile |
| visitor | Dashboard, Visit Logs, Transaction Logs, Action Logs, QR Requests, My QR, Profile |

## Routing System

Public auth routes:

- `/auth/student/login` and `/auth/student/register`
- `/auth/faculty/login` and `/auth/faculty/register`
- `/auth/department-head/login` and `/auth/department-head/register`
- `/auth/dean/login` and `/auth/dean/register`
- `/auth/top-management/login` and `/auth/top-management/register`
- `/auth/non-academic/login` and `/auth/non-academic/register`
- `/auth/hr/login` and `/auth/hr/register`
- `/auth/security/login` and `/auth/security/register`
- `/auth/superadmin/login` and `/auth/superadmin/register`

Core routes:

- `/dashboard`, `/staff/dashboard`, `/security/dashboard`, `/user/dashboard`
- `/scanner`
- `/attendance`, `/attendance/logs`
- `/logs/visitors`, `/logs/transactions`, `/logs/actions`
- `/alerts`, `/chat`, `/profile`, `/my-qr`

## QR Scanner Modes

- `mode="full"` for `security_head`, `security_staff`, `superadmin`
- `mode="client-only"` for all other roles

## API Integration Layer

All API calls use `services/api.ts`, which normalizes `VITE_API_URL` for staging and production and falls back to local development.

## State Management

`AuthContext` stores the logged-in user and token. Hooks under `src/hooks` handle real-time alerts and chat updates.

## Responsive Design

Layouts are optimized for mobile, tablet, and desktop using responsive spacing utilities and three-state sidebar behavior.

## Deployment Notes

- Set `VITE_API_URL` to the deployed backend URL with `/api`.
- Ensure backend CORS allows the deployed frontend origin.
- WebSocket host must match backend domain.
