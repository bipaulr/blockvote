from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, admin, voter, blockchain
from backend.models.database import init_db

app = FastAPI(title="BlockVote API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_db()

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(voter.router, prefix="/voter", tags=["Voter"])
app.include_router(blockchain.router, prefix="/blockchain", tags=["Blockchain"])

@app.get("/")
def root():
    return {"status": "BlockVote API running"}
