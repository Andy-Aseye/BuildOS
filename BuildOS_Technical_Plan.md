# BuildOS — Technical Specification & Project Plan
**Version:** 1.1
**Date:** April 2026
**Status:** Pre-development — v1.1 adds Drawing Review, RFI Tracker, Materials Request, Delay Logging, and refined RBAC
**Author:** Rubicx Technologies Ltd.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Target Client Analysis — Building Ideas Limited](#2-target-client-analysis)
3. [Product Identity & Core Promise](#3-product-identity--core-promise)
4. [Feature Scope — v1](#4-feature-scope--v1)
   - Module 1: Project & Team Setup
   - Module 2: WhatsApp Intelligence Layer
   - Module 3: Dashboard — Portfolio View
   - Module 4: Dashboard — Project View
   - Module 5: Cost & Budget Tracking
   - Module 6: Daily Attendance Log
   - Module 7: Auto Progress Report (PDF)
   - Module 8: AI Query Bar
   - Module 9: Drawing Review & Approval Flow
   - Module 10: RFI Tracker
   - Module 11: Materials Request & Delivery Tracking
   - Module 12: Delay Logging & Cause Categorisation
   - Role-Based Access Control (RBAC)
5. [Technical Architecture](#5-technical-architecture)
6. [Tech Stack — Decisions & Rationale](#6-tech-stack--decisions--rationale)
7. [Database Schema](#7-database-schema)
8. [WhatsApp Integration Architecture](#8-whatsapp-integration-architecture)
9. [AI Layer](#9-ai-layer)
10. [API Structure](#10-api-structure)
11. [Folder Structure](#11-folder-structure)
12. [Deployment Strategy](#12-deployment-strategy)
13. [Environment Variables](#13-environment-variables)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [Pricing & Billing](#15-pricing--billing)
16. [Out of Scope — v1](#16-out-of-scope--v1)

---

## 1. Project Overview

**Product Name:** BuildOS
**By:** Rubicx Technologies Ltd.
**Market:** Ghana / West Africa — Construction & Architecture firms
**Stage:** v1 MVP — targeting first paying client (Building Ideas Limited)

### The Problem

Ghana's construction industry runs on WhatsApp groups and Excel spreadsheets. Field workers send photos, cost updates, daily reports, and attendance through WhatsApp. This information is unstructured, unsearchable, legally inadmissible, and disappears into chat history. Project Managers have no real-time visibility across multiple sites. MDs drive between sites because they have no other way to know what's happening.

### The Solution

BuildOS is the **structured intelligence layer** on top of what construction teams already do. Field workers keep using WhatsApp — exactly as they do now. BuildOS sits behind a dedicated WhatsApp Business number, receives every message, processes it with AI, and surfaces clean, structured, actionable data on a web dashboard.

No app download for field workers. No training. No behaviour change. The value appears automatically.

### Why This Approach Works

- **93% of Ghanaian construction firms use WhatsApp daily** for site coordination
- **58% of contractors are unaware construction apps exist** — new app adoption fails
- **Valoon (Germany)** validated this exact model in Europe — workers free, managers pay
- **Zero local competitors** — global tools (Procore, Autodesk) are unaffordable and ignore offline/WhatsApp reality
- **Building Ideas Limited** as anchor client provides real-world validation from day one

---

## 2. Target Client Analysis

### Building Ideas Limited — Profile

| Field | Detail |
|---|---|
| Type | Design & Build Construction Company |
| Location | Accra, Ghana |
| Founded | ~2010 |
| Team | CEO, QS/Director, Head Architect + field teams |
| Active Projects | 13+ simultaneous (as of 2021 profile) |
| Contract Range | GH₵94K – $6.8M |
| Currencies | GHS and USD |
| Client Types | Government (MOE, ECG, GOG), Private, Commercial |

### Management Team

| Person | Role | Software Relevance |
|---|---|---|
| Felix A. Sosu (CEO) | Construction Manager / On-site PM | Drives between multiple sites — needs multi-site visibility |
| Yaw Amaning Asante (Director) | Quantity Surveyor & Project Manager | Manages budgets and costs across 10+ projects — needs financial tracking |
| Arc. Agyemang-Ampromfi Poku | Senior Architect / Head Technical | Uses AutoCAD, Revit — needs design approval tracking and document management |

### Key Pain Points Identified

1. **Multi-site blindness** — CEO physically drives to sites to see what's happening. No real-time visibility.
2. **Budget overruns discovered late** — QS finds out costs are over budget at month-end, not mid-project when it can be fixed.
3. **Government client documentation** — MOE, ECG, GOG contracts require formal progress reports. Currently compiled manually.
4. **Concurrent project chaos** — 13+ active projects, all running via WhatsApp groups and Excel. No consolidated view.
5. **Delayed project completions** — almost all projects listed as "on-going" past expected completion dates.
6. **Multi-currency headache** — some contracts in USD, some in GHS, FX fluctuation affects budgets.

### What We Build for Building Ideas First

The product is designed around these three people's daily reality. Every v1 feature maps to a specific pain one of them has today.

---

## 3. Product Identity & Core Promise

**Tagline:** *Your site's WhatsApp — organised, documented, reportable.*

**Core Promise:**
Everything your team already sends on WhatsApp, automatically turned into professional project records.

**Primary Value Propositions:**

| For the MD (Felix) | For the QS/PM (Yaw) | For the Architect (Arc. Poku) |
|---|---|---|
| See all sites from one screen without driving there | Know real-time budget vs actual on every project | Store drawings, approvals, and revisions in one place |
| Know immediately which site has gone quiet | Get alerted before a project hits 80% budget | Generate client progress reports in one click |
| All site evidence documented automatically | Cost entries flow in from WhatsApp, auto-categorised | Photos from site linked to phases automatically |

---

## 4. Feature Scope — v1

### Module 1: Project & Team Setup

**Purpose:** Create the foundation each project is built on.

**Features:**
- Create a project with: name, client name, contract value (GHS / USD / both), start date, expected end date, assigned PM
- System auto-generates a unique project code (`#BIL-07`) used to route WhatsApp messages
- Add team members by phone number — they're registered the moment they first message the system
- Project status: Active / On Hold / Completed
- Multi-currency: set budget in GHS, USD, or both simultaneously

**Acceptance Criteria:**
- Project creation completes in under 2 minutes
- Project code is unique, human-readable, 6 characters max
- Adding a phone number auto-registers that person when they first message

---

### Module 2: WhatsApp Intelligence Layer

**Purpose:** The core engine. Receives all field communication and structures it automatically.

**Features:**
- One dedicated BuildOS WhatsApp Business number for the entire platform
- Workers message the number with their project code (`#BIL-07 Done concrete pour today`)
- System remembers last active project per phone number after first message — they don't need to repeat the code every time
- Voice notes auto-transcribed (Whisper API) then classified
- Photos stored and tagged automatically
- AI classifies every message into one of: `site_update` / `cost_entry` / `material_delivery` / `attendance` / `incident` / `question` / `unclassified`
- Confirmation sent back to worker: `✅ Logged to BIL-07 — Foundation work, Mon 31 Mar`
- PM notified when cost entries arrive requiring confirmation
- First-time sender gets onboarding message explaining how to use the system

**Message routing logic:**
```
Incoming message from phone number X
  → Look up X in users table
  → If X has one active project: route there
  → If X has multiple active projects:
      → Check if message starts with project code (#BIL-07)
      → If yes: route to that project
      → If no: reply asking which project
  → If X is unknown: reply with registration prompt
```

**Acceptance Criteria:**
- Webhook returns 200 within 200ms (processing is always async)
- Voice notes transcribed and classified within 15 seconds
- Cost entries require PM confirmation before being locked to budget
- No message goes unacknowledged — every message gets a confirmation reply

---

### Module 3: Dashboard — Portfolio View

**Purpose:** The MD's morning screen. All projects at a glance.

**Features:**
- Card grid of all active projects
- Each card shows:
  - Project name + client
  - Budget health bar (% of budget consumed, colour-coded green/amber/red)
  - Days since last site activity (goes amber at 2 days, red at 5 days)
  - Active team member count
  - Project status badge
- Sort by: most at risk / most recent activity / alphabetical
- Click any card → enter project view
- Global alert strip at top: "3 projects need attention" with links

**Acceptance Criteria:**
- Portfolio view loads in under 2 seconds
- Budget health accurate to last confirmed cost entry
- "Days since activity" reflects last WhatsApp message received on that project

---

### Module 4: Dashboard — Project View

**Purpose:** Deep view into one project. The PM's working screen.

**Features:**

**Overview tab:**
- Project header: name, client, contract value, start/expected end, status
- Budget tracker widget: total budget, total spent, % remaining, breakdown by category
- Quick stats: active team members, total photos, total site diary entries, open items

**Site Diary tab:**
- Chronological feed of all WhatsApp activity on this project
- Each entry shows: timestamp, sender, message type icon, content, photos attached
- Filterable by: date range, message type, sender
- Search across all diary entries

**Photos tab:**
- Grid gallery of all photos received via WhatsApp on this project
- Each photo: sender, timestamp, caption extracted from message
- Click to enlarge, download, or share
- Filter by date range

**Costs tab:**
- List of all cost entries (confirmed and pending)
- Columns: date, description, category, amount (GHS / USD), logged by, status (pending / confirmed)
- PM can confirm pending entries inline
- Running total per category
- Budget vs actual bar chart per category
- Export as CSV

**Team tab:**
- All registered team members on this project
- Name, phone number, role, last active date, total messages sent
- Weekly attendance summary (headcount per day, sourced from attendance logs)
- Add/remove members

**Files tab:**
- Upload any file type: drawings, contracts, permits, BOQs, photos, PDFs
- Organised into folders: Drawings / Contracts / Permits / Reports / Other
- Each file: name, uploader, upload date, file size
- Direct download link
- No version control in v1 — just organised storage

**Timeline tab:**
- Visual phase blocks showing project phases (not a full Gantt)
- Each phase: name, planned start, planned end, actual start, actual end, % complete
- Colour coding: green (on track), amber (at risk), red (delayed / overdue)
- PM updates phases manually
- Milestone markers on the timeline

**Open Items tab:**
- Cost entries awaiting PM confirmation
- Questions from field workers that haven't been answered
- Workers who messaged an unrecognised project code
- Budget alerts (75% / 90% threshold notifications)

**Acceptance Criteria:**
- All tabs load data within 1.5 seconds
- Cost entries can be confirmed with a single click
- Photos render as thumbnails, full resolution on demand

---

### Module 5: Cost & Budget Tracking

**Purpose:** Real-time financial visibility — the QS's core tool.

**Features:**
- Budget set at project creation in GHS and/or USD
- Cost categories: Materials / Labour / Equipment / Subcontractors / Transport / Miscellaneous
- Cost entries auto-created from WhatsApp messages via AI
- PM confirms or rejects each auto-created entry
- Manual cost entry also available from dashboard
- Multi-currency: any entry can be in GHS or USD
- FX rate: user sets manual rate per project (revisable at any time). All entries record the rate at time of entry.
- Running total per category updated in real time
- Budget alerts:
  - At 75% consumed → WhatsApp message to assigned PM + dashboard amber flag
  - At 90% consumed → WhatsApp message to assigned PM + CEO + dashboard red flag
- Budget history: log of every change to budget (who changed it, when, from/to amounts)

**Acceptance Criteria:**
- Cost total never changes after PM confirmation without an audit record
- Budget alerts send within 60 seconds of the threshold being crossed
- CSV export of all entries works with correct GHS/USD labelling

---

### Module 6: Daily Attendance Log

**Purpose:** Foreman sends attendance via WhatsApp each morning. No new behaviour required.

**Features:**
- AI extracts worker count from morning messages (`12 workers on site today`)
- System logs: date, project, foreman (sender), count
- Dashboard shows per-project attendance calendar (headcount per day)
- Weekly summary per project: total worker-days, average daily headcount
- End-of-week summary sent to foreman via WhatsApp for confirmation
- No payroll calculation in v1 — just the attendance data

**Acceptance Criteria:**
- Attendance extracted from natural language accurately (test set: >90% accuracy)
- Weekly summary WhatsApp message sent every Friday at 5pm project-time

---

### Module 7: Auto Progress Report (PDF)

**Purpose:** Professional client report generated in one click from existing data.

**Features:**
- Triggered from project view: "Generate Report" button
- Report covers a selectable date range (default: last 7 days)
- AI writes narrative summary from structured site diary data
- Report includes:
  - Project header (name, client, contract value, dates)
  - Executive summary paragraph (AI-generated from diary entries)
  - Budget status snapshot
  - Site activity highlights with photos (top 6 photos from the period)
  - Attendance summary
  - Upcoming milestones
  - Open items / outstanding actions
- Branded with Building Ideas logo and contact details (configurable per tenant)
- Generated as PDF, downloadable immediately
- Optional: send directly to client's email from dashboard

**Acceptance Criteria:**
- Report generated within 30 seconds
- AI narrative is coherent and professional (not verbose or repetitive)
- Report renders correctly as PDF in all standard PDF readers
- Photos embedded at reduced resolution (max 150KB each) to keep file size under 5MB

---

### Module 8: AI Query Bar

**Purpose:** Ask questions about your project data in plain English.

**Features:**
- Available on portfolio view and project view
- Examples:
  - "How much have we spent on materials across all projects this month?"
  - "Which project has the highest budget consumption rate?"
  - "What happened on BIL-07 last week?"
  - "Who hasn't sent a site update in 3 days?"
- System queries structured database, formats answer in plain text
- Shows the data behind the answer (e.g., a mini table of results)
- No hallucination risk — AI is only querying your own database, not generating facts

**Technical approach:** Text-to-SQL. GPT-4o receives: user question + database schema context + tenant_id. Returns safe read-only SQL query. Server executes, returns results. GPT-4o formats the answer. Query is logged for audit.

**Acceptance Criteria:**
- Responds within 5 seconds
- Never executes write operations (read-only SQL enforced at execution layer)
- Returns "I couldn't find that data" for unanswerable questions — never fabricates

---

### Module 9: Drawing Review & Approval Flow

**Purpose:** Track the full lifecycle of architectural drawings through review, revision, and approval. Replaces the current email-chain chaos where revision history is lost.

**Context:** The typical drawing workflow for a Ghanaian construction firm runs 3–4 revision rounds, each taking 10–14 days. Without a structured tracker, architects, contractors, and clients each have different "latest version" files. Disputes are common. This module imposes structure without changing what people actually do.

**Drawing Status Flow:**
```
DRAFT → SUBMITTED → UNDER_REVIEW → REVISION_REQUIRED → RESUBMITTED → APPROVED
                                         ↑____________________________|
                                              (multiple revision cycles)
```

**Features:**
- Upload drawing files (PDF, DWG, image) linked to a project
- Architect submits drawing for review — creates a DrawingReview record
- Each submission is a numbered revision (`Rev A`, `Rev B`, etc.)
- Reviewer (PM, client contact, or Architect) marks status and adds comments
- Comment threads are per-revision — history never lost on re-upload
- When `REVISION_REQUIRED`: WhatsApp notification sent to assigned architect with comment summary
- When `APPROVED`: locked — no further edits, final version flagged on Files tab
- Dashboard shows open drawing reviews across all projects (attention: "3 drawings awaiting review")

**Drawing Review States:**
| Status | Set By | Meaning |
|---|---|---|
| `DRAFT` | Architect | Uploaded, not yet submitted |
| `SUBMITTED` | Architect | Formally submitted for review |
| `UNDER_REVIEW` | PM | Reviewer has picked it up |
| `REVISION_REQUIRED` | PM/Client | Comments attached, architect must revise |
| `RESUBMITTED` | Architect | New revision uploaded, review restarts |
| `APPROVED` | PM | Final, locked |

**Acceptance Criteria:**
- Every revision is immutable once submitted — file cannot be replaced, only superseded by a new revision
- Approved drawings flagged clearly in Files tab with `APPROVED` badge
- WhatsApp notifications sent within 60 seconds of status change
- Review history (all revisions + comments) visible on a single screen

---

### Module 10: RFI Tracker (Request for Information)

**Purpose:** Formal record of technical clarifications between contractor and architect/client. Legally protective. Currently handled via informal WhatsApp messages that disappear.

**Context:** On a live construction site, questions arise daily — ambiguous drawings, specification conflicts, scope clarifications. An RFI is the formal mechanism to raise these. Response time is typically 6–10 working days. Untracked RFIs are a primary cause of construction disputes: "We were waiting on the architect's answer, which delayed the slab pour."

**Features:**
- Foreman or PM raises an RFI from the project view (or via WhatsApp: `#BIL-07 RFI: Confirm column spacing at grid D4`)
- RFI assigned to a respondent (typically the Architect or PM)
- Due date auto-set to 7 working days (configurable per project)
- Respondent receives WhatsApp notification
- Response recorded in-system, linked to original RFI
- Status tracked: `OPEN → ACKNOWLEDGED → ANSWERED → CLOSED`
- Dashboard shows overdue RFIs as red items in Open Items tab
- Export: RFI log PDF for contract documentation (admissible evidence of delay cause)

**RFI States:**
| Status | Meaning |
|---|---|
| `OPEN` | Raised, not yet acknowledged |
| `ACKNOWLEDGED` | Respondent has seen it, working on answer |
| `ANSWERED` | Response recorded, awaiting submitter's confirmation |
| `CLOSED` | Submitter confirms answer is sufficient |

**Acceptance Criteria:**
- Every RFI has a unique reference number (`BIL-07-RFI-003`)
- Overdue RFIs (past due date) flagged automatically in Open Items
- RFI log exportable as PDF sorted by date raised

---

### Module 11: Materials Request & Delivery Tracking

**Purpose:** Formal materials requisition flow — PM creates requests, MD approves above threshold, Foreman confirms delivery on site.

**Context:** Research confirmed that in construction SMEs, the PM handles procurement — there is no dedicated procurement role. Materials are the largest variable cost category and the most common source of budget overruns. This module gives the MD veto power on large purchases and creates a delivery audit trail.

**Request Lifecycle:**
```
PM creates request (items + quantities + estimated cost)
    ↓
Under threshold (< GH₵2,000): PM can approve directly → APPROVED
Above threshold: Auto-escalates → MD notified via WhatsApp → MD approves or rejects
    ↓
APPROVED → PM contacts supplier (outside system in v1)
    ↓
Foreman receives delivery → messages: "#BIL-07 Delivery confirmed: 30 bags cement, 50 rods"
    ↓
AI matches delivery message to open MaterialsRequest → DELIVERED
    ↓
Cost entry auto-created (pending PM confirmation) with delivery link
```

**Features:**
- PM creates request from dashboard: list of items, quantities, estimated unit cost
- Total estimated cost calculated — threshold check triggers MD approval workflow
- MD receives WhatsApp: "BIL-07: GH₵8,500 materials request awaiting your approval. [items list]"
- MD replies `APPROVE` or `REJECT` via WhatsApp
- On approval: foreman notified of what to expect
- Foreman's delivery confirmation via WhatsApp auto-matched to the open request
- Partial deliveries tracked (30 bags requested, 20 delivered → flagged as partial)
- Delivery creates linked cost entry automatically

**Approval Threshold:** Configurable per tenant (default GH₵2,000). Owner can set to any amount.

**Acceptance Criteria:**
- Approval threshold configurable in tenant settings
- MD can approve/reject via WhatsApp with a single-word reply
- Partial delivery flagged and remaining quantity tracked
- Delivery auto-creates a cost entry linked to the original request

---

### Module 12: Delay Logging & Cause Categorisation

**Purpose:** Formal record of site delays with cause attribution. Legally protective for the contractor. Currently undocumented — delays happen but no one can prove why.

**Context:** Construction contracts commonly allocate responsibility for delays. If a project is delayed by rain or by client failure to approve drawings, that delay is not the contractor's fault — but without contemporaneous documentation, it is impossible to prove. A timestamped, categorised delay log created at the time of the event is legally admissible evidence. It also surfaces systemic patterns (e.g., "materials delays account for 60% of lost days on BIL-07").

**Delay Causes (standard categories used in Ghanaian construction contracts):**
| Code | Cause | Who's Responsible |
|---|---|---|
| `WEATHER` | Rain, flooding, extreme heat | Neutral (Act of God) |
| `MATERIALS` | Delivery failure, supplier issues | Usually contractor |
| `LABOUR` | Strike, absenteeism, shortage | Usually contractor |
| `DESIGN` | Drawing issue, RFI awaiting response | Architect / Client |
| `CLIENT` | Client instruction change, late approval | Client |
| `UTILITIES` | Power/water supply issues | Neutral |

**Features:**
- Foreman reports delay via WhatsApp: `#BIL-07 delay: no cement delivery today, material supplier issue`
- AI classifies cause from message (MATERIALS in this case), creates delay log entry
- PM can review and override cause classification from dashboard
- Delay log shows: date, duration (hours/days), project, cause, reported by, description
- Dashboard: project timeline shows delay days overlaid on phases
- Monthly report includes delay summary: total days lost per cause category
- Exportable delay log PDF for contract dispute documentation

**Acceptance Criteria:**
- Foreman can log a delay via WhatsApp without knowing the category system
- PM can override AI-assigned cause from dashboard
- Total delay days per cause visible on project timeline view

---

### Role-Based Access Control (RBAC)

This is not a nice-to-have — it is a core product requirement. The MD (Owner) explicitly does not want field workers, or even some PMs, seeing full financial data. This matches standard industry practice.

**Access Matrix:**

| Feature | OWNER | PROJECT_MANAGER | ARCHITECT | FOREMAN | FIELD_WORKER |
|---|---|---|---|---|---|
| Portfolio view (all projects) | ✅ Full | ✅ Assigned only | ✅ Assigned only | ❌ | ❌ |
| Budget totals & budget health | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cost entry details (amounts) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Confirm / reject cost entries | ✅ | ✅ | ❌ | ❌ | ❌ |
| Budget alert notifications | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve materials request (>threshold) | ✅ only | ❌ | ❌ | ❌ | ❌ |
| Approve materials request (<threshold) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Site diary (read) | ✅ | ✅ | ✅ | ✅ (own) | ✅ (own) |
| Attendance logs | ✅ | ✅ | ❌ | ✅ (report) | ❌ |
| Drawing review (submit) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Drawing review (approve) | ✅ | ✅ | ❌ | ❌ | ❌ |
| RFI (raise) | ✅ | ✅ | ✅ | ✅ (via WhatsApp) | ❌ |
| RFI (respond) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Generate PDF report | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add/remove team members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tenant settings (logo, threshold) | ✅ only | ❌ | ❌ | ❌ | ❌ |

**Implementation:** JWT token contains `role`. NestJS Guards check role before route execution. RLS policies enforce the same rules at database level — even if application-level guard has a bug, the database refuses the query.

---

## 5. Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────┐
│                  FIELD WORKERS                       │
│         WhatsApp (phone, no app required)            │
└────────────────────────┬────────────────────────────┘
                         │ Messages (text/photo/voice)
                         ▼
┌─────────────────────────────────────────────────────┐
│            META WHATSAPP CLOUD API                   │
│         Webhook POST to BuildOS API                  │
└────────────────────────┬────────────────────────────┘
                         │ JSON Webhook Payload
                         ▼
┌─────────────────────────────────────────────────────┐
│              NESTJS API (Railway)                    │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  Webhook     │    │   Job Queue (pg-boss)     │   │
│  │  Controller  │───▶│   Async message processor │   │
│  │  (200 fast)  │    └────────────┬─────────────┘   │
│  └──────────────┘                 │                  │
│                                   ▼                  │
│  ┌────────────────────────────────────────────────┐  │
│  │            AI PROCESSING PIPELINE              │  │
│  │  Voice Note → Whisper → Text                   │  │
│  │  Text/Photo → GPT-4o → Classified + Extracted  │  │
│  │  Structured data → Database                    │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  REST API    │    │   Supabase PostgreSQL     │   │
│  │  (Auth,      │◀──▶│   (Prisma ORM + RLS)     │   │
│  │   Projects,  │    └──────────────────────────┘   │
│  │   Reports)   │                                    │
│  └──────────────┘                                    │
└────────────────────────┬────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────┐
│           NEXT.JS DASHBOARD (Vercel)                 │
│   Portfolio View / Project View / Reports / Queries  │
│              Used by: MD, PM, Admin                  │
└─────────────────────────────────────────────────────┘
```

### Data Flow — Incoming WhatsApp Message

```
1. Worker sends message to BuildOS WhatsApp number
2. Meta delivers JSON webhook to POST /webhooks/whatsapp
3. NestJS: validate Meta signature (HMAC-SHA256) → if invalid, 403
4. NestJS: enqueue job in pg-boss → return 200 immediately (< 200ms)
5. Job processor picks up job:
   a. Identify sender (phone number lookup in users table)
   b. Identify target project (project code in message or last active project)
   c. Download media if present (photo/audio) from Meta CDN
   d. If audio: send to Whisper API → receive transcript
   e. Send text content to GPT-4o with classification prompt
   f. Store raw message + classification + extracted data in DB
   g. If cost_entry: create pending cost entry, notify PM
   h. If attendance: create attendance log entry
   i. Send confirmation reply to worker via WhatsApp
6. Dashboard updates on next poll (30-second interval)
```

### Multi-Tenancy Model

**Approach:** Row-Level Security (RLS) on PostgreSQL via Supabase.

Every table has a `tenant_id` column. PostgreSQL RLS policies enforce that queries can only access rows where `tenant_id` matches the value set in the current session context.

```sql
-- Set at the start of every request (in NestJS middleware)
SELECT set_config('app.current_tenant_id', $1, true);

-- RLS policy on every table
CREATE POLICY tenant_isolation ON projects
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

Even if application code has a bug and forgets to filter by tenant, the database enforces isolation. No tenant can ever see another tenant's data.

---

## 6. Tech Stack — Decisions & Rationale

### Overview Table

| Layer | Technology | Why |
|---|---|---|
| Monorepo | Turborepo | Shared TypeScript types between apps, parallel builds, one repo |
| Frontend | Next.js 15 + TypeScript | SSR performance, App Router, Vercel deployment, best ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Fast to build dashboards, shadcn components are owned not installed |
| Data Fetching | TanStack Query | Caching, background refetch, optimistic updates, clean mutations |
| Backend | NestJS + TypeScript | Structured, opinionated, built-in DI, guards, pipes — right for small teams |
| Validation | class-validator + class-transformer | Decorator-based DTO validation, NestJS native |
| Database | PostgreSQL via Supabase | ACID for financial data, RLS for multi-tenancy, managed free tier |
| ORM | Prisma | Type-safe queries, migration tooling, better DX than Drizzle at this stage |
| Job Queue | pg-boss | PostgreSQL-backed queue, no Redis needed, sufficient for current volume |
| Auth | Supabase Auth | Free, handles email/password + OAuth, no extra service needed |
| WhatsApp | Meta Cloud API (direct) | No middleware markup, full control, free tier covers 1K conversations |
| Voice Transcription | OpenAI Whisper | Best multilingual transcription, handles construction site noise |
| AI Classification | GPT-4o with structured outputs | Reliable JSON extraction, Zod schema enforcement, no string parsing |
| Report Writing | GPT-4o | Long-context, coherent professional prose generation |
| PDF Generation | @react-pdf/renderer | React component → PDF, consistent with frontend tech, runs server-side |
| File Storage | Supabase Storage | Free during development, same platform as DB, swap to R2 at scale |
| Payments | Paystack | Ghana-native, supports MTN MoMo, Visa, bank transfer |
| Frontend Hosting | Vercel | Zero-config Next.js, automatic previews, global CDN |
| API Hosting | Railway | Managed Node.js, PostgreSQL plugin, GitHub auto-deploy, $5/month |
| DNS / CDN | Cloudflare | Free tier, DDoS protection, Accra latency reduction |
| Error Tracking | Sentry | Free tier sufficient, captures exceptions with full stack traces |
| Env Validation | Zod | Crash on startup if env vars missing — not in production at runtime |

### Visual Design System

The visual design is a decision made once and implemented consistently. BuildOS targets operations professionals — MDs and PMs who live in the dashboard for hours. The priority is clarity, density, and trust — not personality or flair.

**Design Reference**

[Defcon — Project Management Dashboard (Figma)](https://www.figma.com/community/file/1433409812186983586/defcon-project-management-dashboard-ui-templates)

Selected for its portfolio card layout, project detail structure, timeline blocks, and status-driven colour coding — all of which map directly to BuildOS's core screens. The companion [Calendar/Timeline file](https://www.figma.com/community/file/1445323490001639735/defcon-calendar-schedule-timeline-dashboard) covers the project phase timeline tab.

Use Defcon as the visual reference when building each screen. Do not replicate it literally — extract the layout logic and spacing rhythm, then apply BuildOS's own colour tokens.

---

**Typography**

| Role | Font | Source |
|---|---|---|
| All UI text | **Rubik** | Ships with Next.js 15 via `next/font/google` — zero config |

```typescript
// apps/web/app/layout.tsx
import { Rubik } from 'next/font/google';

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${rubik.variable}`}>
      <body className="font-sans antialiased bg-[var(--content-bg)] text-[var(--text-primary)]">{children}</body>
    </html>
  );
}
```

Rubik is a sans-serif font family with slightly rounded corners designed by Philipp Hubert and Sebastian Fischer. It provides a warm, modern aesthetic and high legibility at all sizes, perfect for minimal dashboard designs. No external CDN request, no layout shift, zero performance cost.

---

**Colour Tokens**

All colours defined as CSS variables in `globals.css` using shadcn's convention. Override the defaults with these specific values:

```css
/* globals.css — light mode */
:root {
  /* Layout: Deep Navy Theme */
  --sidebar-bg:        #0b1120;   /* Deep Navy  — dark navigation */
  --sidebar-text:      #94a3b8;   /* Slate-400  — inactive nav items */
  --sidebar-active:    #f8fafc;   /* Slate-50   — active nav item text */
  --sidebar-accent:    #1e293b;   /* Slate-800  — active nav item bg */
  --content-bg:        #f1f5f9;   /* Slate-100  — main content area */
  --card-bg:           #ffffff;   /* White      — cards and panels */
  --border:            #e2e8f0;   /* Slate-200  — dividers, table borders */

  /* Brand: Deep Blue */
  --primary:           #1d4ed8;   /* Blue-700   — primary buttons, links */
  --primary-hover:     #1e3a8a;   /* Blue-900 */
  --primary-subtle:    #dbeafe;   /* Blue-100   — highlighted rows, badges */

  /* Status — used across budget bars, phase blocks, RFI states */
  --status-green:      #10b981;   /* Emerald-500  — on track, confirmed, approved */
  --status-green-bg:   #ecfdf5;   /* Emerald-50 */
  --status-amber:      #f59e0b;   /* Amber-500  — at risk, pending */
  --status-amber-bg:   #fffbeb;   /* Amber-50 */
  --status-red:        #ef4444;   /* Red-500    — overrun, delayed */
  --status-red-bg:     #fef2f2;   /* Red-50 */

  /* Text */
  --text-primary:      #0f172a;   /* Slate-900  — headings, labels */
  --text-secondary:    #475569;   /* Slate-600  — secondary info */
  --text-muted:        #94a3b8;   /* Slate-400  — timestamps, empty states */
}
```

**Colour intent rules — never deviate from these:**

| Colour | Used for | Never used for |
|---|---|---|
| Blue-600 | Primary actions, active links, confirmed states | Status indicators |
| Green-500 | On track / approved / confirmed | Success toasts only |
| Amber-500 | At risk / pending / approaching limit | Errors |
| Red-500 | Overrun / critical / rejected | Warnings |
| Slate-900 | Sidebar background | Content area backgrounds |
| White | Card surfaces, modals | Sidebar |

---

**Layout Pattern**

```
┌─────────────────┬────────────────────────────────────────────┐
│  SIDEBAR        │  HEADER (breadcrumb + user + actions)      │
│  #0F172A        ├────────────────────────────────────────────┤
│                 │                                            │
│  Logo           │  CONTENT AREA                              │
│  ─────          │  #F8FAFC background                        │
│  Nav item       │                                            │
│  Nav item ●     │  Cards, tables, charts live here           │
│  Nav item       │                                            │
│  Nav item       │                                            │
│  ─────          │                                            │
│  Settings       │                                            │
│  Logout         │                                            │
│                 │                                            │
│  240px fixed    │  flex-1                                     │
└─────────────────┴────────────────────────────────────────────┘
```

Sidebar: 240px fixed width, collapses to 64px icon-only on tablet. Content area: fluid. No horizontal scroll at 1280px viewport width.

---

### Key Non-Choices (and why)

| Rejected | Why |
|---|---|
| Redis + BullMQ | Extra infrastructure for a job queue pg-boss handles fine |
| GraphQL | REST is simpler, faster to build, TanStack Query handles REST perfectly |
| Microservices | One team, one product — monolith until the pain of monolith is real |
| Docker (early) | Adds cognitive overhead, use local Postgres + Railway for now |
| Drizzle ORM | Better benchmarks but worse docs/DX at this stage |
| Twilio for WhatsApp | Adds cost and a dependency — use Meta Cloud API directly |
| Clerk | $25/month for UI components Supabase Auth covers |
| AWS / GCP | Massive DevOps overhead — Railway handles everything Railway needs to |

---

## 7. Database Schema

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─────────────────────────────────────────
// TENANTS
// ─────────────────────────────────────────

model Tenant {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String
  slug        String    @unique  // e.g. "building-ideas"
  logoUrl     String?
  primaryColor String?           // hex for white-labelling
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?          // soft delete

  users       User[]
  projects    Project[]
  whatsappMessages WhatsappMessage[]
  auditLogs   AuditLog[]

  @@map("tenants")
}

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────

model User {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String    @db.Uuid
  tenant        Tenant    @relation(fields: [tenantId], references: [id])

  email         String?   @unique       // dashboard users have email
  whatsappPhone String?   @unique       // field workers identified by phone
  name          String?
  role          UserRole  @default(FIELD_WORKER)
  isActive      Boolean   @default(true)
  lastActiveAt  DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  projectMembers ProjectMember[]
  costEntries   CostEntry[]
  dailyLogs     DailyLog[]
  attendanceLogs AttendanceLog[]
  timeEntries   TimeEntry[]
  uploadedFiles ProjectFile[]
  whatsappMessages WhatsappMessage[]

  @@map("users")
}

enum UserRole {
  OWNER              // company MD / CEO — full access including all financials
  PROJECT_MANAGER    // manages projects day-to-day, handles procurement/materials
  ARCHITECT          // manages drawings, design reviews, RFIs
  FOREMAN            // site supervisor — submits daily logs, attendance, delivery confirmations via WhatsApp
  FIELD_WORKER       // general site worker — WhatsApp only, no dashboard access
}

// ─────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────

model Project {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String    @db.Uuid
  tenant        Tenant    @relation(fields: [tenantId], references: [id])

  code          String    @unique   // e.g. "BIL-07" — used for WhatsApp routing
  name          String
  clientName    String
  description   String?

  status        ProjectStatus @default(ACTIVE)

  budgetGhs     Decimal?  @db.Decimal(15, 2)
  budgetUsd     Decimal?  @db.Decimal(15, 2)
  fxRateGhsUsd  Decimal?  @db.Decimal(10, 4)  // snapshot at project creation

  startDate     DateTime?
  expectedEndDate DateTime?
  actualEndDate   DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  members       ProjectMember[]
  phases        ProjectPhase[]
  costEntries   CostEntry[]
  dailyLogs     DailyLog[]
  attendanceLogs AttendanceLog[]
  files         ProjectFile[]
  whatsappMessages WhatsappMessage[]
  progressReports ProgressReport[]
  drawingReviews DrawingReview[]
  rfis          RFI[]
  materialsRequests MaterialsRequest[]
  delayLogs     DelayLog[]

  @@map("projects")
}

enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}

model ProjectMember {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId String    @db.Uuid
  project   Project   @relation(fields: [projectId], references: [id])
  userId    String    @db.Uuid
  user      User      @relation(fields: [userId], references: [id])
  role      UserRole
  joinedAt  DateTime  @default(now())
  leftAt    DateTime?

  @@unique([projectId, userId])
  @@map("project_members")
}

// ─────────────────────────────────────────
// PROJECT PHASES (Timeline)
// ─────────────────────────────────────────

model ProjectPhase {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String    @db.Uuid
  project       Project   @relation(fields: [projectId], references: [id])

  name          String    // e.g. "Foundation", "Structural", "Finishing"
  order         Int       // display order
  plannedStart  DateTime?
  plannedEnd    DateTime?
  actualStart   DateTime?
  actualEnd     DateTime?
  percentComplete Int     @default(0)  // 0-100, manually set by PM
  status        PhaseStatus @default(NOT_STARTED)
  notes         String?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("project_phases")
}

enum PhaseStatus {
  NOT_STARTED
  IN_PROGRESS
  AT_RISK
  DELAYED
  COMPLETED
}

// ─────────────────────────────────────────
// COST ENTRIES
// ─────────────────────────────────────────

model CostEntry {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String    @db.Uuid
  project       Project   @relation(fields: [projectId], references: [id])
  tenantId      String    @db.Uuid

  source        CostSource // WHATSAPP_AI or MANUAL
  status        CostStatus @default(PENDING_CONFIRMATION)

  description   String
  category      CostCategory
  currency      Currency
  amount        Decimal   @db.Decimal(15, 2)
  fxRateAtEntry Decimal?  @db.Decimal(10, 4)  // GHS/USD rate at time of entry

  loggedById    String    @db.Uuid   // user who triggered (foreman or PM)
  loggedBy      User      @relation(fields: [loggedById], references: [id])
  confirmedById String?   @db.Uuid   // PM who confirmed
  confirmedAt   DateTime?

  rawMessageId  String?   @db.Uuid   // link back to original WhatsApp message

  entryDate     DateTime  @default(now())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  @@map("cost_entries")
}

enum CostSource {
  WHATSAPP_AI   // extracted by AI from WhatsApp message
  MANUAL        // entered directly on dashboard
}

enum CostStatus {
  PENDING_CONFIRMATION  // AI-created, awaiting PM review
  CONFIRMED             // PM approved
  REJECTED              // PM rejected (with reason)
}

enum CostCategory {
  MATERIALS
  LABOUR
  EQUIPMENT
  SUBCONTRACTORS
  TRANSPORT
  MISCELLANEOUS
}

enum Currency {
  GHS
  USD
}

// ─────────────────────────────────────────
// DAILY LOGS (Site Diary)
// ─────────────────────────────────────────

model DailyLog {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String    @db.Uuid
  project       Project   @relation(fields: [projectId], references: [id])
  tenantId      String    @db.Uuid

  logDate       DateTime
  submittedById String    @db.Uuid
  submittedBy   User      @relation(fields: [submittedById], references: [id])

  rawContent    String    // original message text (or transcription)
  aiSummary     String?   // AI-generated summary sentence

  activities    String[]  // extracted: ["concrete pour", "column formwork"]
  materials     Json?     // extracted: [{"item": "cement", "qty": "15 bags"}]
  incidents     String[]  // extracted incident descriptions
  weather       String?   // extracted: "clear", "rainy", "overcast"

  source        MessageType // TEXT, VOICE_NOTE, PHOTO
  photos        DailyLogPhoto[]
  rawMessageId  String?   @db.Uuid

  createdAt     DateTime  @default(now())

  @@map("daily_logs")
}

model DailyLogPhoto {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  dailyLogId  String    @db.Uuid
  dailyLog    DailyLog  @relation(fields: [dailyLogId], references: [id])
  storageUrl  String    // Supabase Storage URL
  caption     String?
  takenAt     DateTime?
  createdAt   DateTime  @default(now())

  @@map("daily_log_photos")
}

// ─────────────────────────────────────────
// ATTENDANCE LOGS
// ─────────────────────────────────────────

model AttendanceLog {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String    @db.Uuid
  project       Project   @relation(fields: [projectId], references: [id])
  tenantId      String    @db.Uuid

  logDate       DateTime
  workerCount   Int
  reportedById  String    @db.Uuid
  reportedBy    User      @relation(fields: [reportedById], references: [id])

  rawMessageId  String?   @db.Uuid
  confirmedAt   DateTime?  // set when foreman confirms weekly summary

  createdAt     DateTime  @default(now())

  @@map("attendance_logs")
}

// ─────────────────────────────────────────
// WHATSAPP MESSAGES (Raw Log)
// ─────────────────────────────────────────

model WhatsappMessage {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String?   @db.Uuid   // null if sender not yet registered
  tenant          Tenant?   @relation(fields: [tenantId], references: [id])
  projectId       String?   @db.Uuid

  direction       MessageDirection
  whatsappMsgId   String    @unique  // Meta's message ID (idempotency)
  fromPhone       String
  toPhone         String

  messageType     MessageType
  textContent     String?
  transcription   String?   // if voice note, Whisper output
  mediaUrl        String?   // stored in Supabase Storage
  mediaType       String?   // image/jpeg, audio/ogg, etc.

  processingStatus ProcessingStatus @default(PENDING)
  classifiedAs    String?   // site_update / cost_entry / attendance / etc.
  extractedData   Json?     // what AI pulled out of this message

  senderId        String?   @db.Uuid
  sender          User?     @relation(fields: [senderId], references: [id])

  receivedAt      DateTime
  processedAt     DateTime?
  createdAt       DateTime  @default(now())

  @@map("whatsapp_messages")
}

enum MessageDirection {
  INBOUND   // worker → BuildOS
  OUTBOUND  // BuildOS → worker
}

enum MessageType {
  TEXT
  IMAGE
  VOICE_NOTE
  DOCUMENT
  VIDEO
}

enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// ─────────────────────────────────────────
// PROJECT FILES
// ─────────────────────────────────────────

model ProjectFile {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String    @db.Uuid
  project       Project   @relation(fields: [projectId], references: [id])
  tenantId      String    @db.Uuid

  name          String
  folder        FileFolder
  storageUrl    String    // Supabase Storage path
  fileSize      Int       // bytes
  mimeType      String
  uploadedById  String    @db.Uuid
  uploadedBy    User      @relation(fields: [uploadedById], references: [id])

  createdAt     DateTime  @default(now())
  deletedAt     DateTime?

  @@map("project_files")
}

enum FileFolder {
  DRAWINGS
  CONTRACTS
  PERMITS
  REPORTS
  OTHER
}

// ─────────────────────────────────────────
// PROGRESS REPORTS
// ─────────────────────────────────────────

model ProgressReport {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String    @db.Uuid
  project       Project   @relation(fields: [projectId], references: [id])
  tenantId      String    @db.Uuid

  periodStart   DateTime
  periodEnd     DateTime
  generatedAt   DateTime  @default(now())
  generatedById String    @db.Uuid

  narrativeSummary String  // AI-written
  storageUrl    String    // PDF stored in Supabase Storage
  sentToEmail   String?   // if sent to client
  sentAt        DateTime?

  @@map("progress_reports")
}

// ─────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────

model AuditLog {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String    @db.Uuid
  tenant      Tenant    @relation(fields: [tenantId], references: [id])

  actorId     String?   @db.Uuid   // null for system actions
  action      String    // e.g. "cost_entry.confirmed", "project.created"
  entityType  String    // e.g. "cost_entry", "project"
  entityId    String    @db.Uuid

  oldValues   Json?
  newValues   Json?
  metadata    Json?     // IP address, user agent, etc.

  createdAt   DateTime  @default(now())

  @@map("audit_logs")
}

// ─────────────────────────────────────────
// DRAWING REVIEWS (Module 9)
// ─────────────────────────────────────────

model DrawingReview {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String    @db.Uuid
  project       Project   @relation(fields: [projectId], references: [id])
  tenantId      String    @db.Uuid

  title         String    // e.g. "Ground Floor Plan - Block A"
  description   String?
  status        DrawingStatus @default(DRAFT)

  submittedById String?   @db.Uuid   // architect who submitted
  submittedBy   User?     @relation("DrawingSubmitter", fields: [submittedById], references: [id])
  reviewerId    String?   @db.Uuid   // PM or designated reviewer
  reviewer      User?     @relation("DrawingReviewer", fields: [reviewerId], references: [id])

  revisions     DrawingRevision[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("drawing_reviews")
}

enum DrawingStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  REVISION_REQUIRED
  RESUBMITTED
  APPROVED
}

model DrawingRevision {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  drawingReviewId String    @db.Uuid
  drawingReview   DrawingReview @relation(fields: [drawingReviewId], references: [id])

  revisionNumber  String    // "Rev A", "Rev B", etc.
  storageUrl      String    // Supabase Storage path
  fileSize        Int
  mimeType        String
  uploadedById    String    @db.Uuid
  uploadedBy      User      @relation(fields: [uploadedById], references: [id])

  comments        String?   // reviewer comments on this revision
  reviewedAt      DateTime?
  reviewedById    String?   @db.Uuid

  createdAt       DateTime  @default(now())

  @@map("drawing_revisions")
}

// ─────────────────────────────────────────
// RFI — REQUEST FOR INFORMATION (Module 10)
// ─────────────────────────────────────────

model RFI {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String    @db.Uuid
  project       Project   @relation(fields: [projectId], references: [id])
  tenantId      String    @db.Uuid

  referenceNo   String    // e.g. "BIL-07-RFI-003" — auto-generated, unique per project
  title         String
  description   String    // the question / clarification needed
  linkedDrawingId String? @db.Uuid  // optional link to a DrawingReview

  status        RFIStatus @default(OPEN)
  raisedById    String    @db.Uuid
  raisedBy      User      @relation("RFIRaiser", fields: [raisedById], references: [id])
  assignedToId  String?   @db.Uuid   // architect or PM to respond
  assignedTo    User?     @relation("RFIRespondent", fields: [assignedToId], references: [id])

  dueDate       DateTime  // auto-set to 7 working days from raised date (configurable)
  response      String?   // written response from respondent
  respondedAt   DateTime?
  closedAt      DateTime?

  rawMessageId  String?   @db.Uuid  // if raised via WhatsApp

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("rfis")
}

enum RFIStatus {
  OPEN
  ACKNOWLEDGED
  ANSWERED
  CLOSED
}

// ─────────────────────────────────────────
// MATERIALS REQUESTS (Module 11)
// ─────────────────────────────────────────

model MaterialsRequest {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId       String    @db.Uuid
  project         Project   @relation(fields: [projectId], references: [id])
  tenantId        String    @db.Uuid

  requestedById   String    @db.Uuid   // PM who created the request
  requestedBy     User      @relation("MaterialsRequester", fields: [requestedById], references: [id])

  status          MaterialsRequestStatus @default(DRAFT)
  estimatedTotal  Decimal   @db.Decimal(15, 2)
  currency        Currency  @default(GHS)
  notes           String?

  // Approval chain
  requiresOwnerApproval Boolean @default(false)  // set true if estimatedTotal > threshold
  approvedById    String?   @db.Uuid
  approvedBy      User?     @relation("MaterialsApprover", fields: [approvedById], references: [id])
  approvedAt      DateTime?
  rejectionReason String?

  items           MaterialsRequestItem[]
  costEntryId     String?   @db.Uuid   // linked cost entry once delivered

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("materials_requests")
}

enum MaterialsRequestStatus {
  DRAFT
  SUBMITTED
  AWAITING_APPROVAL    // escalated to Owner
  APPROVED
  REJECTED
  ORDERED              // PM has placed order with supplier
  PARTIALLY_DELIVERED
  DELIVERED
  CANCELLED
}

model MaterialsRequestItem {
  id                  String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  materialsRequestId  String    @db.Uuid
  materialsRequest    MaterialsRequest @relation(fields: [materialsRequestId], references: [id])

  description         String    // e.g. "Ordinary Portland Cement (50kg bags)"
  quantity            Decimal   @db.Decimal(10, 2)
  unit                String    // bags, tonnes, pieces, etc.
  estimatedUnitCost   Decimal?  @db.Decimal(15, 2)

  deliveredQuantity   Decimal?  @db.Decimal(10, 2)  // filled on delivery confirmation
  deliveredAt         DateTime?

  @@map("materials_request_items")
}

// ─────────────────────────────────────────
// DELAY LOGS (Module 12)
// ─────────────────────────────────────────

model DelayLog {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId       String    @db.Uuid
  project         Project   @relation(fields: [projectId], references: [id])
  tenantId        String    @db.Uuid

  delayDate       DateTime
  durationHours   Decimal   @db.Decimal(5, 2)  // hours lost (0.5 = half day, 8 = full day)
  cause           DelayCause
  description     String    // narrative description

  reportedById    String    @db.Uuid
  reportedBy      User      @relation(fields: [reportedById], references: [id])
  reviewedByPM    Boolean   @default(false)  // PM has verified the cause category
  causeOverrideNote String? // if PM changed AI-assigned cause

  rawMessageId    String?   @db.Uuid  // if reported via WhatsApp
  linkedRFIId     String?   @db.Uuid  // if DESIGN cause, link to the RFI

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("delay_logs")
}

enum DelayCause {
  WEATHER           // rain, flooding, extreme heat — neutral
  MATERIALS         // delivery failure, supplier issues
  LABOUR            // strike, absenteeism, shortage
  DESIGN            // drawing issue, RFI pending response
  CLIENT            // client instruction change, late approval
  UTILITIES         // power/water supply failure — neutral
  OTHER
}
```

---

## 8. WhatsApp Integration Architecture

### Setup Requirements

1. **Meta Business Account** — verified business
2. **WhatsApp Business Account (WABA)** — linked to Meta Business
3. **Phone Number** — dedicated number registered to WABA
4. **App** — Meta Developer App with WhatsApp product enabled
5. **Webhook URL** — `https://api.buildos.rubicx.io/webhooks/whatsapp`
6. **Verify Token** — random string set in Meta dashboard + env vars

### Webhook Handler (NestJS)

```typescript
// src/whatsapp/whatsapp.controller.ts

@Controller('webhooks/whatsapp')
export class WhatsappController {

  // Meta webhook verification (GET)
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge; // echo back to verify
    }
    throw new ForbiddenException();
  }

  // Incoming messages (POST)
  @Post()
  @HttpCode(200)  // ALWAYS return 200 — Meta retries on non-200
  async receiveMessage(
    @Headers('x-hub-signature-256') signature: string,
    @Body() payload: WhatsappWebhookPayload,
    @RawBody() rawBody: Buffer,
  ) {
    // 1. Validate signature — reject forged webhooks
    this.whatsappService.validateSignature(rawBody, signature);

    // 2. Enqueue for async processing — never await here
    await this.jobQueue.add('process-whatsapp-message', payload);

    // 3. Return immediately — response must arrive within 5 seconds
    return { received: true };
  }
}
```

### Message Processing Pipeline (Job Processor)

```typescript
// src/whatsapp/message.processor.ts

@Processor('process-whatsapp-message')
export class MessageProcessor {

  async process(payload: WhatsappWebhookPayload) {
    const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return; // ignore status updates etc.

    for (const msg of messages) {
      // Idempotency — skip if already processed
      const exists = await this.db.whatsappMessage.findUnique({
        where: { whatsappMsgId: msg.id }
      });
      if (exists) continue;

      // Store raw message first
      const stored = await this.storeRawMessage(msg);

      // Identify sender and project
      const { user, project } = await this.resolveContext(msg.from);

      // Handle media if present
      let textContent = msg.text?.body ?? null;
      let mediaStorageUrl = null;

      if (msg.type === 'audio') {
        const buffer = await this.downloadMedia(msg.audio.id);
        mediaStorageUrl = await this.storage.upload(buffer, 'audio/ogg');
        textContent = await this.whisper.transcribe(buffer);
      }

      if (msg.type === 'image') {
        const buffer = await this.downloadMedia(msg.image.id);
        mediaStorageUrl = await this.storage.upload(buffer, 'image/jpeg');
        textContent = msg.image.caption ?? null;
      }

      // Classify and extract with GPT-4o
      if (textContent || mediaStorageUrl) {
        const classification = await this.ai.classifyMessage({
          text: textContent,
          hasPhoto: !!mediaStorageUrl,
          senderName: user?.name,
          projectContext: project?.name,
        });

        // Save structured data based on classification
        await this.handleClassification(classification, stored, user, project, mediaStorageUrl);
      }

      // Send confirmation to sender
      await this.whatsapp.sendMessage(msg.from,
        this.buildConfirmation(classification, project)
      );
    }
  }
}
```

### Project Code Routing

```typescript
async resolveContext(phoneNumber: string): Promise<{ user, project }> {
  const user = await this.db.user.findUnique({
    where: { whatsappPhone: phoneNumber },
    include: { projectMembers: { include: { project: true } } }
  });

  if (!user) return { user: null, project: null }; // unknown sender

  const activeProjects = user.projectMembers
    .filter(m => !m.leftAt && m.project.status === 'ACTIVE')
    .map(m => m.project);

  if (activeProjects.length === 1) {
    return { user, project: activeProjects[0] }; // single project — auto-route
  }

  // Multiple projects — look for code in recent message or last active
  const lastMessage = await this.db.whatsappMessage.findFirst({
    where: { fromPhone: phoneNumber },
    orderBy: { receivedAt: 'desc' },
  });

  return { user, project: lastMessage?.project ?? null };
}
```

### Message Templates (Pre-approved by Meta)

Templates required for outbound messages sent outside the 24-hour service window:

| Template Name | Use Case | Variables |
|---|---|---|
| `entry_confirmation` | Confirm a logged entry | `{{project_code}}`, `{{entry_type}}`, `{{date}}` |
| `budget_alert_75` | Budget at 75% | `{{project_name}}`, `{{percent}}`, `{{remaining_amount}}` |
| `budget_alert_90` | Budget at 90% | `{{project_name}}`, `{{percent}}`, `{{remaining_amount}}` |
| `weekly_attendance_confirm` | Friday attendance summary | `{{project_name}}`, `{{week_total}}` |
| `cost_confirmation_request` | PM: confirm a cost entry | `{{amount}}`, `{{description}}`, `{{project_code}}` |
| `drawing_revision_required` | Architect: revisions needed | `{{project_code}}`, `{{drawing_title}}`, `{{comments_summary}}` |
| `drawing_approved` | Architect: drawing approved | `{{project_code}}`, `{{drawing_title}}` |
| `rfi_assigned` | Respondent: new RFI | `{{project_code}}`, `{{rfi_ref}}`, `{{due_date}}`, `{{question}}` |
| `rfi_overdue` | Respondent: RFI overdue | `{{project_code}}`, `{{rfi_ref}}`, `{{days_overdue}}` |
| `materials_approval_request` | Owner: approve materials | `{{project_code}}`, `{{total_amount}}`, `{{items_summary}}` |
| `materials_approved` | PM: owner approved request | `{{project_code}}`, `{{request_ref}}` |
| `materials_rejected` | PM: owner rejected request | `{{project_code}}`, `{{reason}}` |

---

## 9. AI Layer

### Message Classification Schema (Zod + GPT-4o)

```typescript
const MessageClassificationSchema = z.object({
  type: z.enum([
    'site_update',
    'cost_entry',
    'material_delivery',    // matches to open MaterialsRequest
    'attendance',
    'incident',
    'delay_report',         // triggers DelayLog creation
    'rfi',                  // raises an RFI
    'question',
    'unclassified'
  ]),
  confidence: z.number().min(0).max(1),

  // Populated if type === 'site_update'
  siteUpdate: z.object({
    activities: z.array(z.string()),
    weather: z.string().optional(),
    progressNote: z.string().optional(),
  }).optional(),

  // Populated if type === 'cost_entry'
  costEntry: z.object({
    description: z.string(),
    amount: z.number(),
    currency: z.enum(['GHS', 'USD']),
    category: z.enum(['MATERIALS','LABOUR','EQUIPMENT','SUBCONTRACTORS','TRANSPORT','MISCELLANEOUS']),
    payee: z.string().optional(),
  }).optional(),

  // Populated if type === 'attendance'
  attendance: z.object({
    workerCount: z.number(),
    date: z.string().optional(),
  }).optional(),

  // Populated if type === 'incident'
  incident: z.object({
    description: z.string(),
    severity: z.enum(['minor', 'moderate', 'serious']),
    personInvolved: z.string().optional(),
  }).optional(),

  // Populated if type === 'question'
  question: z.object({
    questionText: z.string(),
  }).optional(),

  // Populated if type === 'delay_report'
  delayReport: z.object({
    description: z.string(),
    estimatedHours: z.number().optional(),  // hours lost (AI estimate)
    suggestedCause: z.enum(['WEATHER','MATERIALS','LABOUR','DESIGN','CLIENT','UTILITIES','OTHER']),
  }).optional(),

  // Populated if type === 'rfi'
  rfi: z.object({
    question: z.string(),    // the clarification being requested
    urgency: z.enum(['low', 'normal', 'urgent']).default('normal'),
  }).optional(),

  // Populated if type === 'material_delivery'
  materialDelivery: z.object({
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unit: z.string().optional(),
    })),
    isPartial: z.boolean().default(false),
  }).optional(),
});
```

### GPT-4o Classification Call

```typescript
const result = await openai.beta.chat.completions.parse({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: `You are a construction site data extractor.
      Classify incoming messages from construction site workers in Ghana.
      Messages may mix English with Twi or other local languages.
      Extract structured data. Be conservative with amounts — only extract
      if clearly stated. Currency defaults to GHS unless USD is mentioned.
      Today's date: ${new Date().toISOString()}`
    },
    {
      role: 'user',
      content: textContent
    }
  ],
  response_format: zodResponseFormat(MessageClassificationSchema, 'classification'),
});

return result.choices[0].message.parsed;
```

### Whisper Voice Transcription

```typescript
async transcribeVoiceNote(audioBuffer: Buffer): Promise<string> {
  const file = await toFile(audioBuffer, 'voice_note.ogg', { type: 'audio/ogg' });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',        // Handles English + Twi/Ga mixing reasonably well
    prompt: 'Construction site report from Ghana. May mention materials like cement, rods, sand. Worker names, site locations, costs in Ghana cedis (GHS) or dollars.',
  });

  return transcription.text;
}
```

The `prompt` parameter primes Whisper on the domain vocabulary — significantly improves accuracy for construction-specific terms and Ghanaian proper nouns.

### Report Generation

```typescript
async generateProgressReport(projectId: string, from: Date, to: Date) {
  // Fetch structured data — never pass raw messages to GPT
  const data = await this.getReportData(projectId, from, to);

  const narrative = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Write a professional construction progress report for a Ghanaian client.
        Be factual, concise, and professional. Use formal language appropriate for
        government and corporate clients. Do not invent facts not in the data.`
      },
      {
        role: 'user',
        content: JSON.stringify({
          project: data.project,
          period: { from, to },
          dailyActivities: data.dailyLogs,
          totalWorkersDeployed: data.attendanceSummary,
          budgetStatus: data.budgetSummary,
          incidents: data.incidents,
          milestonesThisPeriod: data.milestones,
        })
      }
    ],
    max_tokens: 800,
  });

  return narrative.choices[0].message.content;
}
```

---

## 10. API Structure

### REST Endpoints

```
AUTH
POST   /auth/register
POST   /auth/login
POST   /auth/logout

TENANTS
POST   /tenants                    Create tenant (onboarding)
GET    /tenants/:id                Get tenant details
PATCH  /tenants/:id                Update tenant (logo, colors)

PROJECTS
GET    /projects                   List all projects (portfolio view)
POST   /projects                   Create project
GET    /projects/:id               Get project details
PATCH  /projects/:id               Update project
DELETE /projects/:id               Soft delete project

TEAM
GET    /projects/:id/members       List project members
POST   /projects/:id/members       Add member by phone number
DELETE /projects/:id/members/:uid  Remove member

PHASES
GET    /projects/:id/phases        List phases
POST   /projects/:id/phases        Create phase
PATCH  /projects/:id/phases/:pid   Update phase (progress, dates)

COSTS
GET    /projects/:id/costs         List cost entries
POST   /projects/:id/costs         Manual cost entry
PATCH  /projects/:id/costs/:cid    Confirm / reject / edit cost entry
GET    /projects/:id/costs/summary Budget vs actual summary

DIARY
GET    /projects/:id/diary         Paginated site diary (all activity)
GET    /projects/:id/photos        All photos for project

ATTENDANCE
GET    /projects/:id/attendance    Attendance logs
GET    /projects/:id/attendance/summary Weekly summary

FILES
GET    /projects/:id/files         List files by folder
POST   /projects/:id/files         Upload file (multipart)
DELETE /projects/:id/files/:fid    Soft delete file
GET    /projects/:id/files/:fid/url Signed download URL

REPORTS
POST   /projects/:id/reports       Generate progress report
GET    /projects/:id/reports       List generated reports
GET    /projects/:id/reports/:rid/download Download PDF

DRAWING REVIEWS
GET    /projects/:id/drawings           List all drawing reviews
POST   /projects/:id/drawings           Create new drawing review
GET    /projects/:id/drawings/:did      Get drawing with all revisions
PATCH  /projects/:id/drawings/:did      Update status (approve, request revision)
POST   /projects/:id/drawings/:did/revisions Upload new revision file

RFIS
GET    /projects/:id/rfis               List all RFIs (filterable by status)
POST   /projects/:id/rfis               Create new RFI
GET    /projects/:id/rfis/:rid          Get single RFI
PATCH  /projects/:id/rfis/:rid          Update status, add response
GET    /projects/:id/rfis/export        Export RFI log as PDF

MATERIALS REQUESTS
GET    /projects/:id/materials          List materials requests
POST   /projects/:id/materials          Create request (PM)
GET    /projects/:id/materials/:mid     Get request with items
PATCH  /projects/:id/materials/:mid     Approve / reject / update status
POST   /projects/:id/materials/:mid/deliver Confirm delivery (links to cost entry)

DELAYS
GET    /projects/:id/delays             List delay logs
POST   /projects/:id/delays             Create delay log
PATCH  /projects/:id/delays/:lid        Update cause (PM override)
GET    /projects/:id/delays/summary     Total hours lost by cause category

AI QUERY
POST   /ai/query                   Natural language query
  body: { question: string, projectId?: string }

WEBHOOKS
GET    /webhooks/whatsapp          Meta webhook verification
POST   /webhooks/whatsapp          Incoming messages

ADMIN
GET    /admin/tenants              List all tenants (super admin only)
PATCH  /admin/tenants/:id/settings Update approval threshold, WhatsApp config
```

---

## 11. Folder Structure

```
buildos/
├── apps/
│   ├── web/                          # Next.js 15 Dashboard
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx        # Sidebar, header
│   │   │   │   ├── page.tsx          # Portfolio view
│   │   │   │   └── projects/
│   │   │   │       └── [id]/
│   │   │   │           ├── page.tsx  # Project overview
│   │   │   │           ├── diary/
│   │   │   │           ├── costs/
│   │   │   │           ├── photos/
│   │   │   │           ├── team/
│   │   │   │           ├── files/
│   │   │   │           ├── timeline/
│   │   │   │           ├── drawings/ # Drawing reviews + revisions
│   │   │   │           ├── rfis/     # RFI tracker
│   │   │   │           ├── materials/ # Materials requests
│   │   │   │           ├── delays/   # Delay log
│   │   │   │           └── reports/
│   │   │   └── api/                  # Next.js route handlers (thin proxies)
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── dashboard/            # Portfolio, ProjectCard, AlertStrip
│   │   │   ├── project/              # Diary, CostTable, PhotoGallery, etc.
│   │   │   └── shared/               # Buttons, forms, modals
│   │   └── lib/
│   │       ├── api-client.ts         # TanStack Query wrappers
│   │       └── utils.ts
│   │
│   └── api/                          # NestJS Backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── auth/                 # Supabase JWT validation
│       │   ├── tenants/
│       │   ├── projects/
│       │   ├── costs/
│       │   ├── diary/
│       │   ├── attendance/
│       │   ├── files/
│       │   ├── reports/
│       │   ├── drawings/             # Drawing reviews, revisions, status flow
│       │   ├── rfis/                 # RFI tracker
│       │   ├── materials/            # Materials requests + delivery
│       │   ├── delays/               # Delay logs + cause categorisation
│       │   ├── whatsapp/             # Controller, processor, service
│       │   ├── ai/                   # OpenAI wrapper, prompts
│       │   ├── jobs/                 # pg-boss setup, job definitions
│       │   ├── storage/              # Supabase Storage wrapper
│       │   └── common/
│       │       ├── guards/           # Auth, tenant RLS setter
│       │       ├── decorators/       # @CurrentUser, @CurrentTenant
│       │       ├── filters/          # Global exception filter
│       │       └── interceptors/     # Logging, response transform
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
└── packages/
    └── shared/
        ├── types/                    # Shared TypeScript interfaces
        │   ├── project.types.ts
        │   ├── cost.types.ts
        │   └── whatsapp.types.ts
        └── constants/
            └── categories.ts
```

---

## 12. Deployment Strategy

### Stage 1: Development (Now → First Client)

| Service | Platform | Cost |
|---|---|---|
| PostgreSQL + Auth + Storage | Supabase Free | $0 |
| Next.js Frontend | Vercel Free | $0 |
| NestJS API | Run locally / Railway Free | $0 |
| **Total** | | **$0/month** |

> ⚠️ Supabase free tier pauses after 7 days inactivity. Fine during active development. Upgrade before going live with a client.

### Stage 2: First Client Live

| Service | Platform | Cost |
|---|---|---|
| PostgreSQL + Auth + Storage | Supabase Pro | $25/month |
| Next.js Frontend | Vercel Free | $0 |
| NestJS API | Railway Starter | $5/month |
| OpenAI API | Pay per use | ~$10-30/month |
| **Total** | | **~$40-60/month** |

First client at GH₵1,500/month (~$100) covers all infrastructure for ~6 weeks.

### Stage 3: 5–20 Clients

Supabase Pro scales comfortably to this range. No infrastructure changes needed. Potential Railway tier upgrade ($10-20/month).

### Stage 4: 20+ Clients

Evaluate migration to:
- Railway's managed PostgreSQL (more control, lower cost)
- AWS RDS for PostgreSQL (dedicated, configurable)

Migration effort: update `DATABASE_URL` + `DIRECT_URL`, run `prisma migrate deploy`. Application code unchanged.

### Deployment Pipeline

```
Developer pushes to main branch on GitHub
          ↓
Vercel detects push → builds Next.js → deploys to CDN (2 min)
Railway detects push → runs npm build + prisma migrate deploy → restarts API (3 min)
          ↓
Zero manual steps. Zero SSH access required.
```

---

## 13. Environment Variables

```bash
# ── DATABASE ───────────────────────────────────────────
DATABASE_URL="postgresql://postgres:[pass]@db.[ref].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres"

# ── SUPABASE ───────────────────────────────────────────
SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_ANON_KEY="eyJ..."           # public, safe for frontend
SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # secret, backend only, never expose

# ── WHATSAPP ───────────────────────────────────────────
WHATSAPP_TOKEN="EAAxx..."            # Meta Cloud API access token
WHATSAPP_PHONE_ID="123456789"        # WhatsApp Business phone number ID
WHATSAPP_VERIFY_TOKEN="your-random-string-here"  # webhook verification
WHATSAPP_APP_SECRET="abc123..."      # for HMAC-SHA256 signature validation

# ── OPENAI ─────────────────────────────────────────────
OPENAI_API_KEY="sk-..."

# ── PAYSTACK ───────────────────────────────────────────
PAYSTACK_SECRET_KEY="sk_live_..."
PAYSTACK_PUBLIC_KEY="pk_live_..."

# ── APP ────────────────────────────────────────────────
NODE_ENV="production"
API_URL="https://api.buildos.rubicx.io"
FRONTEND_URL="https://app.buildos.rubicx.io"
JWT_SECRET="long-random-string"

# ── SENTRY ─────────────────────────────────────────────
SENTRY_DSN="https://..."
```

All validated at API startup via Zod — missing variables crash the app immediately with a clear error message, not silently at runtime.

---

## 14. Implementation Roadmap

### Week 1–2: Foundation
**Goal:** Monorepo scaffolded, database live, auth working, first API route.

- [ ] Create Turborepo monorepo (`buildos/apps/web`, `apps/api`, `packages/shared`)
- [ ] Set up Supabase project, copy connection strings
- [ ] Configure Prisma with Supabase dual connection strings
- [ ] Write initial schema (tenants, users, projects, project_members)
- [ ] Run first migration (`prisma migrate dev --name init`)
- [ ] Implement Supabase Auth in NestJS (JWT guard)
- [ ] RLS policies on all tables
- [ ] Tenant middleware (sets `app.current_tenant_id` per request)
- [ ] CRUD API for Projects
- [ ] Deploy NestJS to Railway + Next.js to Vercel
- [ ] Basic Next.js layout (sidebar, header, auth pages)

**Milestone:** Can create a tenant, log in, create a project via API.

---

### Week 3–4: WhatsApp Webhook Core
**Goal:** WhatsApp messages received, stored, and confirmation sent back.

- [ ] Register Meta WhatsApp Cloud API, get phone number
- [ ] Implement webhook verification endpoint (GET)
- [ ] Implement webhook receiver (POST) — returns 200 immediately
- [ ] pg-boss job queue setup
- [ ] Message processor: receive, identify sender, store raw message
- [ ] Download media from Meta CDN, upload to Supabase Storage
- [ ] Whisper integration for voice notes
- [ ] GPT-4o classification with structured output schema
- [ ] Store structured daily log / cost entry / attendance based on classification
- [ ] Send confirmation reply to sender
- [ ] Test with real phone sending messages to BuildOS number

**Milestone:** Send a WhatsApp message, receive structured data in database.

---

### Week 5–6: Dashboard Core
**Goal:** Portfolio and project view live with real data.

- [ ] Portfolio view: project cards with budget health, last activity
- [ ] Project view: overview tab (budget widget, quick stats)
- [ ] Site diary tab: chronological activity feed
- [ ] Photos tab: gallery grid
- [ ] Costs tab: entry list with pending confirmation flow
- [ ] TanStack Query hooks for all data
- [ ] 30-second polling for real-time-ish updates
- [ ] File upload to Supabase Storage, file list view
- [ ] Team tab: member list, add by phone number

**Milestone:** Full dashboard visible for a real project with real WhatsApp data.

---

### Week 7–8: Cost Tracking + Reports + Drawing Reviews
**Goal:** Financial visibility, client-ready PDF reports, and drawing approval workflow.

- [ ] PM confirms/rejects cost entries from dashboard
- [ ] Budget vs actual calculation and chart
- [ ] Budget alert system (75% / 90%) → WhatsApp notifications
- [ ] Attendance log view + weekly summary
- [ ] Friday automated attendance summary message
- [ ] @react-pdf/renderer report template
- [ ] GPT-4o report narrative generation
- [ ] "Generate Report" button → PDF download
- [ ] Timeline tab (phase blocks, manual % update)
- [ ] Drawing Review module: upload, status flow, revision history
- [ ] Drawing status change → WhatsApp notification to architect
- [ ] AI query bar (basic text-to-SQL)

**Milestone:** Generate a professional PDF report for Building Ideas from real site data. Architect can submit a drawing and PM can approve it through the system.

---

### Week 8–9: RFIs, Materials Requests & Delay Logging
**Goal:** The three workflows that directly protect against disputes and overruns.

- [ ] RFI Tracker: create, assign, track status, WhatsApp notifications on escalation
- [ ] Auto-reference number generation (BIL-07-RFI-001)
- [ ] RFI raised via WhatsApp: `#BIL-07 RFI: ...` parsed by AI
- [ ] Overdue RFI flagging in Open Items tab
- [ ] RFI log PDF export
- [ ] Materials Request: PM creates request with items + quantities
- [ ] Approval threshold check → auto-escalate to Owner via WhatsApp
- [ ] MD approve/reject via WhatsApp reply
- [ ] Foreman delivery confirmation via WhatsApp → matches to open request
- [ ] Partial delivery tracking
- [ ] Delivery auto-creates linked cost entry
- [ ] Delay Log: Foreman reports via WhatsApp → AI classifies cause
- [ ] PM reviews and overrides cause from dashboard
- [ ] Delay summary in project timeline view

**Milestone:** PM creates a materials request, MD approves via WhatsApp, foreman confirms delivery, cost entry appears automatically linked to the request.

---

### Week 10–11: Pilot — Building Ideas Limited
**Goal:** Live on real projects with a real client.

- [ ] Onboard Building Ideas team (Felix, Yaw, Arc. Poku)
- [ ] Create their tenant, configure branding (logo, colours)
- [ ] Import their active projects (2–3 to start)
- [ ] Register all team phone numbers
- [ ] Training session (1 hour max — show MD the dashboard, that's it)
- [ ] Field workers briefed: "Message this number with your project code"
- [ ] Monitor first week of real usage
- [ ] Fix the top 3 friction points immediately

**Milestone:** Building Ideas submitting daily logs via WhatsApp with zero training.

---

### Week 12: Harden + Billing
**Goal:** Production-ready, billable product.

- [ ] Paystack subscription integration
- [ ] Upgrade Supabase to Pro (live client = no pausing allowed)
- [ ] Sentry error tracking live
- [ ] Rate limiting on API endpoints
- [ ] Error handling and retry logic for failed AI calls
- [ ] Performance testing (load test webhook endpoint)
- [ ] Security audit (RLS policy test, API authorization test)
- [ ] Building Ideas signs full subscription agreement
- [ ] Begin outreach to second client

**Milestone:** First MRR. Building Ideas paying GH₵1,500/month.

---

## 15. Pricing & Billing

### Plans

| Plan | Price | Projects | Users | WhatsApp | AI Reports |
|---|---|---|---|---|---|
| **Starter** | GH₵600/month | Up to 3 | Up to 5 | ✅ | ✅ |
| **Professional** | GH₵1,500/month | Up to 15 | Up to 20 | ✅ | ✅ |
| **Enterprise** | GH₵3,000+/month | Unlimited | Unlimited | ✅ | ✅ |

**Note:** Billed per company (tenant), not per user. Charging per user creates incentive to restrict who's in the WhatsApp group — which kills adoption.

### Billing Implementation
- Paystack Subscription API handles recurring payments
- Ghana Cedi (GHS) primary, USD available for international clients
- Supports: MTN MoMo, Vodafone Cash, Visa/Mastercard, bank transfer
- Invoice emailed automatically on payment

---

## 16. Out of Scope — v1

The following are deliberately excluded from v1. They are built when real users ask for them — not before.

| Feature | Why Excluded | When to Build |
|---|---|---|
| Invoice generation | Complex, legal, accounting domain | When clients request it (v2) |
| GHANEPS integration | Government procurement specifics | When targeting government contracts (v2) |
| EPA compliance module | Niche, requires regulatory knowledge | When environmental-heavy clients onboard |
| Client portal (client login) | Adds complexity, share PDF instead | When clients repeatedly ask for self-service |
| Payroll calculation | Labour law complexity, liability | v2/v3 based on demand |
| Equipment/asset tracking | Different problem space | v2 if field data shows demand |
| Subcontractor management | Contracts, payments, complexity | v2 |
| BOQ generation | Quantity surveying domain | v3 / separate module |
| Full interactive Gantt | High build + maintenance cost | When PM explicitly requests it |
| Offline mobile app | High complexity, WhatsApp handles field | v2 if connectivity proves bigger issue than expected |
| AI cost forecasting | Needs 6+ months of historical data first | v3 |
| Multi-language UI (Twi, Ga) | Localisation complexity | v2 based on user feedback |
| Supplier/vendor management | Separate domain from project management | v2 — connect to materials requests |
| Document co-editing | Complex real-time infra (like Google Docs) | Not needed — BuildOS is a tracker, not an editor |

---

*BuildOS is built by Rubicx Technologies Ltd., Accra, Ghana.*
*rubicx.io · hello@rubicx.io*
