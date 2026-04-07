from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.database import get_conn
from app.auth import hash_password, verify_password, create_token, get_current_user
from fastapi import Depends

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    role: str  # 'requester' or 'annotator'


class LoginReq(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
async def register(body: RegisterReq):
    if body.role not in ("requester", "annotator"):
        raise HTTPException(400, "Role must be 'requester' or 'annotator'")
    async with get_conn() as (conn, cur):
        await cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
        if await cur.fetchone():
            raise HTTPException(409, "Email already registered")
        hashed = hash_password(body.password)
        await cur.execute(
            "INSERT INTO users (email, password_hash, display_name, role) VALUES (%s, %s, %s, %s)",
            (body.email, hashed, body.display_name, body.role),
        )
        await cur.execute("SELECT LAST_INSERT_ID() as id")
        # UUID is auto-generated, fetch it
        await cur.execute("SELECT id, email, display_name, role FROM users WHERE email = %s", (body.email,))
        user = await cur.fetchone()
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": user}


@router.post("/login")
async def login(body: LoginReq):
    async with get_conn() as (conn, cur):
        await cur.execute("SELECT id, email, display_name, role, password_hash FROM users WHERE email = %s", (body.email,))
        user = await cur.fetchone()
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash"}}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user
