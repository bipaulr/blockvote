from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.models.database import get_db
from web3 import Web3
import json, os, subprocess, re

router = APIRouter()

DEPLOY_INFO_PATH = os.path.join(os.path.dirname(__file__), "../deploy-info.json")
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

FUNDER_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
ADMIN_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
FUND_AMOUNT_ETH = 0.1

def get_w3_and_contract():
    if not os.path.exists(DEPLOY_INFO_PATH):
        raise HTTPException(status_code=503, detail="Contract not deployed yet")
    with open(DEPLOY_INFO_PATH) as f:
        info = json.load(f)
    w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
    contract = w3.eth.contract(address=info["address"], abi=info["abi"])
    return w3, contract, info

class VoterCreate(BaseModel):
    voter_id: str
    name: str
    roll_number: str

class VoterFinalise(BaseModel):
    voter_id: str  # finalise wallet creation + on-chain registration

class ElectionCreate(BaseModel):
    election_name: str
    contract_address: str

class NewElectionRequest(BaseModel):
    election_name: str

@router.post("/voter")
def create_voter(voter: VoterCreate):
    """Step 1 — just save voter details to DB. No wallet yet."""
    db = get_db()
    if db.execute("SELECT 1 FROM voters WHERE voter_id = ?", (voter.voter_id,)).fetchone():
        raise HTTPException(status_code=400, detail="Voter ID already exists")
    if db.execute("SELECT 1 FROM voters WHERE roll_number = ?", (voter.roll_number,)).fetchone():
        raise HTTPException(status_code=400, detail="Roll number already registered")
    db.execute(
        "INSERT INTO voters (voter_id, name, roll_number) VALUES (?, ?, ?)",
        (voter.voter_id, voter.name, voter.roll_number),
    )
    db.commit()
    return {"status": "created", "voter_id": voter.voter_id}

@router.post("/voter/finalise")
def finalise_voter(req: VoterFinalise):
    """Step 2 — called after face + password are set. Assigns wallet from pool or generates new one."""
    db = get_db()
    voter = db.execute("SELECT * FROM voters WHERE voter_id = ?", (req.voter_id,)).fetchone()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")
    if voter["eth_address"]:
        raise HTTPException(status_code=400, detail="Voter already finalised")

    try:
        w3, contract, _ = get_w3_and_contract()

        # Check pool for an available wallet first
        pooled = db.execute(
            "SELECT * FROM wallet_pool WHERE in_use = 0 LIMIT 1"
        ).fetchone()

        if pooled:
            # Reuse pooled wallet
            voter_address = pooled["eth_address"]
            voter_private_key = pooled["eth_private_key"]
            db.execute("UPDATE wallet_pool SET in_use = 1 WHERE eth_address = ?", (voter_address,))
            print(f"Reusing pooled wallet: {voter_address}")
        else:
            # Generate new wallet
            new_account = w3.eth.account.create()
            voter_address = new_account.address
            voter_private_key = new_account.key.hex()

            # Fund from pool
            funder = w3.eth.account.from_key(FUNDER_PRIVATE_KEY)
            fund_tx = {
                'from': funder.address,
                'to': voter_address,
                'value': w3.to_wei(FUND_AMOUNT_ETH, 'ether'),
                'gas': 21000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(funder.address),
                'chainId': 31337,
            }
            signed_fund = w3.eth.account.sign_transaction(fund_tx, FUNDER_PRIVATE_KEY)
            w3.eth.send_raw_transaction(signed_fund.raw_transaction)

            # Add to pool as in_use
            db.execute(
                "INSERT INTO wallet_pool (eth_address, eth_private_key, in_use) VALUES (?, ?, 1)",
                (voter_address, voter_private_key)
            )
            print(f"Generated new wallet: {voter_address}")

        # Register on smart contract
        admin_account = w3.eth.account.from_key(ADMIN_PRIVATE_KEY)
        register_tx = contract.functions.registerVoter(voter_address).build_transaction({
            'from': admin_account.address,
            'gas': 100000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(admin_account.address),
            'chainId': 31337,
        })
        signed_register = w3.eth.account.sign_transaction(register_tx, ADMIN_PRIVATE_KEY)
        w3.eth.send_raw_transaction(signed_register.raw_transaction)

        # Save wallet to voter
        db.execute(
            "UPDATE voters SET eth_address = ?, eth_private_key = ? WHERE voter_id = ?",
            (voter_address, voter_private_key, req.voter_id)
        )
        db.commit()

        return {"status": "finalised", "voter_id": req.voter_id, "eth_address": voter_address}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Finalise failed: {str(e)}")


