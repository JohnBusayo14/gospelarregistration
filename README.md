# Gospelar Registration

Web app for registering attendees to Christian retreats, camps, and church events.
Part of the Gospeler monorepo; matches the stack of `maindashboard` and `churchdashboard`.

## Stack

- Vite 6 + React 18
- React Router v6
- Tailwind CSS 3
- lucide-react icons

## Screens

| Route                          | Screen          | Purpose            |
| ------------------------------ | --------------- | ------------------ |
| `/`                            | Home            | Event landing      |
| `/events`                      | Events          | All retreats       |
| `/events/:id`                  | Event Details   | Registration info  |
| `/events/:id/register`         | Register        | Attendee form      |
| `/tickets`                     | Tickets         | Ticket management  |
| `/dashboard`                   | Dashboard       | User account       |
| `/admin`                       | Admin Dashboard | Event management   |
| `/admin/events/new`            | New event       | Admin: create      |
| `/admin/events/:id/edit`       | Edit event      | Admin: edit/delete |
| `/check-in`                    | Check-In        | QR scanning        |

## Develop

```bash
npm install
npm run dev        # vite on :5175
npm run build
```

## Backend

The frontend expects the Express backend at `http://localhost:5000`
(override with `VITE_API_BASE`). The required endpoints are documented in
[`BACKEND_ENDPOINTS.md`](./BACKEND_ENDPOINTS.md) — they do not yet exist on
`backend/server.js`. While missing, every page automatically falls back to
mock data from `src/mockData.js`, so the UI is fully usable today.
