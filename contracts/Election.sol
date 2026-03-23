// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Election {
    struct Candidate {
        uint256 id;
        string name;
        string position;
        uint256 voteCount;
    }

    struct Position {
        string name;
        uint256[] candidateIds;
    }

    address public admin;
    string public electionName;
    bool public isOpen;
    bool public resultsRevealed;

    uint256 private candidateCount;
    mapping(uint256 => Candidate) public candidates;
    mapping(string => uint256[]) public positionCandidates; // position => candidate ids
    string[] public positions;

    mapping(address => bool) public hasVoted;
    mapping(address => bool) public registeredVoters;

    event VoteCast(address indexed voter, string position, uint256 candidateId, uint256 blockNumber);
    event ElectionCreated(string name, uint256 timestamp);
    event ElectionClosed(uint256 timestamp);
    event VoterRegistered(address voter);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier electionOpen() {
        require(isOpen, "Election is not open");
        _;
    }

    constructor(string memory _name) {
        admin = msg.sender;
        electionName = _name;
        isOpen = false;
        resultsRevealed = false;
        emit ElectionCreated(_name, block.timestamp);
    }

    function addPosition(string memory _position) external onlyAdmin {
        positions.push(_position);
    }

    function addCandidate(string memory _name, string memory _position) external onlyAdmin {
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, _position, 0);
        positionCandidates[_position].push(candidateCount);
    }

    function registerVoter(address _voter) external onlyAdmin {
        registeredVoters[_voter] = true;
        emit VoterRegistered(_voter);
    }

    function openElection() external onlyAdmin {
        isOpen = true;
    }

    function closeElection() external onlyAdmin {
        isOpen = false;
        resultsRevealed = true;
        emit ElectionClosed(block.timestamp);
    }

    function castVote(string[] memory _positions, uint256[] memory _candidateIds) external electionOpen {
        require(registeredVoters[msg.sender], "Not a registered voter");
        require(!hasVoted[msg.sender], "Already voted");
        require(_positions.length == _candidateIds.length, "Mismatch");

        for (uint i = 0; i < _positions.length; i++) {
            // 0 = NOTA
            if (_candidateIds[i] != 0) {
                candidates[_candidateIds[i]].voteCount++;
            }
            emit VoteCast(msg.sender, _positions[i], _candidateIds[i], block.number);
        }
        hasVoted[msg.sender] = true;
    }

    function getPositions() external view returns (string[] memory) {
        return positions;
    }

    function getCandidatesForPosition(string memory _position) external view returns (Candidate[] memory) {
        uint256[] memory ids = positionCandidates[_position];
        Candidate[] memory result = new Candidate[](ids.length);
        for (uint i = 0; i < ids.length; i++) {
            result[i] = candidates[ids[i]];
        }
        return result;
    }

    function getResults() external view returns (Candidate[] memory) {
        require(resultsRevealed, "Results not yet available");
        Candidate[] memory allCandidates = new Candidate[](candidateCount);
        for (uint i = 1; i <= candidateCount; i++) {
            allCandidates[i - 1] = candidates[i];
        }
        return allCandidates;
    }
}
