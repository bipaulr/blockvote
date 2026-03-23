from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.models.database import get_db
import hashlib

router = APIRouter()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

class RegisterRequest(BaseModel):
    voter_id: str
    password: str

class LoginRequest(BaseModel):
    voter_id: str
    password: str

@router.post("/register")
def register(req: RegisterRequest):
    db = get_db()
    voter = db.execute("SELECT * FROM voters WHERE voter_id = ?", (req.voter_id,)).fetchone()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found. Register with admin first.")
    existing = db.execute("SELECT * FROM voter_credentials WHERE voter_id = ?", (req.voter_id,)).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Voter already has a password set.")
    db.execute(
        "INSERT INTO voter_credentials (voter_id, password_hash) VALUES (?, ?)",
        (req.voter_id, hash_password(req.password))
    )
    db.commit()
    return {"status": "registered", "voter_id": req.voter_id}

@router.post("/login")
def login(req: LoginRequest):
    db = get_db()
    voter = db.execute("SELECT * FROM voters WHERE voter_id = ?", (req.voter_id,)).fetchone()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found.")
    cred = db.execute("SELECT * FROM voter_credentials WHERE voter_id = ?", (req.voter_id,)).fetchone()
    if not cred:
        raise HTTPException(status_code=404, detail="No password set. Contact admin.")
    if cred["password_hash"] != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    return {
        "status": "authenticated",
        "voter_id": voter["voter_id"],
        "name": voter["name"],
        "eth_address": voter["eth_address"],
    }

# Keep old routes as stubs so frontend doesn't break during transition
@router.post("/register/begin")
def register_begin_stub(): raise HTTPException(status_code=410, detail="Use /auth/register instead")

@router.post("/register/complete")
def register_complete_stub(): raise HTTPException(status_code=410, detail="Use /auth/register instead")

@router.post("/authenticate/begin")
def auth_begin_stub(): raise HTTPException(status_code=410, detail="Use /auth/login instead")

@router.post("/authenticate/complete")
def auth_complete_stub(): raise HTTPException(status_code=410, detail="Use /auth/login instead")


class FaceRegisterRequest(BaseModel):
    voter_id: str
    descriptor: list  # 128-float array from face-api.js

class FaceAuthRequest(BaseModel):
    voter_id: str
    descriptor: list

import json as json_lib
import math

def euclidean_distance(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

@router.post("/face/register")
def face_register(req: FaceRegisterRequest):
    db = get_db()
    voter = db.execute("SELECT * FROM voters WHERE voter_id = ?", (req.voter_id,)).fetchone()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")
    db.execute(
        "INSERT OR REPLACE INTO face_descriptors (voter_id, descriptor) VALUES (?, ?)",
        (req.voter_id, json_lib.dumps(req.descriptor))
    )
    db.commit()
    return {"status": "face registered", "voter_id": req.voter_id}

@router.post("/face/authenticate")
def face_authenticate(req: FaceAuthRequest):
    db = get_db()
    row = db.execute("SELECT * FROM face_descriptors WHERE voter_id = ?", (req.voter_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No face registered for this voter")
    stored = json_lib.loads(row["descriptor"])
    distance = euclidean_distance(stored, req.descriptor)
    THRESHOLD = 0.5  # lower = stricter
    if distance > THRESHOLD:
        raise HTTPException(status_code=401, detail=f"Face not recognised (distance: {distance:.3f})")
    voter = db.execute("SELECT * FROM voters WHERE voter_id = ?", (req.voter_id,)).fetchone()
    return {
        "status": "authenticated",
        "voter_id": voter["voter_id"],
        "name": voter["name"],
        "eth_address": voter["eth_address"],
        "distance": distance
    }
