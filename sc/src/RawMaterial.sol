// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RawMaterial
/// @notice Gestion de tokens de cadena de suministro con trazabilidad multi-parent y transferencias.
/// @dev Cada token representa un lote de producto. El campo `features` acepta JSON libre;
///      Factory y Retailer pueden inyectar `_parentIds` adicionales para tokens multi-origen.
///      Las transferencias son de dos pasos: el emisor crea la solicitud y el receptor acepta.
contract RawMaterial {
    /// @notice Estado posible de una solicitud de transferencia.
    enum TransferStatus { Pending, Accepted, Cancelled, Rejected }

    /// @notice Representa un lote/producto en la cadena de suministro.
    struct Token {
        uint256 id;
        address creator;    // Wallet que creo el token
        string name;
        uint256 supply;     // Cantidad total inicial
        uint256 balance;    // Cantidad disponible en poder del creador
        string features;    // JSON libre con atributos; puede incluir _parentIds para multi-parent
        uint256 parentId;   // ID del token padre principal (0 si no tiene)
        uint256 createdAt;  // Timestamp Unix de creacion
    }

    /// @notice Solicitud de transferencia de unidades de un token entre dos wallets.
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

    // Balance de unidades recibidas por titulares no-creadores (tokenId => holder => amount)
    mapping(uint256 => mapping(address => uint256)) private receivedBalance;
    // Evita entradas duplicadas en ownerTokenIds cuando se recibe el mismo token varias veces
    mapping(address => mapping(uint256 => bool)) private tokenInOwnerList;

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

    /// @notice Crea un nuevo token (lote de producto).
    /// @dev El balance inicial iguala al supply. Si se indica parentId, el token padre debe existir.
    ///      Para tokens multi-parent, incluir parents adicionales en `features` como JSON:
    ///      `{"_parentIds":["2","3"],"otherAttr":"value"}`.
    /// @param name Nombre descriptivo del producto.
    /// @param supply Cantidad inicial de unidades (debe ser mayor a 0).
    /// @param features JSON con atributos adicionales del token.
    /// @param parentId ID del token padre principal (0 si no tiene padre).
    /// @return ID del nuevo token creado.
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
        tokenInOwnerList[msg.sender][id] = true;
        emit TokenCreated(id, msg.sender, name, supply);
        return id;
    }

    /// @notice Inicia una solicitud de transferencia de unidades a otra wallet.
    /// @dev Las unidades se reservan inmediatamente del balance del emisor.
    ///      Si el receptor rechaza o el emisor cancela, el balance se devuelve.
    /// @param to Direccion receptora.
    /// @param tokenId ID del token a transferir.
    /// @param amount Cantidad de unidades a transferir.
    /// @return ID de la solicitud creada.
    function createTransferRequest(address to, uint256 tokenId, uint256 amount) external returns (uint256) {
        if (to == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        Token storage t = tokens[tokenId];
        if (t.id == 0) revert TokenNotFound();

        bool isCreator = t.creator == msg.sender;
        uint256 senderBal = isCreator ? t.balance : receivedBalance[tokenId][msg.sender];
        if (!isCreator && senderBal == 0) revert NotTokenOwner();
        if (senderBal < amount) revert InsufficientBalance();

        if (isCreator) {
            t.balance -= amount;
        } else {
            receivedBalance[tokenId][msg.sender] -= amount;
        }

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

    /// @notice El receptor acepta la transferencia y recibe las unidades.
    /// @param transferId ID de la solicitud de transferencia.
    function acceptTransfer(uint256 transferId) external {
        TransferRequest storage req = transferRequests[transferId];
        if (req.id == 0) revert TransferNotFound();
        if (req.to != msg.sender) revert NotTransferRecipient();
        if (req.status != TransferStatus.Pending) revert TransferNotPending();
        req.status = TransferStatus.Accepted;

        receivedBalance[req.tokenId][req.to] += req.amount;
        if (!tokenInOwnerList[req.to][req.tokenId]) {
            ownerTokenIds[req.to].push(req.tokenId);
            tokenInOwnerList[req.to][req.tokenId] = true;
        }
        emit TransferAccepted(transferId);
    }

    /// @notice El emisor cancela la transferencia antes de que sea aceptada.
    /// @dev Devuelve las unidades al balance del emisor.
    /// @param transferId ID de la solicitud de transferencia.
    function cancelTransfer(uint256 transferId) external {
        TransferRequest storage req = transferRequests[transferId];
        if (req.id == 0) revert TransferNotFound();
        if (req.from != msg.sender) revert NotTransferSender();
        if (req.status != TransferStatus.Pending) revert TransferNotPending();
        req.status = TransferStatus.Cancelled;

        Token storage t = tokens[req.tokenId];
        if (t.creator == req.from) {
            t.balance += req.amount;
        } else {
            receivedBalance[req.tokenId][req.from] += req.amount;
        }
        emit TransferCancelled(transferId);
    }

    /// @notice El receptor rechaza la transferencia.
    /// @dev Devuelve las unidades al balance del emisor.
    /// @param transferId ID de la solicitud de transferencia.
    function rejectTransfer(uint256 transferId) external {
        TransferRequest storage req = transferRequests[transferId];
        if (req.id == 0) revert TransferNotFound();
        if (req.to != msg.sender) revert NotTransferRecipient();
        if (req.status != TransferStatus.Pending) revert TransferNotPending();
        req.status = TransferStatus.Rejected;

        Token storage t = tokens[req.tokenId];
        if (t.creator == req.from) {
            t.balance += req.amount;
        } else {
            receivedBalance[req.tokenId][req.from] += req.amount;
        }
        emit TransferRejected(transferId);
    }

    /// @notice Devuelve todos los tokens asociados a una direccion (creados o recibidos).
    /// @param owner Direccion del titular.
    function getTokensByOwner(address owner) external view returns (Token[] memory) {
        uint256[] storage ids = ownerTokenIds[owner];
        Token[] memory result = new Token[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = tokens[ids[i]];
        return result;
    }

    /// @notice Devuelve los datos de un token por su ID.
    /// @param tokenId ID del token.
    function getToken(uint256 tokenId) external view returns (Token memory) {
        if (tokens[tokenId].id == 0) revert TokenNotFound();
        return tokens[tokenId];
    }

    /// @notice Devuelve todas las transferencias iniciadas por una direccion.
    /// @param sender Direccion del emisor.
    function getTransfersBySender(address sender) external view returns (TransferRequest[] memory) {
        uint256[] storage ids = senderTransferIds[sender];
        TransferRequest[] memory result = new TransferRequest[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = transferRequests[ids[i]];
        return result;
    }

    /// @notice Devuelve todas las transferencias recibidas por una direccion.
    /// @param recipient Direccion del receptor.
    function getTransfersByRecipient(address recipient) external view returns (TransferRequest[] memory) {
        uint256[] storage ids = recipientTransferIds[recipient];
        TransferRequest[] memory result = new TransferRequest[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) result[i] = transferRequests[ids[i]];
        return result;
    }

    /// @notice Devuelve el balance recibido de un token para un titular no-creador.
    /// @param tokenId ID del token.
    /// @param holder Direccion del titular.
    function getReceivedBalance(uint256 tokenId, address holder) external view returns (uint256) {
        return receivedBalance[tokenId][holder];
    }

    /// @notice Consulta batch de balances recibidos para multiples tokens y un mismo titular.
    /// @param tokenIds Array de IDs de tokens a consultar.
    /// @param holder Direccion del titular.
    /// @return Array de balances en el mismo orden que tokenIds.
    function getReceivedBalancesBatch(uint256[] calldata tokenIds, address holder) external view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            balances[i] = receivedBalance[tokenIds[i]][holder];
        }
        return balances;
    }
}
