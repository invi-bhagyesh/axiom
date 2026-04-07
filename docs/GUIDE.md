# Axiom - System Guide

## 1. What is Axiom?

Axiom is a general-purpose human annotation platform. Researchers create custom annotation projects, define what questions annotators should answer, upload data, and collect structured labels from human annotators. An AI module (Claude API) automatically flags items where annotators disagree, helping maintain data quality.

**Core problem it solves:** Building reliable AI systems requires high-quality labelled data, but current annotation workflows are ad-hoc, lack quality control, and don't scale.

---

## 2. System Overview

### Architecture

```
User Browser
     |
     v
Next.js (Frontend, :3000)
     |  REST API calls
     v
FastAPI (Backend, :8000)
     |          |
     v          v
MySQL 8.0    Claude API
(:3306)      (external)
```

All services run locally via Docker Compose with a single `docker compose up` command.

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Frontend | Next.js (React) | Server-side rendering, dynamic routing, great DX |
| Backend | FastAPI (Python) | Async, auto-generates API docs, Pydantic validation |
| Database | MySQL 8.0 | Stored procedures, triggers, views — satisfies DBS course requirement |
| AI Flagging | Claude API | Detects annotation divergence, explains rationale |
| Containerization | Docker Compose | One-command setup, reproducible environment |

---

## 3. User Roles

### Requester (Project Creator)
The researcher or developer who needs labelled data.

**What they do:**
1. Create an annotation project (title, description, deadline)
2. Define a custom annotation schema (what questions annotators answer)
3. Upload a dataset (JSON file with items to annotate)
4. Enroll annotators into the project
5. Trigger task assignment (distributes items to annotators)
6. Monitor progress (dashboard with completion %, flagged items)
7. View inter-annotator agreement scores
8. Export the final labelled dataset (JSON/CSV)

### Annotator (Contributor)
The human labeller who provides ground truth labels.

**What they do:**
1. Browse their task queue (assigned items across projects)
2. Open a task and see the item + dynamic annotation form
3. Submit their structured responses (Likert scores, booleans, free text)
4. Review past submissions
5. View their annotation history

### System (AI)
Automated quality control powered by Claude API.

**What it does:**
1. After all annotations for an item are collected, the system sends the schema + all responses to Claude
2. Claude detects whether annotators diverged significantly
3. Flags items with a confidence score and written rationale
4. Requester reviews flagged items in a dedicated view

---

## 4. Database Design

### Tables (10 total)

| Table | Purpose |
|-------|---------|
| `users` | All registered users (requesters + annotators) |
| `projects` | Annotation projects with status lifecycle |
| `schema_fields` | Custom form field definitions per project |
| `datasets` | Named dataset containers within a project |
| `dataset_items` | Individual items to be annotated (JSON payload) |
| `project_annotators` | Junction table: which annotators are in which project |
| `annotation_tasks` | Assignment records: one annotator + one item |
| `annotations` | Submitted annotation responses (JSON) |
| `ai_flags` | AI flagging results per item |
| `agreement_scores` | Cached inter-annotator agreement per field |
| `export_log` | Audit trail of dataset exports |

### Key Relationships

```
users --1:N--> projects (requester creates projects)
users --M:N--> projects (annotators enrolled via project_annotators)
projects --1:N--> schema_fields (custom form definition)
projects --1:N--> datasets --1:N--> dataset_items
annotation_tasks --1:1--> annotations
projects --1:N--> ai_flags
projects --1:N--> agreement_scores
```

### Stored Procedures (2)

**`sp_assign_tasks(project_id)`**
- Distributes dataset items to enrolled annotators
- Round-robin assignment ensuring each item gets N distinct annotators
- N = `projects.min_annotations_per_item` (default 3)
- Skips items that already have enough assignments
- Uses MySQL cursors and loops

**`sp_compute_agreement(project_id)`**
- Calculates percentage agreement per annotation field
- Iterates over all Likert/boolean schema fields
- For each field, checks what % of items have unanimous annotator agreement
- Upserts results into `agreement_scores` table

### Triggers (4)

| Trigger | When | What |
|---------|------|------|
| `trg_annotation_after_insert` | After annotation inserted | Sets task status = 'submitted', records timestamp |
| `trg_annotation_check_completion` | After annotation inserted | If ALL tasks in project are submitted, auto-sets project status = 'completed' |
| `trg_schema_fields_before_insert` | Before schema field insert | Blocks insert if project is not in 'draft' status |
| `trg_schema_fields_before_update` | Before schema field update | Blocks update if project is not in 'draft' status |

### Views (3)

| View | Purpose |
|------|---------|
| `v_project_progress` | Dashboard summary: total tasks, submitted, pending, % complete, flagged count |
| `v_annotator_workload` | Per-annotator breakdown: assigned, completed, remaining per project |
| `v_annotation_export` | Flattened join of items + annotations + flags for JSON/CSV export |

---

## 5. Custom Schema Engine

The killer feature. Instead of hardcoding annotation types, requesters define schemas via JSON:

```json
{
  "fields": [
    {
      "field_key": "linguistic_habits",
      "label": "Linguistic Habits",
      "field_type": "likert",
      "config": { "min": 1, "max": 5 },
      "is_required": true
    },
    {
      "field_key": "contains_pii",
      "label": "Contains PII?",
      "field_type": "boolean",
      "is_required": true
    },
    {
      "field_key": "notes",
      "label": "Qualitative Feedback",
      "field_type": "free_text",
      "is_required": false
    }
  ]
}
```