@router.delete("/voter/{voter_id}")
def delete_voter(voter_id: str):
    """Delete voter and return their wallet to the pool."""
    db = get_db()
    voter = db.execute("SELECT * FROM voters WHERE voter_id = ?", (voter_id,)).fetchone()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")

    # Return wallet to pool if they had one
    if voter["eth_address"] and voter["eth_private_key"]:
        existing = db.execute(
            "SELECT * FROM wallet_pool WHERE eth_address = ?", (voter["eth_address"],)
        ).fetchone()
        if existing:
            db.execute("UPDATE wallet_pool SET in_use = 0 WHERE eth_address = ?", (voter["eth_address"],))
        else:
            db.execute(
                "INSERT INTO wallet_pool (eth_address, eth_private_key, in_use) VALUES (?, ?, 0)",
                (voter["eth_address"], voter["eth_private_key"])
            )

    db.execute("DELETE FROM voters WHERE voter_id = ?", (voter_id,))
    db.execute("DELETE FROM voter_credentials WHERE voter_id = ?", (voter_id,))
    db.execute("DELETE FROM face_descriptors WHERE voter_id = ?", (voter_id,))
    db.commit()

    return {"status": "deleted", "voter_id": voter_id, "wallet_returned": bool(voter["eth_address"])}

@router.get("/voters")
def list_voters():
    db = get_db()
    voters = db.execute(
        "SELECT voter_id, name, roll_number, eth_address, created_at FROM voters"
    ).fetchall()
    return [dict(v) for v in voters]

@router.post("/election")
def set_election(election: ElectionCreate):
    db = get_db()
    db.execute(
        "INSERT INTO election_config (election_name, contract_address, status) VALUES (?, ?, 'active')",
        (election.election_name, election.contract_address),
    )
    db.commit()
    return {"status": "election configured"}

@router.get("/election")
def get_election():
    db = get_db()
    election = db.execute(
        "SELECT * FROM election_config ORDER BY created_at DESC LIMIT 1"
    ).fetchone()
    if not election:
        raise HTTPException(status_code=404, detail="No election configured")
    return dict(election)

@router.post("/new-election")
def new_election(req: NewElectionRequest):
    try:
        deploy_script = os.path.join(BASE_DIR, "scripts", "deploy.js")
        with open(deploy_script, "r") as f:
            content = f.read()
        updated = re.sub(
            r'Election\.deploy\(".*?"\)',
            f'Election.deploy("{req.election_name}")',
            content
        )
        with open(deploy_script, "w") as f:
            f.write(updated)

        result = subprocess.run(
            ["npx", "hardhat", "run", "scripts/deploy.js", "--network", "localhost"],
            cwd=BASE_DIR,
            capture_output=True, text=True, timeout=60,
            shell=True
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=result.stderr or "Deploy failed")

        with open(DEPLOY_INFO_PATH) as f:
            info = json.load(f)

        db = get_db()
        db.execute(
            "INSERT INTO election_config (election_name, contract_address, status) VALUES (?, ?, 'active')",
            (req.election_name, info["address"])
        )
        db.commit()

        return {"status": "deployed", "election_name": req.election_name, "contract_address": info["address"]}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Deploy timed out. Is Hardhat node running?")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
