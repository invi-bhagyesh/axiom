from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_pool, close_pool
from app.routers import auth, projects, schema, datasets, annotators, tasks, agreement, export
from app.services import ai_flagging


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="Axiom", description="General-Purpose Human Annotation Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(schema.router)
app.include_router(datasets.router)
app.include_router(annotators.router)
app.include_router(tasks.router)
app.include_router(agreement.router)
app.include_router(export.router)
app.include_router(ai_flagging.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
