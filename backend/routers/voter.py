from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.models.database import get_db
from web3 import Web3
import json, os

router = APIRouter()

DEPLOY_INFO_PATH = os.path.join(os.path.dirname(__file__), "../deploy-info.json")

class CastVoteRequest(BaseModel):
    voter_id: str
    positions: list
    candidate_ids: list

@router.get("/{voter_id}")
def get_voter(voter_id: str):
    db = get_db()
    voter = db.execute(
        "SELECT voter_id, name, roll_number, eth_address FROM voters WHERE voter_id = ?",
        (voter_id,)
    ).fetchone()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")
    return dict(voter)

@router.post("/cast-vote")
def cast_vote(req: CastVoteRequest):
    db = get_db()

    # Get voter's private key
    voter = db.execute(
        "SELECT * FROM voters WHERE voter_id = ?", (req.voter_id,)
    ).fetchone()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")
    if not voter["eth_private_key"]:
        raise HTTPException(status_code=400, detail="No wallet assigned to this voter")

    try:
        with open(DEPLOY_INFO_PATH) as f:
            info = json.load(f)

        w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
        contract = w3.eth.contract(address=info["address"], abi=info["abi"])

        # Check if already voted
        has_voted = contract.functions.hasVoted(voter["eth_address"]).call()
        if has_voted:
            raise HTTPException(status_code=400, detail="You have already voted in this election")

        # Sign and send vote transaction using voter's private key
        voter_account = w3.eth.account.from_key(voter["eth_private_key"])
        tx = contract.functions.castVote(
            req.positions,
            [int(c) for c in req.candidate_ids]
        ).build_transaction({
            'from': voter_account.address,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(voter_account.address),
            'chainId': 31337,
        })
        signed = w3.eth.account.sign_transaction(tx, voter["eth_private_key"])
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        return {
            "status": "voted",
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "Already voted" in error_msg:
            raise HTTPException(status_code=400, detail="You have already voted in this election")
        raise HTTPException(status_code=500, detail=f"Vote failed: {error_msg}")
