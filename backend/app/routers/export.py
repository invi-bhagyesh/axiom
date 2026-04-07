import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.database import get_conn
from app.auth import require_role

router = APIRouter(prefix="/api/projects/{project_id}/export", tags=["export"])


@router.get("")
async def export_dataset(project_id: str, format: str = "json", user: dict = Depends(require_role("requester"))):
    async with get_conn() as (conn, cur):
        await cur.execute(
            "SELECT * FROM v_annotation_export WHERE project_id = %s ORDER BY item_id, annotator_id",
            (project_id,),
        )
        rows = await cur.fetchall()

        if not rows:
            raise HTTPException(404, "No annotations to export")

        # Log export
        await cur.execute(
            "INSERT INTO export_log (project_id, requested_by, format, row_count) VALUES (%s,%s,%s,%s)",
            (project_id, user["id"], format, len(rows)),
        )

    # Serialize datetime/decimal fields
    for row in rows:
        for k, v in row.items():
            if hasattr(v, "isoformat"):
                row[k] = v.isoformat()
            elif hasattr(v, "__float__"):
                row[k] = float(v)

    if format == "csv":
        import csv
        import io
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=axiom-export-{project_id}.csv"},
        )

    return StreamingResponse(
        iter([json.dumps(rows, indent=2, default=str)]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=axiom-export-{project_id}.json"},
    )
