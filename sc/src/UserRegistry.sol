// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title UserRegistry
/// @notice Registro de usuarios con roles y flujo de aprobacion por el administrador.
/// @dev El admin se registra automaticamente como aprobado en el constructor.
///      Cualquier otra wallet llama a `register` y queda en estado Pending hasta
///      que el admin invoque `approveUser` o `rejectUser`.
contract UserRegistry {
    /// @notice Roles posibles de un usuario en el sistema.
    enum UserRole {
        None,      // Sin rol (valor por defecto / desconocido)
        Admin,     // Administrador del sistema
        Producer,  // Productor de materia prima
        Factory,   // Fabrica que procesa materiales
        Retailer,  // Minorista que vende al consumidor
        Consumer   // Consumidor final
    }

    /// @notice Estados del ciclo de vida de un usuario.
    enum UserStatus {
        None,     // No registrado
        Pending,  // Registro enviado, pendiente de aprobacion
        Approved, // Acceso concedido
        Rejected  // Acceso denegado
    }

    /// @notice Datos de un usuario registrado.
    struct User {
        address wallet;
        UserRole role;
        UserStatus status;
        uint256 registeredAt; // Timestamp Unix del registro
        uint256 txCount;      // Numero de acciones registradas en el log
    }

    /// @notice Entrada del log de acciones de un usuario.
    struct Transaction {
        bytes32 txHash;    // Hash derivado del estado en el momento de la accion
        uint256 timestamp;
        string action;     // "register" | "approve" | "reject" | "set_pending" | ...
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

    /// @param _admin Direccion que actua como administrador del sistema.
    constructor(address _admin) {
        admin = _admin;
        _createUser(_admin, UserRole.Admin, UserStatus.Approved, "admin_initialized");
    }

    /// @notice Registra la wallet del llamante con el rol indicado.
    /// @dev El estado inicial siempre es Pending. No se puede registrar como Admin ni como None.
    /// @param _role Valor numerico del enum UserRole (2=Producer, 3=Factory, 4=Retailer, 5=Consumer).
    function register(uint8 _role) external {
        if (walletToUserId[msg.sender] != 0) revert AlreadyRegistered();

        UserRole role = UserRole(_role);
        if (role == UserRole.None || role == UserRole.Admin) revert InvalidRole();

        _createUser(msg.sender, role, UserStatus.Pending, "register");
    }

    /// @notice Aprueba un usuario, concediendole acceso al sistema.
    /// @param _userId ID interno del usuario a aprobar.
    function approveUser(uint256 _userId) external onlyAdmin {
        User storage user = users[_userId];
        if (user.wallet == address(0)) revert UserNotFound();
        user.status = UserStatus.Approved;
        _logTx(_userId, "approve");
        emit UserStatusChanged(_userId, UserStatus.Approved);
    }

    /// @notice Rechaza un usuario, denegando su acceso.
    /// @param _userId ID interno del usuario a rechazar.
    function rejectUser(uint256 _userId) external onlyAdmin {
        User storage user = users[_userId];
        if (user.wallet == address(0)) revert UserNotFound();
        user.status = UserStatus.Rejected;
        _logTx(_userId, "reject");
        emit UserStatusChanged(_userId, UserStatus.Rejected);
    }

    /// @notice Devuelve a Pending un usuario previamente aprobado o rechazado.
    /// @param _userId ID interno del usuario.
    function setPending(uint256 _userId) external onlyAdmin {
        User storage user = users[_userId];
        if (user.wallet == address(0)) revert UserNotFound();
        user.status = UserStatus.Pending;
        _logTx(_userId, "set_pending");
        emit UserStatusChanged(_userId, UserStatus.Pending);
    }

    /// @notice Devuelve los datos de un usuario buscando por su direccion wallet.
    /// @dev Devuelve una estructura con todos los campos a cero si la wallet no esta registrada.
    /// @param _wallet Direccion Ethereum del usuario.
    function getUserByWallet(address _wallet) external view returns (User memory) {
        uint256 userId = walletToUserId[_wallet];
        if (userId == 0) {
            return User(address(0), UserRole.None, UserStatus.None, 0, 0);
        }
        return users[userId];
    }

    /// @notice Devuelve los datos de un usuario por su ID interno.
    /// @param _userId ID interno del usuario.
    function getUser(uint256 _userId) external view returns (User memory) {
        return users[_userId];
    }

    /// @notice Devuelve todos los usuarios registrados (incluyendo al admin).
    /// @return Array de structs User ordenados por fecha de registro.
    function getAllUsers() external view returns (User[] memory) {
        uint256 count = nextUserId - 1;
        User[] memory result = new User[](count);
        for (uint256 i = 1; i < nextUserId; i++) {
            result[i - 1] = users[i];
        }
        return result;
    }

    /// @notice Conteo de usuarios agrupado por estado.
    /// @return total Total de usuarios registrados.
    /// @return pending Usuarios con estado Pending.
    /// @return approved Usuarios con estado Approved.
    /// @return rejected Usuarios con estado Rejected.
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

    /// @notice Devuelve el log de acciones de un usuario.
    /// @param _userId ID interno del usuario.
    function getUserTransactions(uint256 _userId) external view returns (Transaction[] memory) {
        return userTransactions[_userId];
    }

    /// @notice Indica si una wallet esta registrada en el sistema.
    /// @param _wallet Direccion Ethereum a verificar.
    function isRegistered(address _wallet) external view returns (bool) {
        return walletToUserId[_wallet] != 0;
    }

    // ── Internos ─────────────────────────────────────────────────────────────

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
