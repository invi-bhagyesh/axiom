import json
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_conn
from app.auth import require_role
from app.config import settings

router = APIRouter(prefix="/api/projects/{project_id}/flags", tags=["ai-flagging"])


@router.post("/analyze")
async def analyze_flags(project_id: str, user: dict = Depends(require_role("requester"))):
    if not settings.CLAUDE_API_KEY:
        raise HTTPException(400, "CLAUDE_API_KEY not configured")

    import anthropic
    client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

    async with get_conn() as (conn, cur):
        # Get schema fields
        await cur.execute(
            "SELECT field_key, label, field_type FROM schema_fields WHERE project_id = %s ORDER BY position",
            (project_id,),
        )
        schema_fields = await cur.fetchall()

        # Get items with all annotations submitted
        await cur.execute(
            """SELECT di.id as item_id, di.item_data, di.external_id
            FROM dataset_items di
            JOIN datasets d ON d.id = di.dataset_id
            WHERE d.project_id = %s
            AND NOT EXISTS (
                SELECT 1 FROM ai_flags af
                WHERE af.dataset_item_id = di.id AND af.project_id = %s
            )""",
            (project_id, project_id),
        )
        items = await cur.fetchall()

        flagged_count = 0

        for item in items:
            # Get all annotations for this item
            await cur.execute(
                """SELECT a.responses, u.display_name
                FROM annotations a
                JOIN annotation_tasks at2 ON at2.id = a.task_id
                JOIN users u ON u.id = at2.annotator_id
                WHERE at2.dataset_item_id = %s AND at2.project_id = %s AND at2.status = 'submitted'""",
                (item["item_id"], project_id),
            )
            annotations = await cur.fetchall()

            if len(annotations) < 2:
                continue

            # Build prompt
            schema_desc = "\n".join(f"- {f['field_key']} ({f['field_type']}): {f['label']}" for f in schema_fields)
            ann_desc = "\n".join(
                f"Annotator {a['display_name']}: {json.dumps(a['responses'], default=str)}"
                for a in annotations
            )

            prompt = f"""Analyze these human annotations for inter-annotator agreement.

Item data: {json.dumps(item['item_data'], default=str)}

Annotation schema:
{schema_desc}

Submitted annotations:
{ann_desc}

Respond ONLY with valid JSON:
{{"flagged": true/false, "confidence": 0.0-1.0, "rationale": "brief explanation"}}

Flag as true if annotators significantly disagree on any field. Confidence = how certain you are there's a real disagreement (not just noise)."""

            try:
                response = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=300,
                    messages=[{"role": "user", "content": prompt}],
                )
                result = json.loads(response.content[0].text)
            except Exception:
                result = {"flagged": False, "confidence": 0, "rationale": "AI analysis failed"}

            # Store flag
            await cur.execute(
                """INSERT INTO ai_flags (project_id, dataset_item_id, is_flagged, confidence_score, rationale, model_version)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    is_flagged = VALUES(is_flagged),
                    confidence_score = VALUES(confidence_score),
                    rationale = VALUES(rationale),
                    model_version = VALUES(model_version),
                    flagged_at = NOW()""",
                (project_id, item["item_id"], result.get("flagged", False),
                 result.get("confidence", 0), result.get("rationale", ""),
                 "claude-sonnet-4-20250514"),
            )

            if result.get("flagged"):
                flagged_count += 1

    return {"analyzed": len(items), "flagged": flagged_count}