Each field is stored as a row in `schema_fields`. The frontend reads these rows and renders the appropriate UI component at runtime (LikertField, BooleanField, FreeTextField, etc.).

**Supported field types:**
- `likert` — 1-N scale with optional labels
- `boolean` — yes/no toggle
- `free_text` — open text area
- `multi_select` — select multiple from predefined options
- `image_tag` — tag regions of an image (post-MVP)
- `bounding_box` — draw boxes on images (post-MVP)

---

## 6. AI Flagging Pipeline

```
1. Annotator submits annotation
2. Trigger marks task as submitted
3. Backend checks: does this item have all required annotations?
4. If yes → call Claude API with:
   - The annotation schema definition
   - All submitted responses for this item
   - Prompt: "Do these annotations show significant disagreement?"
5. Claude returns: { flagged: true/false, confidence: 0.85, rationale: "..." }
6. Result stored in ai_flags table
7. Requester sees flagged items in dashboard
```

---

## 7. API Endpoints

### Auth
- `POST /api/auth/register` — Create account (requester or annotator)
- `POST /api/auth/login` — Get JWT token
- `GET /api/auth/me` — Current user info

### Projects (Requester)
- `POST /api/projects` — Create project
- `GET /api/projects` — List my projects
- `GET /api/projects/{id}` — Project detail with schema
- `PATCH /api/projects/{id}` — Update project
- `GET /api/projects/{id}/progress` — Dashboard data

### Schema (Requester)
- `GET /api/projects/{id}/schema` — Get all fields
- `POST /api/projects/{id}/schema` — Add field (draft only)
- `PUT /api/projects/{id}/schema/{fid}` — Update field
- `DELETE /api/projects/{id}/schema/{fid}` — Remove field

### Data (Requester)
- `POST /api/projects/{id}/datasets` — Create dataset
- `POST /api/projects/{id}/datasets/{did}/upload` — Bulk upload items (JSON)
- `GET /api/projects/{id}/datasets/{did}/items` — Browse items

### Assignment (Requester)
- `POST /api/projects/{id}/annotators` — Enroll annotator
- `POST /api/projects/{id}/assign` — Run `sp_assign_tasks`

### Tasks (Annotator)
- `GET /api/tasks` — My pending/in-progress tasks
- `GET /api/tasks/{tid}` — Task detail with item data + schema
- `PATCH /api/tasks/{tid}/start` — Mark in progress
- `POST /api/tasks/{tid}/submit` — Submit annotation

### Quality (Requester)
- `GET /api/projects/{id}/agreement` — Agreement scores
- `POST /api/projects/{id}/agreement/compute` — Run `sp_compute_agreement`
- `GET /api/projects/{id}/flags` — Flagged items list
- `POST /api/projects/{id}/flags/analyze` — Trigger AI flagging

### Export (Requester)
- `GET /api/projects/{id}/export?format=json` — Download labelled dataset

---

## 8. Frontend Pages

### Shared
- `/login` — Login form
- `/register` — Registration form

### Requester Dashboard
- `/dashboard` — All projects with progress bars
- `/projects/new` — Create project wizard
- `/projects/[id]` — Project hub with tabs:
  - **Overview** — Status, deadline, stats
  - **Schema** — Drag-and-drop field builder
  - **Data** — Upload JSON, browse items
  - **Annotators** — Enroll users, assign tasks, view workload
  - **Results** — Agreement table, flagged items, export button
- `/projects/[id]/results/item/[iid]` — Side-by-side annotation comparison

### Annotator
- `/annotate` — Task queue (pending + in-progress)
- `/annotate/[tid]` — Dynamic annotation form
- `/annotate/[tid]/review` — Read-only view of submitted work
- `/annotate/history` — All completed tasks

---

## 9. Example Use Case: AI Persona Evaluation

A researcher wants to evaluate whether an LLM agent stays "in character."

**Step 1 — Create Project**
Title: "Persona Consistency Study"
Min annotations per item: 3

**Step 2 — Define Schema**
- Linguistic Habits (Likert 1-5): "Does the agent use expected vocabulary?"
- Persona Consistency (Likert 1-5): "Does the response contradict the biography?"
- Expected Action (Likert 1-5): "Is the decision logical for this character?"
- Action Justification (Likert 1-5): "Does the explanation sound like the persona?"
- Qualitative Feedback (Free text): "Any additional notes?"

**Step 3 — Upload Dataset**
```json
[
  {
    "persona": "36-year-old Australian environmental lawyer",
    "environment": "Corporate boardroom negotiation",
    "response": "Look, mate, we can't just bulldoze the heritage site..."
  }
]
```

**Step 4 — Assign & Collect**
Enroll 3 annotators → assign tasks → annotators submit scores

**Step 5 — Analyze**
- View agreement: "Linguistic Habits" has 87% agreement, "Expected Action" only 54%
- AI flags 3 items where annotators scored 1 vs 5
- Export final dataset for ML training

---

## 10. Running the Project

```bash
# Clone
git clone https://github.com/your-username/axiom.git
cd axiom

# Start everything
docker compose up

# Access
# Frontend: http://localhost:3000
# Backend API docs: http://localhost:8000/docs
# MySQL: localhost:3306
```

### Environment Variables
```env
# .env
MYSQL_ROOT_PASSWORD=axiom_root
MYSQL_DATABASE=axiom
MYSQL_USER=axiom_user
MYSQL_PASSWORD=axiom_pass

JWT_SECRET=your-secret-key
CLAUDE_API_KEY=sk-ant-...
```
