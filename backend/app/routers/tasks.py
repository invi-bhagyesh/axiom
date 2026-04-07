import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.database import get_conn
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class AnnotationSubmit(BaseModel):
    responses: dict


@router.get("")
async def my_tasks(user: dict = Depends(get_current_user)):
    async with get_conn() as (conn, cur):
        await cur.execute(
            """SELECT at2.id, at2.project_id, at2.dataset_item_id, at2.status,
                      at2.assigned_at, at2.started_at,
                      p.title as project_title,
                      di.item_data
            FROM annotation_tasks at2
            JOIN projects p ON p.id = at2.project_id
            JOIN dataset_items di ON di.id = at2.dataset_item_id
            WHERE at2.annotator_id = %s AND at2.status IN ('pending', 'in_progress')
            ORDER BY at2.assigned_at""",
            (user["id"],),
        )
        return await cur.fetchall()


@router.get("/projects")
async def my_task_projects(user: dict = Depends(get_current_user)):
    """Group pending/in-progress tasks by project for the annotator queue."""
    async with get_conn() as (conn, cur):
        await cur.execute(
            """SELECT
                p.id as project_id,
                p.title,
                p.description,
                p.status as project_status,
                COUNT(*) as total_tasks,
                SUM(CASE WHEN at2.status = 'submitted' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN at2.status IN ('pending','in_progress') THEN 1 ELSE 0 END) as remaining_tasks,
                MIN(at2.assigned_at) as first_assigned
            FROM annotation_tasks at2
            JOIN projects p ON p.id = at2.project_id
            WHERE at2.annotator_id = %s
            GROUP BY p.id, p.title, p.description, p.status
            HAVING remaining_tasks > 0
            ORDER BY first_assigned""",
            (user["id"],),
        )
        return await cur.fetchall()


@router.get("/projects/{project_id}/next")
async def next_task_in_project(project_id: str, user: dict = Depends(get_current_user)):
    """Get the next pending/in-progress task for this annotator in a project."""
    async with get_conn() as (conn, cur):
        await cur.execute(
            """SELECT at2.id, at2.project_id, at2.dataset_item_id, at2.status,
                      at2.assigned_at, at2.started_at,
                      p.title as project_title,
                      di.item_data, di.external_id
            FROM annotation_tasks at2
            JOIN projects p ON p.id = at2.project_id
            JOIN dataset_items di ON di.id = at2.dataset_item_id
            WHERE at2.annotator_id = %s AND at2.project_id = %s
              AND at2.status IN ('pending', 'in_progress')
            ORDER BY di.position, at2.assigned_at
            LIMIT 1""",
            (user["id"], project_id),
        )
        task = await cur.fetchone()
        if not task:
            return {"done": True, "project_id": project_id}

        # include schema and progress info
        await cur.execute(
            "SELECT * FROM schema_fields WHERE project_id = %s ORDER BY position",
            (project_id,),
        )
        task["schema_fields"] = await cur.fetchall()

        # progress: how many done / total in this project for this user
        await cur.execute(
            """SELECT COUNT(*) as total,
                      SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as completed
            FROM annotation_tasks
            WHERE annotator_id = %s AND project_id = %s""",
            (user["id"], project_id),
        )
        progress = await cur.fetchone()
        task["progress_total"] = progress["total"]
        task["progress_completed"] = progress["completed"]

        return task


@router.get("/history")
async def task_history(user: dict = Depends(get_current_user)):
    async with get_conn() as (conn, cur):
        await cur.execute(
            """SELECT at2.id, at2.project_id, at2.status, at2.submitted_at,
                      p.title as project_title
            FROM annotation_tasks at2
            JOIN projects p ON p.id = at2.project_id
            WHERE at2.annotator_id = %s AND at2.status = 'submitted'
            ORDER BY at2.submitted_at DESC
            LIMIT 100""",
            (user["id"],),
        )
        return await cur.fetchall()


@router.get("/history/projects")
async def task_history_by_project(user: dict = Depends(get_current_user)):
    """Group completed tasks by project for history view."""
    async with get_conn() as (conn, cur):
        await cur.execute(
            """SELECT
                p.id as project_id,
                p.title,
                COUNT(*) as completed_tasks,
                MAX(at2.submitted_at) as last_submitted
            FROM annotation_tasks at2
            JOIN projects p ON p.id = at2.project_id
            WHERE at2.annotator_id = %s AND at2.status = 'submitted'
            GROUP BY p.id, p.title
            ORDER BY last_submitted DESC""",
            (user["id"],),
        )
        return await cur.fetchall()


@router.get("/{task_id}")
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    async with get_conn() as (conn, cur):
        await cur.execute(
            """SELECT at2.*, di.item_data, di.external_id,
                      p.title as project_title
            FROM annotation_tasks at2
            JOIN dataset_items di ON di.id = at2.dataset_item_id
            JOIN projects p ON p.id = at2.project_id
            WHERE at2.id = %s""",
            (task_id,),
        )
        task = await cur.fetchone()
        if not task:
            raise HTTPException(404, "Task not found")
        # Get schema for this project
        await cur.execute(
            "SELECT * FROM schema_fields WHERE project_id = %s ORDER BY position",
            (task["project_id"],),
        )
        task["schema_fields"] = await cur.fetchall()
        # Get existing annotation if any
        await cur.execute("SELECT * FROM annotations WHERE task_id = %s", (task_id,))
        task["annotation"] = await cur.fetchone()
        return task


@router.patch("/{task_id}/start")
async def start_task(task_id: str, user: dict = Depends(get_current_user)):
    async with get_conn() as (conn, cur):
        await cur.execute(
            "UPDATE annotation_tasks SET status = 'in_progress', started_at = NOW() WHERE id = %s AND annotator_id = %s AND status = 'pending'",
            (task_id, user["id"]),
        )
        return {"started": True}


@router.post("/{task_id}/submit")
async def submit_annotation(task_id: str, body: AnnotationSubmit, user: dict = Depends(get_current_user)):
    async with get_conn() as (conn, cur):
        # Verify task belongs to user and is in progress
        await cur.execute(
            "SELECT * FROM annotation_tasks WHERE id = %s AND annotator_id = %s",
            (task_id, user["id"]),
        )
        task = await cur.fetchone()
        if not task:
            raise HTTPException(404, "Task not found")
        if task["status"] == "submitted":
            raise HTTPException(400, "Task already submitted")

        # Mark in_progress if still pending
        if task["status"] == "pending":
            await cur.execute(
                "UPDATE annotation_tasks SET status = 'in_progress', started_at = NOW() WHERE id = %s",
                (task_id,),
            )

        # Insert annotation (trigger will auto-mark task as submitted)
        await cur.execute(
            "INSERT INTO annotations (task_id, responses) VALUES (%s, %s)",
            (task_id, json.dumps(body.responses)),
        )
        return {"submitted": True}
