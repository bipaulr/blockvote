import sqlite3, json
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
FUNDER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
funder = w3.eth.account.from_key(FUNDER_KEY)

conn = sqlite3.connect('backend/blockvote.db')
conn.row_factory = sqlite3.Row
voters = conn.execute('SELECT voter_id, eth_address FROM voters WHERE eth_address IS NOT NULL').fetchall()

if not voters:
    print('No voters with wallets found.')
else:
    for v in voters:
        addr = v['eth_address']
        balance = w3.eth.get_balance(addr)
        if balance < w3.to_wei(0.05, 'ether'):
            nonce = w3.eth.get_transaction_count(funder.address)
            tx = {
                'from': funder.address,
                'to': addr,
                'value': w3.to_wei(0.1, 'ether'),
                'gas': 21000,
                'gasPrice': w3.eth.gas_price,
                'nonce': nonce,
                'chainId': 31337
            }
            signed = w3.eth.account.sign_transaction(tx, FUNDER_KEY)
            w3.eth.send_raw_transaction(signed.raw_transaction)
            print(f'Funded {v["voter_id"]} ({addr})')
        else:
            print(f'Already funded {v["voter_id"]} ({addr})')

print('Done.')
