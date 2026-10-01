# ReachInbox Full-stack Email Job Scheduler

## Architecture Overview
This is a production-grade email scheduler mimicking the core logic of an email outreach system.
- **Backend:** Express.js + Prisma + PostgreSQL + Redis + BullMQ + Elasticsearch.
- **Frontend:** Next.js (App Router) + Tailwind CSS + NextAuth (Google).

### How Scheduling Works
When an email is composed on the frontend, it posts to the `/api/schedule` endpoint. The backend creates an `EmailJob` record in PostgreSQL (with a `PENDING` state) and indexes it in Elasticsearch for fast search. It then pushes a job onto a `BullMQ` queue using delayed jobs. BullMQ stores the queue data in Redis. When the time arrives, the worker processes the job and sends the email using `nodemailer` and Ethereal Email SMTP.

### Persistence on Restart
BullMQ natively uses Redis for job persistence, and Prisma uses PostgreSQL for application state. If the Node.js server goes down, Redis retains the delayed set and queue. When the server restarts and the worker re-connects, BullMQ will seamlessly pick up any delayed jobs whose timers have expired, ensuring no jobs are lost or duplicated from day 1. Database idempotency is enforced by passing `jobId` to BullMQ.

### Rate Limiting & Concurrency
- **Concurrency:** The BullMQ worker is instantiated with a configurable `concurrency` option (e.g., `concurrency: 5`), allowing parallel execution.
- **Delay Between Each Email:** A BullMQ `limiter` is configured on the worker (e.g., `max: 1`, `duration: 2000`) to enforce a minimum 2-second delay between processed emails globally.
- **Hourly Limit (Per Sender):** 
  - Monitored using Redis key-value expiration counters (`rate-limit:{userId}:{currentHour}`).
  - When the hourly threshold is hit (e.g., `MAX_EMAILS_PER_HOUR=200`), the worker uses BullMQ's native `DelayedError` mechanism (`throw new DelayedError(delayMs)`).
  - This preserves the job's state and pushes it back into the delayed queue exactly until the start of the next hour window without permanently failing or losing the job!
  - When the limit is hit, an Axios POST request sends a notification to the user's Slack webhook/token channel.

---

## Features Implemented
### Backend
- ✅ **Scheduler:** Uses BullMQ delayed jobs backed by Redis (No Cron).
- ✅ **Persistence:** Jobs survive server restarts by remaining in Redis and DB.
- ✅ **Rate Limiting:** Enforces `MAX_EMAILS_PER_HOUR` per user using Redis counters and BullMQ `DelayedError`.
- ✅ **Concurrency:** Worker processes multiple jobs safely; BullMQ limiter spaces emails.
- ✅ **Elasticsearch:** All scheduled and sent emails are indexed into ES. The `/api/emails/search` API queries this index.
- ✅ **Bull Board:** Real-time visibility at `http://localhost:3001/admin/queues`.
- ✅ **Slack Notifications:** When the hourly limit is hit, a Slack message is triggered.

### Frontend
- ✅ **Google Login:** Real OAuth via `next-auth`.
- ✅ **Dashboard Layout:** Matches Figma (Sidebar + Core navigation).
- ✅ **Compose:** Supports subject, body, date scheduling, and CSV/Text parsing for multiple leads!
- ✅ **Tables:** Dedicated tabs for Scheduled (Pending) and Sent (Completed/Failed) emails with real-time fetching.

---

## How to Run

### 1. Start Infrastructure (Docker)
Ensure Docker Desktop is running, then spin up PostgreSQL, Redis, and Elasticsearch.
```bash
docker-compose up -d
```

### 2. Backend Setup
```bash
cd backend
npm install
# Push DB Schema and generate Prisma Client
npx prisma db push
npx prisma generate
```

Edit `backend/.env` with your Ethereal credentials and Slack Token (if applicable):
```env
SMTP_USER="your-ethereal-user@ethereal.email"
SMTP_PASS="your-ethereal-password"
MAX_EMAILS_PER_HOUR=200
```
Start the backend server (runs on Port 3001):
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Edit `frontend/.env.local` to add your Google OAuth Credentials:
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```
Start the Next.js app (runs on Port 3000):
```bash
npm run dev
```

### Testing the App
1. Go to `http://localhost:3000/login` and Login via Google.
2. Click "Compose" to write an email and schedule it. (Upload a list of emails).
3. View the pending emails in "Scheduled".
4. Monitor the queue visually at `http://localhost:3001/admin/queues`.
5. Check Ethereal inbox to see the sent messages.
