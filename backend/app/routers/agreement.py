from fastapi import APIRouter, Depends, HTTPException
from app.database import get_conn
from app.auth import require_role

router = APIRouter(prefix="/api/projects/{project_id}", tags=["agreement"])


@router.get("/agreement")
async def get_agreement(project_id: str, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute(
            "SELECT * FROM agreement_scores WHERE project_id = %s ORDER BY field_key",
            (project_id,),
        )
        return await cur.fetchall()


@router.post("/agreement/compute")
async def compute_agreement(project_id: str, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        try:
            await cur.execute("CALL sp_compute_agreement(%s)", (project_id,))
        except Exception as e:
            raise HTTPException(400, str(e))
        await cur.execute(
            "SELECT * FROM agreement_scores WHERE project_id = %s ORDER BY field_key",
            (project_id,),
        )
        return await cur.fetchall()


@router.get("/flags")
async def get_flags(project_id: str, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute(
            """SELECT af.*, di.item_data, di.external_id
            FROM ai_flags af
            JOIN dataset_items di ON di.id = af.dataset_item_id
            WHERE af.project_id = %s AND af.is_flagged = TRUE
            ORDER BY af.confidence_score DESC""",
            (project_id,),
        )
        return await cur.fetchall()
