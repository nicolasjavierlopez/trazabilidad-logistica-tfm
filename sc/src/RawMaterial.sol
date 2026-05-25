// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RawMaterial {
    enum TransferStatus { Pending, Accepted, Cancelled, Rejected }

    struct Token {
        uint256 id;
        address creator;
        string name;
        uint256 supply;
        uint256 balance;
        string features;
        uint256 parentId;
        uint256 createdAt;
    }

    struct TransferRequest {
        uint256 id;
        uint256 tokenId;
        address from;
        address to;
        uint256 amount;
        TransferStatus status;
        uint256 createdAt;
    }

    uint256 public nextTokenId = 1;
    uint256 public nextTransferId = 1;

    mapping(uint256 => Token) public tokens;
    mapping(uint256 => TransferRequest) public transferRequests;
    mapping(address => uint256[]) private ownerTokenIds;
    mapping(address => uint256[]) private senderTransferIds;
    mapping(address => uint256[]) private recipientTransferIds;

    event TokenCreated(uint256 indexed tokenId, address indexed creator, string name, uint256 supply);
    event TransferRequested(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address to, uint256 amount);
    event TransferAccepted(uint256 indexed transferId);
    event TransferCancelled(uint256 indexed transferId);
    event TransferRejected(uint256 indexed transferId);

    error TokenNotFound();
    error TransferNotFound();
    error InsufficientBalance();
    error NotTokenOwner();
    error NotTransferSender();
    error NotTransferRecipient();
    error InvalidAmount();
    error InvalidRecipient();
    error TransferNotPending();

    function createToken(string memory name, uint256 supply, string memory features, uint256 parentId) external returns (uint256) {
        if (supply == 0) revert InvalidAmount();
        if (parentId > 0 && tokens[parentId].id == 0) revert TokenNotFound();
        uint256 id = nextTokenId++;
        tokens[id] = Token({
            id: id,
            creator: msg.sender,
            name: name,
            supply: supply,
            balance: supply,
            features: features,
            parentId: parentId,
            createdAt: block.timestamp
        });
        ownerTokenIds[msg.sender].push(id);
        emit TokenCreated(id, msg.sender, name, supply);
        return id;
    }

    function createTransferRequest(address to, uint256 tokenId, uint256 amount) external returns (uint256) {
        if (to == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        Token storage t = tokens[tokenId];
        if (t.id == 0) revert TokenNotFound();
        if (t.creator != msg.sender) revert NotTokenOwner();
        if (t.balance < amount) revert InsufficientBalance();
        t.balance -= amount;
        uint256 id = nextTransferId++;
        transferRequests[id] = TransferRequest({
            id: id,
            tokenId: tokenId,
            from: msg.sender,
            to: to,
            amount: amount,
            status: TransferStatus.Pending,
            createdAt: block.timestamp
        });
        senderTransferIds[msg.sender].push(id);
        recipientTransferIds[to].push(id);
        emit TransferRequested(id, tokenId, msg.sender, to, amount);
        return id;
    }

    function acceptTransfer(uint256 transferId) external {
        TransferRequest storage req = transferRequests[transferId];
        if (req.id == 0) revert TransferNotFound();
        if (req.to != msg.sender) revert NotTransferRecipient();
        if (req.status != TransferStatus.Pending) revert TransferNotPending();
        req.status = TransferStatus.Accepted;
        emit TransferAccepted(transferId);
    }

    function cancelTransfer(uint256 transferId) external {
        TransferRequest storage req = transferRequests[transferId];
        if (req.id == 0) revert TransferNotFound();
        if (req.from != msg.sender) revert NotTransferSender();
        if (req.status != TransferStatus.Pending) revert TransferNotPending();
        req.status = TransferStatus.Cancelled;
        tokens[req.tokenId].balance += req.amount;
        emit TransferCancelled(transferId);
    }

    function rejectTransfer(uint256 transferId) external {
        TransferRequest storage req = transferRequests[transferId];
        if (req.id == 0) revert TransferNotFound();
        if (req.to != msg.sender) revert NotTransferRecipient();
        if (req.status != TransferStatus.Pending) revert TransferNotPending();
        req.status = TransferStatus.Rejected;
        tokens[req.tokenId].balance += req.amount;
        emit TransferRejected(transferId);
    }

    function getTokensByOwner(address owner) external view returns (Token[] memory) {
        uint256[] storage ids = ownerTokenIds[owner];
        Token[] memory result = new Token[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = tokens[ids[i]];
        return result;
    }

    function getToken(uint256 tokenId) external view returns (Token memory) {
        if (tokens[tokenId].id == 0) revert TokenNotFound();
        return tokens[tokenId];
    }

    function getTransfersBySender(address sender) external view returns (TransferRequest[] memory) {
        uint256[] storage ids = senderTransferIds[sender];
        TransferRequest[] memory result = new TransferRequest[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = transferRequests[ids[i]];
        return result;
    }

    function getTransfersByRecipient(address recipient) external view returns (TransferRequest[] memory) {
        uint256[] storage ids = recipientTransferIds[recipient];
        TransferRequest[] memory result = new TransferRequest[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = transferRequests[ids[i]];
        return result;
    }
}
