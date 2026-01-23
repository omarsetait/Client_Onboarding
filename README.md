# TachyHealth Autonomous Client Onboarding System

**AI-Powered Lead-to-Subscription Automation Platform**

TachyHealth automates the entire client acquisition lifecycle—from the first touchpoint to contract signing. By leveraging AI for proposal generation and self-service tools for scheduling, it reduces sales friction and accelerates onboarding.

---

## 🌟 Key Features

### 1. 📢 Public Lead Intake
- **Smart Forms**: Embeddable forms to capture leads (Name, Company, Interests).
- **Auto-Segmentation**: Leads are categorized based on product interest (AI Audit, Pharma Analytics, Code Review).
- **Public API**: `POST /api/v1/public/leads/intake`

### 2. 📄 AI-Powered Document Generation
- **Instant Proposals**: Automatically generates personalized PDF brochures/proposals based on lead interests.
- **Dynamic Content**: Injects lead-specific details into professional templates.
- **Auto-Delivery**: Emails the proposal immediately after inquiry.

### 3. 📅 Self-Service Booking System
- **Interactive Calendar**: Microsoft Teams-style weekly grid for scheduling discovery calls.
- **Smart Availability**: Real-time checking of sales rep calendars to prevent double-booking.
- **Automated Coordination**:
    - Assigns meetings to available reps (Round Robin).
    - Sends **Confirmation Emails** with **ICS Attachments** and **Calendar Links**.
    - Syncs with Internal Admin Dashboard.

### 4. 🎛️ Admin Dashboard
- **Kanban Board**: Drag-and-drop lead management pipeline.
- **Calendar View**: Centralized view of all team meetings.
- **Analytics**: Insights into conversion rates and pipeline health.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v20+
- **Docker** & Docker Compose
- **PostgreSQL** v15+

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Setup Environment
cp .env.example .env

# 3. Start Infrastructure (DB, Redis)
npm run docker:up

# 4. Run Migrations
npm run db:migrate

# 5. Start Development Servers
npm run dev
```

The system will launch at:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`
- **Booking Page**: `http://localhost:3000/book-demo`

---

## 🏗️ System Architecture

The project is structured as a **Monorepo** using TurboRepo features.

```
tachyhealth-onboarding/
├── apps/
│   ├── api/             # NestJS Backend (REST API, Cron, Queues)
│   │   ├── modules/
│   │   │   ├── lead/          # Lead Capture & Management
│   │   │   ├── documents/     # PDF Generation Service
│   │   │   ├── calendar/      # Booking & Scheduling Logic
│   │   │   └── communication/ # Email & Notification Service
│   │   └── generated-documents/ # Storage for generated PDFs
│   ├── web/             # React Frontend (Vite, MUI, Redux)
│   └── worker/          # Background Job Processor (BullMQ)
├── packages/
│   ├── database/        # Prisma Schema & Client
│   └── shared/          # Shared DTOs, Types, and Utils
```

---

## 🔌 API Reference

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/public/leads/intake` | Submit a new lead inquiry |
| `GET` | `/public/calendar/availability` | Get available meeting slots (14 days) |
| `POST` | `/public/calendar/book` | Schedule a meeting & send invites |

### Core Modules
- **Calendar Service**: Manages slots, conflicts, and ICS generation.
- **Email Service**: Handles SendGrid integration and template rendering.
- **Document Service**: Uses `pdf-lib` to construct dynamic PDFs.

---

## 📚 Developed By
**TachyHealth Engineering Team**
© 2026 TachyHealth. All rights reserved.
