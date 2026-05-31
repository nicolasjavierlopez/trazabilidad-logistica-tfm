// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LogisticsTracking
/// @notice Trazabilidad de envios con checkpoints geograficos, incidentes y control de cadena de frio.
/// @dev Los actores deben registrarse mediante `registerActor` antes de operar.
///      Solo el rol Sender puede crear envios. La temperatura se almacena como entero
///      con un decimal implicito (ej. 50 = 5.0 degC). El rango valido de cadena de frio
///      es [MIN_COLD_TEMP, MAX_COLD_TEMP] (20-80, es decir 2.0-8.0 degC).
contract LogisticsTracking {
    /// @notice Estado del ciclo de vida de un envio.
    enum ShipmentStatus {
        Created,        // Creado, aun no en transito
        InTransit,      // En camino
        AtHub,          // Detenido en un hub intermedio
        OutForDelivery, // En reparto final
        Delivered,      // Entregado al destinatario
        Returned,       // Devuelto al emisor
        Cancelled       // Cancelado antes de la entrega
    }

    /// @notice Roles disponibles para los actores del sistema logistico.
    enum ActorRole {
        None,      // Sin rol (invalido)
        Sender,    // Remitente — puede crear envios
        Carrier,   // Transportista — puede actualizar estado a InTransit / OutForDelivery
        Hub,       // Centro de distribucion — puede actualizar estado a AtHub
        Recipient, // Destinatario — puede confirmar la entrega
        Inspector  // Inspector de calidad — puede registrar incidentes
    }

    /// @notice Tipos de incidente que pueden reportarse sobre un envio.
    enum IncidentType {
        Delay,        // Demora
        Damage,       // Dano fisico
        Lost,         // Paquete extraviado
        TempViolation,// Violacion de temperatura en cadena de frio
        Unauthorized  // Acceso o manipulacion no autorizada
    }

    /// @notice Datos de un envio.
    struct Shipment {
        uint256 id;
        address sender;
        address recipient;
        string product;
        string origin;
        string destination;
        uint256 dateCreated;
        uint256 dateDelivered;   // 0 si aun no entregado
        ShipmentStatus status;
        uint256[] checkpointIds; // IDs de checkpoints asociados
        uint256[] incidentIds;   // IDs de incidentes asociados
        bool requiresColdChain;  // Indica si requiere control de temperatura
    }

    /// @notice Punto de control geografico registrado durante el transito.
    struct Checkpoint {
        uint256 id;
        uint256 shipmentId;
        address actor;
        string location;
        string checkpointType; // Ej: "departure", "arrival", "transit"
        uint256 timestamp;
        string notes;
        int256 temperature;    // Temperatura con un decimal implicito (0 = no registrada)
    }

    /// @notice Incidente reportado sobre un envio.
    struct Incident {
        uint256 id;
        uint256 shipmentId;
        IncidentType incidentType;
        address reporter;
        string description;
        uint256 timestamp;
        bool resolved;
    }

    /// @notice Actor registrado en el sistema logistico.
    struct Actor {
        address actorAddress;
        string name;
        ActorRole role;
        string location;
        bool isActive; // El admin puede desactivar actores
    }

    address public admin;
    uint256 public nextShipmentId = 1;
    uint256 public nextCheckpointId = 1;
    uint256 public nextIncidentId = 1;

    mapping(uint256 => Shipment) public shipments;
    mapping(uint256 => Checkpoint) public checkpoints;
    mapping(uint256 => Incident) public incidents;
    mapping(address => Actor) public actors;

    mapping(address => uint256[]) private actorShipmentIds;
    mapping(uint256 => uint256[]) private shipmentCheckpointIds;
    mapping(uint256 => uint256[]) private shipmentIncidentIds;

    /// @notice Rango valido de temperatura para cadena de frio (valor * 10).
    /// MIN = 20 => 2.0 degC, MAX = 80 => 8.0 degC
    int256 public constant MIN_COLD_TEMP = 20;
    int256 public constant MAX_COLD_TEMP = 80;

    event ShipmentCreated(uint256 indexed shipmentId, address indexed sender, address indexed recipient, string product);
    event CheckpointRecorded(uint256 indexed checkpointId, uint256 indexed shipmentId, string location, address actor);
    event ShipmentStatusChanged(uint256 indexed shipmentId, ShipmentStatus newStatus);
    event IncidentReported(uint256 indexed incidentId, uint256 indexed shipmentId, IncidentType incidentType);
    event IncidentResolved(uint256 indexed incidentId);
    event DeliveryConfirmed(uint256 indexed shipmentId, address indexed recipient, uint256 timestamp);
    event ActorRegistered(address indexed actorAddress, string name, ActorRole role);

    error NotAdmin();
    error ActorNotRegistered();
    error ActorInactive();
    error ShipmentNotFound();
    error CheckpointNotFound();
    error IncidentNotFound();
    error Unauthorized();
    error InvalidStatus();
    error AlreadyDelivered();
    error InvalidRecipient();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyActiveActor() {
        if (!actors[msg.sender].isActive) revert ActorInactive();
        _;
    }

    /// @param _admin Direccion con privilegios de administrador.
    constructor(address _admin) {
        admin = _admin;
    }

    // ── Gestion de actores ────────────────────────────────────────────────────

    /// @notice Registra al llamante como actor del sistema logistico.
    /// @dev Cualquier wallet puede registrarse; el rol None es invalido.
    ///      Si ya existe un registro previo, se sobreescribe.
    /// @param _name Nombre descriptivo del actor o empresa.
    /// @param _role Rol del actor en la cadena logistica.
    /// @param _location Ubicacion principal del actor.
    function registerActor(string memory _name, ActorRole _role, string memory _location) public {
        if (_role == ActorRole.None) revert Unauthorized();
        actors[msg.sender] = Actor({
            actorAddress: msg.sender,
            name: _name,
            role: _role,
            location: _location,
            isActive: true
        });
        emit ActorRegistered(msg.sender, _name, _role);
    }

    /// @notice Devuelve los datos de un actor por su direccion.
    /// @param _actorAddress Direccion del actor a consultar.
    function getActor(address _actorAddress) public view returns (Actor memory) {
        return actors[_actorAddress];
    }

    /// @notice Desactiva un actor, impidiendole operar en el sistema.
    /// @param _actorAddress Direccion del actor a desactivar.
    function deactivateActor(address _actorAddress) public onlyAdmin {
        if (actors[_actorAddress].actorAddress == address(0)) revert ActorNotRegistered();
        actors[_actorAddress].isActive = false;
    }

    // ── Gestion de envios ─────────────────────────────────────────────────────

    /// @notice Crea un nuevo envio. Solo actores con rol Sender pueden hacerlo.
    /// @param _recipient Direccion del destinatario.
    /// @param _product Descripcion del producto enviado.
    /// @param _origin Lugar de origen del envio.
    /// @param _destination Lugar de destino del envio.
    /// @param _requiresColdChain Indica si el envio requiere control de temperatura.
    /// @return ID del envio creado.
    function createShipment(
        address _recipient,
        string memory _product,
        string memory _origin,
        string memory _destination,
        bool _requiresColdChain
    ) public onlyActiveActor returns (uint256) {
        if (actors[msg.sender].role != ActorRole.Sender) revert Unauthorized();
        if (_recipient == address(0)) revert InvalidRecipient();

        uint256 id = nextShipmentId++;
        shipments[id] = Shipment({
            id: id,
            sender: msg.sender,
            recipient: _recipient,
            product: _product,
            origin: _origin,
            destination: _destination,
            dateCreated: block.timestamp,
            dateDelivered: 0,
            status: ShipmentStatus.Created,
            checkpointIds: new uint256[](0),
            incidentIds: new uint256[](0),
            requiresColdChain: _requiresColdChain
        });

        actorShipmentIds[msg.sender].push(id);
        actorShipmentIds[_recipient].push(id);

        emit ShipmentCreated(id, msg.sender, _recipient, _product);
        return id;
    }

    /// @notice Devuelve los datos completos de un envio.
    /// @param _shipmentId ID del envio.
    function getShipment(uint256 _shipmentId) public view returns (Shipment memory) {
        if (shipments[_shipmentId].id == 0) revert ShipmentNotFound();
        return shipments[_shipmentId];
    }

    /// @notice Actualiza el estado de un envio segun el rol del llamante.
    /// @dev Reglas de transicion: Carrier -> InTransit / OutForDelivery;
    ///      Hub -> AtHub; Sender -> InTransit (solo desde Created).
    ///      No se puede cancelar mediante esta funcion; usar `cancelShipment`.
    /// @param _shipmentId ID del envio.
    /// @param _newStatus Nuevo estado a establecer.
    function updateShipmentStatus(uint256 _shipmentId, ShipmentStatus _newStatus) public {
        Shipment storage s = shipments[_shipmentId];
        if (s.id == 0) revert ShipmentNotFound();
        if (s.status == ShipmentStatus.Delivered || s.status == ShipmentStatus.Cancelled) {
            revert InvalidStatus();
        }

        ActorRole role = actors[msg.sender].role;
        if (!_canUpdateStatus(role, s.status, _newStatus)) revert Unauthorized();

        s.status = _newStatus;
        emit ShipmentStatusChanged(_shipmentId, _newStatus);
    }

    /// @notice El destinatario confirma la recepcion del envio.
    /// @param _shipmentId ID del envio.
    function confirmDelivery(uint256 _shipmentId) public {
        Shipment storage s = shipments[_shipmentId];
        if (s.id == 0) revert ShipmentNotFound();
        if (msg.sender != s.recipient) revert Unauthorized();
        if (s.status == ShipmentStatus.Delivered) revert AlreadyDelivered();

        s.status = ShipmentStatus.Delivered;
        s.dateDelivered = block.timestamp;
        emit DeliveryConfirmed(_shipmentId, msg.sender, block.timestamp);
        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Delivered);
    }

    /// @notice El remitente cancela el envio antes de que sea entregado.
    /// @param _shipmentId ID del envio.
    function cancelShipment(uint256 _shipmentId) public {
        Shipment storage s = shipments[_shipmentId];
        if (s.id == 0) revert ShipmentNotFound();
        if (msg.sender != s.sender) revert Unauthorized();
        if (s.status == ShipmentStatus.Delivered) revert InvalidStatus();

        s.status = ShipmentStatus.Cancelled;
        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Cancelled);
    }

    // ── Checkpoints ───────────────────────────────────────────────────────────

    /// @notice Registra un checkpoint geografico para un envio.
    /// @param _shipmentId ID del envio.
    /// @param _location Ubicacion donde se registra el checkpoint.
    /// @param _checkpointType Tipo de evento (ej: "departure", "arrival", "transit").
    /// @param _notes Notas adicionales sobre el checkpoint.
    /// @param _temperature Temperatura medida * 10 (0 si no aplica o no se midio).
    /// @return ID del checkpoint creado.
    function recordCheckpoint(
        uint256 _shipmentId,
        string memory _location,
        string memory _checkpointType,
        string memory _notes,
        int256 _temperature
    ) public onlyActiveActor returns (uint256) {
        if (shipments[_shipmentId].id == 0) revert ShipmentNotFound();

        uint256 id = nextCheckpointId++;
        checkpoints[id] = Checkpoint({
            id: id,
            shipmentId: _shipmentId,
            actor: msg.sender,
            location: _location,
            checkpointType: _checkpointType,
            timestamp: block.timestamp,
            notes: _notes,
            temperature: _temperature
        });

        shipments[_shipmentId].checkpointIds.push(id);
        shipmentCheckpointIds[_shipmentId].push(id);

        emit CheckpointRecorded(id, _shipmentId, _location, msg.sender);
        return id;
    }

    /// @notice Devuelve los datos de un checkpoint por su ID.
    /// @param _checkpointId ID del checkpoint.
    function getCheckpoint(uint256 _checkpointId) public view returns (Checkpoint memory) {
        if (checkpoints[_checkpointId].id == 0) revert CheckpointNotFound();
        return checkpoints[_checkpointId];
    }

    /// @notice Devuelve todos los checkpoints de un envio.
    /// @param _shipmentId ID del envio.
    function getShipmentCheckpoints(uint256 _shipmentId) public view returns (Checkpoint[] memory) {
        uint256[] storage ids = shipmentCheckpointIds[_shipmentId];
        Checkpoint[] memory result = new Checkpoint[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = checkpoints[ids[i]];
        }
        return result;
    }

    // ── Incidentes ────────────────────────────────────────────────────────────

    /// @notice Reporta un incidente sobre un envio.
    /// @dev Cualquier actor (activo o no) puede reportar un incidente.
    /// @param _shipmentId ID del envio afectado.
    /// @param _incidentType Tipo de incidente.
    /// @param _description Descripcion detallada del incidente.
    /// @return ID del incidente creado.
    function reportIncident(
        uint256 _shipmentId,
        IncidentType _incidentType,
        string memory _description
    ) public returns (uint256) {
        if (shipments[_shipmentId].id == 0) revert ShipmentNotFound();

        uint256 id = nextIncidentId++;
        incidents[id] = Incident({
            id: id,
            shipmentId: _shipmentId,
            incidentType: _incidentType,
            reporter: msg.sender,
            description: _description,
            timestamp: block.timestamp,
            resolved: false
        });

        shipments[_shipmentId].incidentIds.push(id);
        shipmentIncidentIds[_shipmentId].push(id);

        emit IncidentReported(id, _shipmentId, _incidentType);
        return id;
    }

    /// @notice Marca un incidente como resuelto.
    /// @dev Solo el admin o el reporter original pueden resolverlo.
    /// @param _incidentId ID del incidente.
    function resolveIncident(uint256 _incidentId) public {
        Incident storage inc = incidents[_incidentId];
        if (inc.id == 0) revert IncidentNotFound();
        if (msg.sender != admin && msg.sender != inc.reporter) revert Unauthorized();

        inc.resolved = true;
        emit IncidentResolved(_incidentId);
    }

    /// @notice Devuelve los datos de un incidente por su ID.
    /// @param _incidentId ID del incidente.
    function getIncident(uint256 _incidentId) public view returns (Incident memory) {
        if (incidents[_incidentId].id == 0) revert IncidentNotFound();
        return incidents[_incidentId];
    }

    /// @notice Devuelve todos los incidentes de un envio.
    /// @param _shipmentId ID del envio.
    function getShipmentIncidents(uint256 _shipmentId) public view returns (Incident[] memory) {
        uint256[] storage ids = shipmentIncidentIds[_shipmentId];
        Incident[] memory result = new Incident[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = incidents[ids[i]];
        }
        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// @notice Devuelve los IDs de envios asociados a un actor (como sender o recipient).
    /// @param _actor Direccion del actor.
    function getActorShipments(address _actor) public view returns (uint256[] memory) {
        return actorShipmentIds[_actor];
    }

    /// @notice Verifica que todos los checkpoints de temperatura del envio esten dentro del rango valido.
    /// @dev Solo aplica a envios con `requiresColdChain = true`.
    ///      Los checkpoints con temperatura == 0 se interpretan como "no registrada" y se omiten.
    /// @param _shipmentId ID del envio.
    /// @return true si todos los registros de temperatura son validos (o si no requiere cadena de frio).
    function verifyTemperatureCompliance(uint256 _shipmentId) public view returns (bool) {
        Shipment memory s = shipments[_shipmentId];
        if (!s.requiresColdChain) return true;

        uint256[] storage ids = shipmentCheckpointIds[_shipmentId];
        for (uint256 i = 0; i < ids.length; i++) {
            int256 temp = checkpoints[ids[i]].temperature;
            if (temp != 0 && (temp < MIN_COLD_TEMP || temp > MAX_COLD_TEMP)) {
                return false;
            }
        }
        return true;
    }

    // ── Internos ──────────────────────────────────────────────────────────────

    /// @dev Valida si un actor con `role` puede transicionar `current` -> `next`.
    ///      Cancelled nunca puede establecerse mediante `updateShipmentStatus`.
    function _canUpdateStatus(
        ActorRole role,
        ShipmentStatus current,
        ShipmentStatus next
    ) internal pure returns (bool) {
        if (next == ShipmentStatus.Cancelled) return false;
        if (role == ActorRole.Carrier) {
            return next == ShipmentStatus.InTransit || next == ShipmentStatus.OutForDelivery;
        }
        if (role == ActorRole.Hub) {
            return next == ShipmentStatus.AtHub;
        }
        if (role == ActorRole.Sender) {
            return current == ShipmentStatus.Created && next == ShipmentStatus.InTransit;
        }
        return false;
    }
}
