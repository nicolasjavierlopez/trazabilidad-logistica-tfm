// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title UserRegistry - Role-based registration and admin approval for supply chain users
contract UserRegistry {
    enum UserRole {
        None,
        Admin,
        Producer,
        Factory,
        Retailer,
        Consumer
    }

    enum UserStatus {
        None,
        Pending,
        Approved,
        Rejected
    }

    struct User {
        address wallet;
        UserRole role;
        UserStatus status;
        uint256 registeredAt;
        uint256 txCount;
    }

    struct Transaction {
        bytes32 txHash;
        uint256 timestamp;
        string action;
    }

    address public admin;
    uint256 public nextUserId = 1;

    mapping(uint256 => User) private users;
    mapping(address => uint256) private walletToUserId;
    mapping(uint256 => Transaction[]) private userTransactions;

    event UserRegistered(uint256 indexed userId, address indexed wallet, UserRole role, UserStatus status);
    event UserStatusChanged(uint256 indexed userId, UserStatus status);

    error NotAdmin();
    error AlreadyRegistered();
    error UserNotFound();
    error InvalidRole();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address _admin) {
        admin = _admin;
        _createUser(_admin, UserRole.Admin, UserStatus.Approved, "admin_initialized");
    }

    function register(uint8 _role) external {
        if (walletToUserId[msg.sender] != 0) revert AlreadyRegistered();

        UserRole role = UserRole(_role);
        if (role == UserRole.None || role == UserRole.Admin) revert InvalidRole();

        _createUser(msg.sender, role, UserStatus.Pending, "register");
    }

    function approveUser(uint256 _userId) external onlyAdmin {
        User storage user = users[_userId];
        if (user.wallet == address(0)) revert UserNotFound();
        user.status = UserStatus.Approved;
        _logTx(_userId, "approve");
        emit UserStatusChanged(_userId, UserStatus.Approved);
    }

    function rejectUser(uint256 _userId) external onlyAdmin {
        User storage user = users[_userId];
        if (user.wallet == address(0)) revert UserNotFound();
        user.status = UserStatus.Rejected;
        _logTx(_userId, "reject");
        emit UserStatusChanged(_userId, UserStatus.Rejected);
    }

    function setPending(uint256 _userId) external onlyAdmin {
        User storage user = users[_userId];
        if (user.wallet == address(0)) revert UserNotFound();
        user.status = UserStatus.Pending;
        _logTx(_userId, "set_pending");
        emit UserStatusChanged(_userId, UserStatus.Pending);
    }

    function getUserByWallet(address _wallet) external view returns (User memory) {
        uint256 userId = walletToUserId[_wallet];
        if (userId == 0) {
            return User(address(0), UserRole.None, UserStatus.None, 0, 0);
        }
        return users[userId];
    }

    function getUser(uint256 _userId) external view returns (User memory) {
        return users[_userId];
    }

    function getAllUsers() external view returns (User[] memory) {
        uint256 count = nextUserId - 1;
        User[] memory result = new User[](count);
        for (uint256 i = 1; i < nextUserId; i++) {
            result[i - 1] = users[i];
        }
        return result;
    }

    function getUserCount()
        external
        view
        returns (uint256 total, uint256 pending, uint256 approved, uint256 rejected)
    {
        total = nextUserId - 1;
        for (uint256 i = 1; i < nextUserId; i++) {
            UserStatus status = users[i].status;
            if (status == UserStatus.Pending) pending++;
            else if (status == UserStatus.Approved) approved++;
            else if (status == UserStatus.Rejected) rejected++;
        }
    }

    function getUserTransactions(uint256 _userId) external view returns (Transaction[] memory) {
        return userTransactions[_userId];
    }

    function isRegistered(address _wallet) external view returns (bool) {
        return walletToUserId[_wallet] != 0;
    }

    function _createUser(address wallet, UserRole role, UserStatus status, string memory action) internal {
        uint256 userId = nextUserId++;
        users[userId] = User({
            wallet: wallet,
            role: role,
            status: status,
            registeredAt: block.timestamp,
            txCount: 0
        });
        walletToUserId[wallet] = userId;
        _logTx(userId, action);
        emit UserRegistered(userId, wallet, role, status);
    }

    function _logTx(uint256 userId, string memory action) internal {
        users[userId].txCount++;
        userTransactions[userId].push(
            Transaction({
                txHash: keccak256(abi.encodePacked(block.timestamp, userId, users[userId].txCount, action)),
                timestamp: block.timestamp,
                action: action
            })
        );
    }
}
