from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_conn
from app.auth import require_role

router = APIRouter(prefix="/api/projects/{project_id}/schema", tags=["schema"])


class FieldCreate(BaseModel):
    field_key: str
    label: str
    description: Optional[str] = None
    field_type: str
    is_required: bool = True
    position: int = 0
    config: dict = {}


class FieldUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    is_required: Optional[bool] = None
    position: Optional[int] = None
    config: Optional[dict] = None


@router.get("")
async def list_fields(project_id: str, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute(
            "SELECT * FROM schema_fields WHERE project_id = %s ORDER BY position",
            (project_id,),
        )
        return await cur.fetchall()


@router.post("")
async def create_field(project_id: str, body: FieldCreate, user: dict = Depends(require_role("requester"))):
    import json
    async with get_conn() as (conn, cur):
        try:
            await cur.execute(
                """INSERT INTO schema_fields
                (project_id, field_key, label, description, field_type, is_required, position, config)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                (project_id, body.field_key, body.label, body.description,
                 body.field_type, body.is_required, body.position, json.dumps(body.config)),
            )
        except Exception as e:
            if "45000" in str(e):
                raise HTTPException(400, "Cannot modify schema of non-draft project")
            raise
        await cur.execute(
            "SELECT * FROM schema_fields WHERE project_id = %s AND field_key = %s",
            (project_id, body.field_key),
        )
        return await cur.fetchone()


@router.put("/{field_id}")
async def update_field(project_id: str, field_id: str, body: FieldUpdate, user: dict = Depends(require_role("requester"))):
    import json
    updates = {}
    for k, v in body.model_dump().items():
        if v is not None:
            updates[k] = json.dumps(v) if k == "config" else v
    if not updates:
        raise HTTPException(400, "No fields to update")
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [field_id, project_id]
    async with get_conn() as (conn, cur):
        try:
            await cur.execute(
                f"UPDATE schema_fields SET {set_clause} WHERE id = %s AND project_id = %s",
                values,
            )
        except Exception as e:
            if "45000" in str(e):
                raise HTTPException(400, "Cannot modify schema of non-draft project")
            raise
        await cur.execute("SELECT * FROM schema_fields WHERE id = %s", (field_id,))
        return await cur.fetchone()


@router.delete("/{field_id}")
async def delete_field(project_id: str, field_id: str, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute("SELECT status FROM projects WHERE id = %s", (project_id,))
        proj = await cur.fetchone()
        if not proj or proj["status"] != "draft":
            raise HTTPException(400, "Cannot modify schema of non-draft project")
        await cur.execute("DELETE FROM schema_fields WHERE id = %s AND project_id = %s", (field_id, project_id))
        return {"deleted": True}
