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

- Role-based dashboards and routing (via rolePages.ts)
- Login and registration flows
- Attendance and log pages with role-scoped data
- QR Scanner page (security roles)
- QR code display in Profile (all users)
- QR request management
- Analytics dashboard
- Alert notification board
- Security chat and system incident feed
- Work Schedule management
- Special Schedule management (WFH, holidays, exemptions)
- Responsive layouts for mobile, tablet, and desktop

## Project Structure

```text
src/
├── components/
│   ├── RoleGuard.tsx
│   ├── Sidebar.tsx
│   └── ...
├── contexts/
│   └── AuthContext.tsx (with hasAccess helper)
├── hooks/
├── pages/
│   ├── security/
│   │   └── QRScanner.tsx
│   ├── Dashboard/
│   ├── Logs/
│   └── ...
├── services/
│   ├── scanService.ts
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
- AuthContext provides `hasAccess(roles, subRoles)` helper for role checks

## Role-Based Access

### New: RoleGuard Component

```tsx
<RoleGuard 
  allowedRoles={["Staff"]} 
  allowedSubRoles={["security_head", "security_staff"]}
>
  <QRScanner />
</RoleGuard>
```

### Role Navigation (rolePages.ts)

The sidebar dynamically renders menu items based on user's subRole:

| subRole | Pages |
|---------|-------|
| superadmin | **Archive & Recovery**, Backup, CSV Upload, Analytics, Logs, Alerts, Chat, Profile |
| top_management | Analytics, Alerts, Chat, Profile |
| dean | Dashboard, Attendance, Analytics, User Management, Profile |
| department_head | Dashboard, Attendance, User Management, Work Schedules, Profile |
| faculty | Dashboard, Attendance, My QR, Profile |
| hr_head | Dashboard, Attendance, User Management, Analytics, Work Schedules, Special Schedules, Profile |
| hr_staff | Dashboard, Attendance, User Management, Analytics, Profile |
| security_head | Dashboard, Logs, Attendance, QR Scanner, Work Schedules, User Management, Alerts, Chat, Profile |
| security_staff | Dashboard, Logs, Attendance, QR Scanner, Alerts, Chat, Profile |
| maintenance | Dashboard, Attendance, My QR, Profile |
| non_academic | Dashboard, Attendance, My QR, Profile |
| staff | Dashboard, Attendance, My QR, Profile |
| Student | Dashboard, Logs, Attendance, My QR, Profile |
| Visitor | Dashboard, Logs, Attendance, My QR, Profile |

## New Administrative Modules

### Archive & Recovery (src/pages/admin/Archive.tsx)

- **Purpose**: Fail-safe hub for Superadmins to restore data and maintain DPA 2012 traceability.
- **Tabs**:
  - **Archived Users**: Restore `Inactive` or `Suspended` users.
  - **Rejected QR Requests**: Re-approve previously rejected QR UUID regenerations.
  - **Rejected Photo Requests**: Approve previously denied profile picture updates.
- **Audit Requirement**: Every restoration action requires a mandatory administrative reason, which is logged to the backend's forensic audit trail.

### Photo Verification (src/pages/admin/PhotoRequestsPage.tsx)

- **Purpose**: Manual verification of profile photo change requests initiated by users.
- **DPA Compliance**: Ensures that biometric-related data (profile photos) are reviewed by authorized HR personnel before being committed to the permanent record.


## New Pages

### QR Scanner (security/QRScanner.tsx)

- Available to: security_head, security_staff
- Action selector: Time In / Break Start / Break End / Time Out / Go Out / Go In / Transaction Start / Transaction End
- Manual code entry option
- Plates number field
- "Approved By" field for maintenance go-out

### My QR Code

- Available to: all authenticated users
- Displays QR code from user.qrCode field
- Download QR as PNG option
- Request QR change via modal

### Attendance Logs

- Role-scoped data:
  - Own: all users
  - Department: department_head
  - College: dean
  - All: hr_head, hr_staff, security_head, security_staff

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
- `/dashboard` (redirects to role-specific dashboard)
- `/staff/*`
- `/security/*` (includes `/scanner`)
- `/user/*`
- `/admin/*` (User Management, Work Schedules, Special Schedules, Analytics)
- `/alerts`
- `/chat`
- `/profile` (includes QR code display)
- `/my-qr`

## Deployment Notes

For Vercel or another static host:

- set `VITE_API_URL` to your deployed backend
- make sure backend CORS allows the deployed frontend origin
- backend WebSocket host must match the deployed backend domain

## Known Dev Note

The project build should pass with:

```bash
npm run build
```
