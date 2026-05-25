// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LogisticsTracking - Supply chain traceability with checkpoints and incidents
contract LogisticsTracking {
    enum ShipmentStatus {
        Created,
        InTransit,
        AtHub,
        OutForDelivery,
        Delivered,
        Returned,
        Cancelled
    }

    enum ActorRole {
        None,
        Sender,
        Carrier,
        Hub,
        Recipient,
        Inspector
    }

    enum IncidentType {
        Delay,
        Damage,
        Lost,
        TempViolation,
        Unauthorized
    }

    struct Shipment {
        uint256 id;
        address sender;
        address recipient;
        string product;
        string origin;
        string destination;
        uint256 dateCreated;
        uint256 dateDelivered;
        ShipmentStatus status;
        uint256[] checkpointIds;
        uint256[] incidentIds;
        bool requiresColdChain;
    }

    struct Checkpoint {
        uint256 id;
        uint256 shipmentId;
        address actor;
        string location;
        string checkpointType;
        uint256 timestamp;
        string notes;
        int256 temperature;
    }

    struct Incident {
        uint256 id;
        uint256 shipmentId;
        IncidentType incidentType;
        address reporter;
        string description;
        uint256 timestamp;
        bool resolved;
    }

    struct Actor {
        address actorAddress;
        string name;
        ActorRole role;
        string location;
        bool isActive;
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

    int256 public constant MIN_COLD_TEMP = 20; // 2.0°C * 10
    int256 public constant MAX_COLD_TEMP = 80; // 8.0°C * 10

    event ShipmentCreated(
        uint256 indexed shipmentId,
        address indexed sender,
        address indexed recipient,
        string product
    );
    event CheckpointRecorded(
        uint256 indexed checkpointId,
        uint256 indexed shipmentId,
        string location,
        address actor
    );
    event ShipmentStatusChanged(uint256 indexed shipmentId, ShipmentStatus newStatus);
    event IncidentReported(
        uint256 indexed incidentId,
        uint256 indexed shipmentId,
        IncidentType incidentType
    );
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

    constructor(address _admin) {
        admin = _admin;
    }

    // --- Actor management ---

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

    function getActor(address _actorAddress) public view returns (Actor memory) {
        return actors[_actorAddress];
    }

    function deactivateActor(address _actorAddress) public onlyAdmin {
        if (actors[_actorAddress].actorAddress == address(0)) revert ActorNotRegistered();
        actors[_actorAddress].isActive = false;
    }

    // --- Shipment management ---

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

    function getShipment(uint256 _shipmentId) public view returns (Shipment memory) {
        if (shipments[_shipmentId].id == 0) revert ShipmentNotFound();
        return shipments[_shipmentId];
    }

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

    function cancelShipment(uint256 _shipmentId) public {
        Shipment storage s = shipments[_shipmentId];
        if (s.id == 0) revert ShipmentNotFound();
        if (msg.sender != s.sender) revert Unauthorized();
        if (s.status == ShipmentStatus.Delivered) revert InvalidStatus();

        s.status = ShipmentStatus.Cancelled;
        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Cancelled);
    }

    // --- Checkpoints ---

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

    function getCheckpoint(uint256 _checkpointId) public view returns (Checkpoint memory) {
        if (checkpoints[_checkpointId].id == 0) revert CheckpointNotFound();
        return checkpoints[_checkpointId];
    }

    function getShipmentCheckpoints(uint256 _shipmentId) public view returns (Checkpoint[] memory) {
        uint256[] storage ids = shipmentCheckpointIds[_shipmentId];
        Checkpoint[] memory result = new Checkpoint[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = checkpoints[ids[i]];
        }
        return result;
    }

    // --- Incidents ---

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

    function resolveIncident(uint256 _incidentId) public {
        Incident storage inc = incidents[_incidentId];
        if (inc.id == 0) revert IncidentNotFound();
        if (msg.sender != admin && msg.sender != inc.reporter) revert Unauthorized();

        inc.resolved = true;
        emit IncidentResolved(_incidentId);
    }

    function getIncident(uint256 _incidentId) public view returns (Incident memory) {
        if (incidents[_incidentId].id == 0) revert IncidentNotFound();
        return incidents[_incidentId];
    }

    function getShipmentIncidents(uint256 _shipmentId) public view returns (Incident[] memory) {
        uint256[] storage ids = shipmentIncidentIds[_shipmentId];
        Incident[] memory result = new Incident[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = incidents[ids[i]];
        }
        return result;
    }

    // --- Helpers ---

    function getActorShipments(address _actor) public view returns (uint256[] memory) {
        return actorShipmentIds[_actor];
    }

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
