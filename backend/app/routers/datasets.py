import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from app.database import get_conn
from app.auth import require_role

router = APIRouter(prefix="/api/projects/{project_id}/datasets", tags=["datasets"])


class DatasetCreate(BaseModel):
    name: str


@router.get("")
async def list_datasets(project_id: str, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute("SELECT * FROM datasets WHERE project_id = %s", (project_id,))
        return await cur.fetchall()


@router.post("")
async def create_dataset(project_id: str, body: DatasetCreate, user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute(
            "INSERT INTO datasets (project_id, name) VALUES (%s, %s)",
            (project_id, body.name),
        )
        await cur.execute(
            "SELECT * FROM datasets WHERE project_id = %s ORDER BY created_at DESC LIMIT 1",
            (project_id,),
        )
        return await cur.fetchone()


@router.post("/{dataset_id}/upload")
async def upload_items(project_id: str, dataset_id: str, file: UploadFile = File(...), user: dict = Depends(require_role("requester"))):
    content = await file.read()
    try:
        items = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON file")

    if not isinstance(items, list):
        raise HTTPException(400, "JSON must be an array of objects")

    async with get_conn() as (conn, cur):
        count = 0
        for i, item in enumerate(items):
            external_id = item.pop("_id", item.pop("external_id", None))
            await cur.execute(
                "INSERT INTO dataset_items (dataset_id, external_id, item_data, position) VALUES (%s,%s,%s,%s)",
                (dataset_id, str(external_id) if external_id else None, json.dumps(item), i),
            )
            count += 1
    return {"uploaded": count}


@router.get("/{dataset_id}/items")
async def list_items(project_id: str, dataset_id: str, page: int = 1, size: int = 50, user: dict = Depends(require_role("requester"))):
    offset = (page - 1) * size
    async with get_conn() as (conn, cur):
        await cur.execute("SELECT COUNT(*) as total FROM dataset_items WHERE dataset_id = %s", (dataset_id,))
        total = (await cur.fetchone())["total"]
        await cur.execute(
            "SELECT * FROM dataset_items WHERE dataset_id = %s ORDER BY position LIMIT %s OFFSET %s",
            (dataset_id, size, offset),
        )
        items = await cur.fetchall()
    return {"items": items, "total": total, "page": page, "size": size}
