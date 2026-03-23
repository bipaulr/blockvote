from fastapi import APIRouter, HTTPException
from web3 import Web3
import json, os

router = APIRouter()

DEPLOY_INFO_PATH = os.path.join(os.path.dirname(__file__), "../deploy-info.json")

def get_contract():
    if not os.path.exists(DEPLOY_INFO_PATH):
        raise HTTPException(status_code=503, detail="Contract not deployed yet")
    with open(DEPLOY_INFO_PATH) as f:
        info = json.load(f)
    w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
    contract = w3.eth.contract(address=info["address"], abi=info["abi"])
    return w3, contract, info

def classify_tx(tx, contract_address):
    """Classify a transaction by its function selector."""
    try:
        raw_input = tx.get('input', b'')
        # Convert bytes to hex string
        if isinstance(raw_input, bytes):
            data = '0x' + raw_input.hex()
        elif isinstance(raw_input, str):
            data = raw_input if raw_input.startswith('0x') else '0x' + raw_input
        else:
            return 'other'

        if not data or data == '0x' or len(data) < 10:
            return 'transfer'

        selector = data[:10].lower()

        SELECTORS = {
            '0x26541b56': 'add_candidate',
            '0xfb9b4cba': 'add_position',
            '0xf21357ad': 'cast_vote',
            '0x6c6c32d0': 'close_election',
            '0xc5d00f5d': 'open_election',
            '0x38db6dd3': 'register_voter',
        }

        if selector in SELECTORS:
            return SELECTORS[selector]

        # Check if it's a contract deployment
        to = tx.get('to')
        if not to or to == '0x0000000000000000000000000000000000000000':
            return 'deploy'

        return 'other'
    except Exception as e:
        print(f"classify_tx error: {e}")
        return 'other'

@router.get("/deploy-info")
def get_deploy_info():
    if not os.path.exists(DEPLOY_INFO_PATH):
        raise HTTPException(status_code=503, detail="Contract not deployed yet")
    with open(DEPLOY_INFO_PATH) as f:
        return json.load(f)

@router.get("/status")
def blockchain_status():
    w3, contract, info = get_contract()
    return {
        "connected": w3.is_connected(),
        "contract_address": info["address"],
        "election_name": contract.functions.electionName().call(),
        "is_open": contract.functions.isOpen().call(),
        "results_revealed": contract.functions.resultsRevealed().call(),
        "block_number": w3.eth.block_number,
    }

@router.get("/blocks")
def get_recent_blocks(count: int = 20):
    w3, contract, info = get_contract()
    latest = w3.eth.block_number
    blocks = []
    for i in range(max(0, latest - count + 1), latest + 1):
        block = w3.eth.get_block(i, full_transactions=True)
        # Classify each transaction in the block
        tx_types = []
        for tx in block.transactions:
            tx_dict = dict(tx)
            tx_types.append(classify_tx(tx_dict, info["address"]))

        # Primary type = most significant tx
        primary_type = 'empty'
        if tx_types:
            priority = ['cast_vote', 'open_election', 'close_election', 'register_voter', 'add_candidate', 'add_position', 'deploy', 'transfer', 'other']
            for p in priority:
                if p in tx_types:
                    primary_type = p
                    break

        blocks.append({
            "number": block.number,
            "hash": block.hash.hex(),
            "parentHash": block.parentHash.hex(),
            "timestamp": block.timestamp,
            "transactions": len(block.transactions),
            "miner": block.miner,
            "tx_types": tx_types,
            "primary_type": primary_type,
        })
    return blocks

@router.get("/positions")
def get_positions():
    _, contract, _ = get_contract()
    positions = contract.functions.getPositions().call()
    result = []
    for pos in positions:
        candidates = contract.functions.getCandidatesForPosition(pos).call()
        result.append({
            "position": pos,
            "candidates": [
                {"id": c[0], "name": c[1], "position": c[2], "voteCount": c[3]}
                for c in candidates
            ],
        })
    return result

@router.get("/results")
def get_results():
    _, contract, _ = get_contract()
    try:
        results = contract.functions.getResults().call()
        return [
            {"id": c[0], "name": c[1], "position": c[2], "voteCount": c[3]}
            for c in results
        ]
    except Exception as e:
        raise HTTPException(status_code=403, detail="Results not yet available")
