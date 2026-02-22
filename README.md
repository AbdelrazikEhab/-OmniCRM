# 🏥 OmniCRM Inbox — Production-Minded Technical Assessment

A high-traffic, multi-tenant messaging + CRM platform designed for medical clinics. This project demonstrates production patterns for data isolation, role-based access control (RBAC), and asynchronous event processing using a queue/worker architecture.

---

## 🛠 1. How to Run the System

### Option A: The "Production" Way (Docker)
This is the recommended way. It boots up PostgreSQL, Redis, the Backend API, the Queue Worker, and the Next.js Frontend in a single command.

```bash
docker compose up --build
```
- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:4000](http://localhost:4000)
- **Health Check:** [http://localhost:4000/health](http://localhost:4000/health)

### Option B: Local Development (Manual)
If you need to run services individually for debugging:

1. **Prerequisites:** Install PostgreSQL and Redis locally.
2. **Database:** Create a database named `crm_inbox`.
3. **Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npx prisma migrate dev
   npm run db:seed
   npm run dev
   ```
4. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🧠 2. System Logic & Architecture

### High-Level Flow
1. **Inbound Message:** A simulated WhatsApp webhook hits the `/webhooks/whatsapp` endpoint.
2. **Immediate Success:** The API validates the payload and returns `200 OK` instantly, ensuring zero message loss even under high load.
3. **Queueing:** The message is pushed into a **BullMQ** queue (backed by Redis).
4. **Worker Processing:** An background worker picks up the job, performs idempotency checks, creates leads if they don't exist, and stores the message.
5. **Auto-Assignment:** If the lead is new, the worker automatically assigns it to the **least-loaded agent** in that specific tenant.
6. **UI Polling:** The Next.js frontend polls the API every few seconds to reflect the new state (leads/messages).

### Data Isolation (Multi-Tenancy)
Isolation is **Query-Level**, not just UI-level. 
- The `User` record contains a `tenantId`.
- Upon login, this `tenantId` is embedded in the JWT.
- Every API route (except Public Webhooks) uses an `authenticate` middleware that extracts the `tenantId`.
- Every Prisma query (e.g., `prisma.lead.findMany({ where: { tenantId } })`) explicitly filters by this ID.
- **Result:** It is technically impossible for a user in Tenant A to fetch data from Tenant B, even if they guess a Lead UUID.

### RBAC (Role-Based Access Control)
Rules are enforced in the `leadsRouter` and `messagesRouter`:
- **ADMIN**: Can see all leads in their tenant and reassign them.
- **AGENT**: Can only see leads that are explicitly assigned to them.
- **Middleware**: A `requireRole('ADMIN')` guard prevents Agents from accessing assignment endpoints.

---

## 🏗 3. Working with the Code

### Backend Structure (`/backend`)
- `src/routes/`: Contains Express routers for auth, leads, messages, and webhooks.
- `src/middleware/`: Contains JWT validation and RBAC logic.
- `src/workers/`: Contains the BullMQ worker logic for processing inbound messages.
- `src/lib/`: Instantiates singletons for Prisma and Redis/BullMQ.
- `prisma/schema.prisma`: The source of truth for the database.

### Frontend Structure (`/frontend`)
- `src/app/inbox/page.tsx`: The main dashboard logic (client-side).
- `src/lib/api.ts`: A typed wrapper around `fetch` for communicating with the backend.
- `src/app/globals.css`: Contains the entire custom design system (Variables, UI Components, Keyframes).

### Key Commands for Development
- **Migrate DB:** `npx prisma migrate dev --name <change_name>`
- **View DB:** `npx prisma studio` (Opens a UI to browse your data)
- **Seed DB:** `npm run db:seed`

---

## 📡 4. Testing the Webhook (Simulating WhatsApp)

You can trigger the worker and auto-assignment logic by sending a mock webhook request.

### Step 1: Send a message to Tenant 1
```bash
curl -X POST http://localhost:4000/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "messageId": "msg-unique-101",
    "phone": "+966500000099",
    "text": "Hello! I need medical help.",
    "timestamp": 1710000000
  }'
```

### Step 2: Observe Idempotency
Send the exact same request again. The system will recognize the `messageId` and return:
`{"status":"already_processed","message":"..."}`. No duplicate leads or messages will be created.

---

## 🔑 5. Seeded Logins

| Tenant | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **MediCare Clinic** | Admin | `admin@medicare.com` | `password123` |
| **MediCare Clinic** | Agent | `sarah@medicare.com` | `password123` |
| **HealthFirst Hospital** | Admin | `admin@healthfirst.com` | `password123` |

---

## 📊 6. Database Optimization
The system is built for scale with the following indexes:
- `(tenantId, phone)`: Unique index for lightning-fast lead lookups during webhook ingestion.
- `(tenantId, messageId)`: Unique index for reliable idempotency.
- `(tenantId, assignedToUserId)`: Index for fast filtering of Agent-assigned leads.
- `(leadId, createdAt)`: Index for smooth message history rendering.

---

---

## ✅ 8. How We Validate (Minimum Checklist)
- [x] **Admin login works**: Use `admin@medicare.com` / `password123`.
- [x] **Tenant isolation enforced**: Admin 1 cannot see leads from Tenant 2 (and vice versa).
- [x] **Agent restricted access**: Agent Sarah only sees leads assigned to her.
- [x] **Webhook Performance**: Returns `200` quickly, processing happens in BullMQ worker.
- [x] **Idempotency**: Retrying the same `messageId` returns `already_processed`.
- [x] **Auto-Assignment**: Unassigned leads are routed to the least-loaded agent.
- [x] **Inbox UI**: Displays leads, manages conversation status, and allows outbound messaging.

---

## 📡 9. Minimal API Notes

| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | Returns JWT with `tenantId`, `userId`, `role`. |
| `GET` | `/auth/me` | User | Verifies token and returns user/tenant data. |
| `GET` | `/leads` | User | List leads. Agents see only assigned leads. |
| `POST` | `/leads` | Admin | Create a new lead in the current tenant. |
| `PATCH`| `/leads/:id/assign` | Admin | Assign lead to a specific agent. |
| `GET` | `/leads/:id/messages` | User | Get conversation history for a lead. |
| `POST` | `/leads/:id/messages` | User | Send an outbound message. |
| `POST` | `/webhooks/whatsapp` | Public | Ingests WhatsApp messages (idempotent). |

---

## ⏱ 10. Time Tracking Requirement

**Total Time Spent:** 5.5 hours

**Rough Breakdown:**
- **Backend (3h):** Multi-tenancy logic, JWT/RBAC middleware, and API development.
- **Frontend (1.5h):** Inbox UI, status filtering, and conversation composer.
- **Queue/Worker (0.5h):** BullMQ integration and auto-assignment algorithm.
- **Testing & Cleanup (0.5h):** Webhook idempotency testing and Docker configuration.

**Trade-offs intentionally made:**
- **Polling over WebSockets**: Chose a 5-second polling interval for real-time updates to fit the 5-hour window.
- **Local Storage for JWT**: Used `localStorage` instead of HttpOnly cookies to keep the auth flow simple for review.
- **Simplified Auto-Assignment**: Uses a count of non-closed leads; does not account for agent shift status.
