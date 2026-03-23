import sqlite3, json
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
ADMIN_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
admin = w3.eth.account.from_key(ADMIN_KEY)

with open('backend/deploy-info.json') as f:
    info = json.load(f)

contract = w3.eth.contract(address=info['address'], abi=info['abi'])
conn = sqlite3.connect('backend/blockvote.db')
conn.row_factory = sqlite3.Row
voters = conn.execute('SELECT voter_id, eth_address FROM voters WHERE eth_address IS NOT NULL').fetchall()

if not voters:
    print('No voters with wallets found.')
else:
    for v in voters:
        addr = v['eth_address']
        try:
            nonce = w3.eth.get_transaction_count(admin.address)
            tx = contract.functions.registerVoter(addr).build_transaction({
                'from': admin.address,
                'gas': 100000,
                'gasPrice': w3.eth.gas_price,
                'nonce': nonce,
                'chainId': 31337
            })
            signed = w3.eth.account.sign_transaction(tx, ADMIN_KEY)
            w3.eth.send_raw_transaction(signed.raw_transaction)
            print(f'Registered {v["voter_id"]} ({addr})')
        except Exception as e:
            print(f'Failed {v["voter_id"]}: {e}')

print('Done.')
