from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.database import get_conn
from app.auth import require_role

router = APIRouter(prefix="/api/projects/{project_id}/annotators", tags=["annotators"])


class EnrollReq(BaseModel):
    annotator_email: str


@router.get("")
async def list_annotators(project_id: str, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute(
            """SELECT u.id, u.email, u.display_name, pa.enrolled_at
            FROM project_annotators pa
            JOIN users u ON u.id = pa.annotator_id
            WHERE pa.project_id = %s""",
            (project_id,),
        )
        return await cur.fetchall()


@router.post("")
async def enroll_annotator(project_id: str, body: EnrollReq, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute(
            "SELECT id FROM users WHERE email = %s AND role = 'annotator'",
            (body.annotator_email,),
        )
        annotator = await cur.fetchone()
        if not annotator:
            raise HTTPException(404, "Annotator not found with that email")
        try:
            await cur.execute(
                "INSERT INTO project_annotators (project_id, annotator_id) VALUES (%s, %s)",
                (project_id, annotator["id"]),
            )
        except Exception:
            raise HTTPException(409, "Annotator already enrolled")
    return {"enrolled": True, "annotator_id": annotator["id"]}


@router.delete("/{annotator_id}")
async def remove_annotator(project_id: str, annotator_id: str, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute(
            "DELETE FROM project_annotators WHERE project_id = %s AND annotator_id = %s",
            (project_id, annotator_id),
        )
    return {"removed": True}


@router.post("/assign")
async def assign_tasks(project_id: str, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        try:
            await cur.execute("CALL sp_assign_tasks(%s)", (project_id,))
        except Exception as e:
            raise HTTPException(400, str(e))
        await cur.execute(
            "SELECT COUNT(*) as count FROM annotation_tasks WHERE project_id = %s",
            (project_id,),
        )
        result = await cur.fetchone()
    return {"tasks_created": result["count"]}
