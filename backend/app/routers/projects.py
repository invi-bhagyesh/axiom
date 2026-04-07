from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_conn
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    min_annotations_per_item: int = 3
    deadline: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    min_annotations_per_item: Optional[int] = None
    deadline: Optional[str] = None


@router.get("")
async def list_projects(user: dict = Depends(get_current_user)):
    async with get_conn() as (conn, cur):
        if user["role"] == "requester":
            await cur.execute(
                "SELECT * FROM v_project_progress WHERE requester_id = %s ORDER BY deadline IS NULL, deadline",
                (user["id"],),
            )
        else:
            await cur.execute(
                """SELECT p.id, p.title, p.status, p.deadline, p.created_at
                FROM projects p
                JOIN project_annotators pa ON pa.project_id = p.id
                WHERE pa.annotator_id = %s""",
                (user["id"],),
            )
        return await cur.fetchall()


@router.post("")
async def create_project(body: ProjectCreate, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute(
            "INSERT INTO projects (requester_id, title, description, min_annotations_per_item, deadline) VALUES (%s,%s,%s,%s,%s)",
            (user["id"], body.title, body.description, body.min_annotations_per_item, body.deadline),
        )
        await cur.execute(
            "SELECT * FROM projects WHERE requester_id = %s ORDER BY created_at DESC LIMIT 1",
            (user["id"],),
        )
        return await cur.fetchone()


@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    async with get_conn() as (conn, cur):
        await cur.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
        project = await cur.fetchone()
        if not project:
            raise HTTPException(404, "Project not found")
        await cur.execute(
            "SELECT * FROM schema_fields WHERE project_id = %s ORDER BY position",
            (project_id,),
        )
        project["schema_fields"] = await cur.fetchall()
        return project


@router.patch("/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate, user: dict = Depends(require_role("requester"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [project_id, user["id"]]
    async with get_conn() as (conn, cur):
        await cur.execute(
            f"UPDATE projects SET {set_clause} WHERE id = %s AND requester_id = %s",
            values,
        )
        await cur.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
        return await cur.fetchone()


@router.get("/{project_id}/progress")
async def project_progress(project_id: str, user: dict = Depends(get_current_user)):
    async with get_conn() as (conn, cur):
        await cur.execute("SELECT * FROM v_project_progress WHERE project_id = %s", (project_id,))
        result = await cur.fetchone()
        if not result:
            raise HTTPException(404, "Project not found")
        return result
