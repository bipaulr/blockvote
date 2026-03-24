# BlockVote

A blockchain-based voting application that ensures transparency, security, and immutability in the voting process. The system uses smart contracts on Ethereum to manage voter registration, vote casting, and result tallying.

## Project Overview

BlockVote leverages decentralized technology to create a trustless voting system. Voters register on-chain, cast their votes via a web interface, and results are stored permanently on the blockchain. The system includes mechanisms for voter refunds and re-registration cycles.

## Repository Structure

```
blockvote/
├── contracts/          # Solidity smart contracts
├── frontend/           # Web interface for voters and administrators
├── backend/            # Server-side API and business logic
├── scripts/            # Utility scripts for deployment and maintenance
├── artifacts/          # Hardhat build artifacts
├── cache/              # Hardhat compilation cache
├── hardhat.config.js   # Hardhat configuration file
├── package.json        # Node.js dependencies
├── deploy-info.json    # Contract deployment information
├── refund.py           # Python script for processing voter refunds
├── reregister.py       # Python script for voter re-registration
└── .gitignore          # Git ignore rules
```

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Hardhat
- MetaMask or another Web3 wallet
- Python 3 (for refund and registration scripts)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/bipaulr/blockvote.git
   cd blockvote
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. Compile smart contracts:
   ```
   npx hardhat compile
   ```

4. Deploy contracts to a local or test network:
   ```
   npx hardhat run scripts/deploy.js
   ```

5. Start the frontend application:
   ```
   cd frontend
   npm install
   npm start
   ```

## Usage

1. **Voter Registration**  
   Eligible voters register by connecting their wallet and following the registration process.

2. **Casting Votes**  
   Registered voters can cast their vote for a candidate or proposal. Each wallet address is limited to one vote.

3. **Results**  
   After the voting period ends, results can be viewed on the frontend. Results are stored on-chain and are publicly verifiable.

4. **Refunds**  
   Voters may be eligible for refunds of any deposits. Run the refund script:
   ```
   python refund.py
   ```

5. **Re-registration**  
   For recurring elections, run the re-registration script:
   ```
   python reregister.py
   ```

## Smart Contracts

The core logic resides in the `contracts/` directory. Key contracts likely include:
- `Voting.sol` – Main voting logic, including registration, vote casting, and tallying
- `VoterRegistry.sol` – Manages voter eligibility and registration records
- `ElectionFactory.sol` – Deploys new election instances if multiple elections are supported

## Configuration

- Update `hardhat.config.js` with network settings for your preferred Ethereum network.
- `deploy-info.json` contains deployed contract addresses and ABIs used by the frontend and backend.

## Scripts

- `refund.py` – Processes refunds for voters after an election concludes.
- `reregister.py` – Clears registration data or re-registers voters for a new election cycle.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Disclaimer

This software is provided for educational and demonstration purposes. It has not undergone formal security audits. Use in production environments at your own risk.
