// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LogisticsTracking} from "../src/LogisticsTracking.sol";

contract LogisticsTrackingTest is Test {
    LogisticsTracking tracking;
    address admin     = address(0x1);
    address sender    = address(0x2);
    address carrier   = address(0x3);
    address hub       = address(0x4);
    address recipient = address(0x5);
    address inspector = address(0x6);

    function setUp() public {
        tracking = new LogisticsTracking(admin);
        vm.prank(sender);
        tracking.registerActor("Sender Co", LogisticsTracking.ActorRole.Sender, "Madrid");
        vm.prank(carrier);
        tracking.registerActor("Fast Carrier", LogisticsTracking.ActorRole.Carrier, "Valencia");
        vm.prank(hub);
        tracking.registerActor("Central Hub", LogisticsTracking.ActorRole.Hub, "Zaragoza");
        vm.prank(inspector);
        tracking.registerActor("QA Inspector", LogisticsTracking.ActorRole.Inspector, "Madrid");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    function _createShipment() internal returns (uint256 shipmentId) {
        vm.prank(sender);
        shipmentId = tracking.createShipment(recipient, "Widgets", "Madrid", "Barcelona", false);
    }

    function _createColdShipment() internal returns (uint256 shipmentId) {
        vm.prank(sender);
        shipmentId = tracking.createShipment(recipient, "Vaccines", "Madrid", "Barcelona", true);
    }

    // ── registerActor ────────────────────────────────────────────────────────

    function test_RegisterActor_StoredCorrectly() public view {
        LogisticsTracking.Actor memory a = tracking.getActor(sender);
        assertEq(a.actorAddress, sender);
        assertEq(a.name, "Sender Co");
        assertEq(uint8(a.role), uint8(LogisticsTracking.ActorRole.Sender));
        assertTrue(a.isActive);
    }

    function test_RegisterActor_EmitsEvent() public {
        address newActor = address(0x99);
        vm.prank(newActor);
        vm.expectEmit(true, false, false, true);
        emit LogisticsTracking.ActorRegistered(newActor, "New Co", LogisticsTracking.ActorRole.Carrier);
        tracking.registerActor("New Co", LogisticsTracking.ActorRole.Carrier, "Bilbao");
    }

    function test_RegisterActor_RevertNoneRole() public {
        address bad = address(0x99);
        vm.prank(bad);
        vm.expectRevert(LogisticsTracking.Unauthorized.selector);
        tracking.registerActor("Bad", LogisticsTracking.ActorRole.None, "Nowhere");
    }

    // ── deactivateActor ──────────────────────────────────────────────────────

    function test_DeactivateActor_SetInactive() public {
        vm.prank(admin);
        tracking.deactivateActor(carrier);
        assertFalse(tracking.getActor(carrier).isActive);
    }

    function test_DeactivateActor_RevertNotAdmin() public {
        vm.prank(sender);
        vm.expectRevert(LogisticsTracking.NotAdmin.selector);
        tracking.deactivateActor(carrier);
    }

    function test_DeactivateActor_RevertUnregistered() public {
        vm.prank(admin);
        vm.expectRevert(LogisticsTracking.ActorNotRegistered.selector);
        tracking.deactivateActor(address(0xDEAD));
    }

    function test_InactiveActor_CannotCreateShipment() public {
        vm.prank(admin);
        tracking.deactivateActor(sender);
        vm.prank(sender);
        vm.expectRevert(LogisticsTracking.ActorInactive.selector);
        tracking.createShipment(recipient, "X", "A", "B", false);
    }

    // ── createShipment ───────────────────────────────────────────────────────

    function test_CreateShipment() public {
        uint256 id = _createShipment();
        LogisticsTracking.Shipment memory s = tracking.getShipment(id);
        assertEq(s.sender, sender);
        assertEq(s.recipient, recipient);
        assertEq(s.product, "Widgets");
        assertEq(uint8(s.status), uint8(LogisticsTracking.ShipmentStatus.Created));
        assertGt(s.dateCreated, 0);
    }

    function test_CreateShipment_EmitsEvent() public {
        vm.prank(sender);
        vm.expectEmit(true, true, true, true);
        emit LogisticsTracking.ShipmentCreated(1, sender, recipient, "Widgets");
        tracking.createShipment(recipient, "Widgets", "Madrid", "Barcelona", false);
    }

    function test_CreateShipment_RevertNonSender() public {
        vm.prank(carrier);
        vm.expectRevert(LogisticsTracking.Unauthorized.selector);
        tracking.createShipment(recipient, "X", "A", "B", false);
    }

    function test_CreateShipment_RevertZeroRecipient() public {
        vm.prank(sender);
        vm.expectRevert(LogisticsTracking.InvalidRecipient.selector);
        tracking.createShipment(address(0), "X", "A", "B", false);
    }

    function test_CreateShipment_AddsToActorShipments() public {
        _createShipment();
        _createShipment();
        uint256[] memory ids = tracking.getActorShipments(sender);
        assertEq(ids.length, 2);
    }

    function test_GetShipment_RevertMissing() public {
        vm.expectRevert(LogisticsTracking.ShipmentNotFound.selector);
        tracking.getShipment(999);
    }

    // ── updateShipmentStatus ─────────────────────────────────────────────────

    function test_UpdateStatus_SenderToInTransit() public {
        uint256 id = _createShipment();
        vm.prank(sender);
        tracking.updateShipmentStatus(id, LogisticsTracking.ShipmentStatus.InTransit);
        assertEq(uint8(tracking.getShipment(id).status), uint8(LogisticsTracking.ShipmentStatus.InTransit));
    }

    function test_UpdateStatus_CarrierToOutForDelivery() public {
        uint256 id = _createShipment();
        vm.prank(sender);
        tracking.updateShipmentStatus(id, LogisticsTracking.ShipmentStatus.InTransit);
        vm.prank(carrier);
        tracking.updateShipmentStatus(id, LogisticsTracking.ShipmentStatus.OutForDelivery);
        assertEq(uint8(tracking.getShipment(id).status), uint8(LogisticsTracking.ShipmentStatus.OutForDelivery));
    }

    function test_UpdateStatus_HubToAtHub() public {
        uint256 id = _createShipment();
        vm.prank(hub);
        tracking.updateShipmentStatus(id, LogisticsTracking.ShipmentStatus.AtHub);
        assertEq(uint8(tracking.getShipment(id).status), uint8(LogisticsTracking.ShipmentStatus.AtHub));
    }

    function test_UpdateStatus_EmitsEvent() public {
        uint256 id = _createShipment();
        vm.prank(sender);
        vm.expectEmit(true, false, false, true);
        emit LogisticsTracking.ShipmentStatusChanged(id, LogisticsTracking.ShipmentStatus.InTransit);
        tracking.updateShipmentStatus(id, LogisticsTracking.ShipmentStatus.InTransit);
    }

    function test_UpdateStatus_RevertUnauthorizedRole() public {
        uint256 id = _createShipment();
        vm.prank(inspector);
        vm.expectRevert(LogisticsTracking.Unauthorized.selector);
        tracking.updateShipmentStatus(id, LogisticsTracking.ShipmentStatus.InTransit);
    }

    function test_UpdateStatus_RevertAfterDelivered() public {
        uint256 id = _createShipment();
        vm.prank(recipient);
        tracking.confirmDelivery(id);
        vm.prank(carrier);
        vm.expectRevert(LogisticsTracking.InvalidStatus.selector);
        tracking.updateShipmentStatus(id, LogisticsTracking.ShipmentStatus.InTransit);
    }

    // ── confirmDelivery ──────────────────────────────────────────────────────

    function test_ConfirmDelivery() public {
        uint256 id = _createShipment();
        vm.prank(recipient);
        tracking.confirmDelivery(id);

        LogisticsTracking.Shipment memory s = tracking.getShipment(id);
        assertEq(uint8(s.status), uint8(LogisticsTracking.ShipmentStatus.Delivered));
        assertGt(s.dateDelivered, 0);
    }

    function test_ConfirmDelivery_EmitsEvent() public {
        uint256 id = _createShipment();
        vm.prank(recipient);
        vm.expectEmit(true, true, false, false);
        emit LogisticsTracking.DeliveryConfirmed(id, recipient, block.timestamp);
        tracking.confirmDelivery(id);
    }

    function test_ConfirmDelivery_RevertWrongRecipient() public {
        uint256 id = _createShipment();
        vm.prank(carrier);
        vm.expectRevert(LogisticsTracking.Unauthorized.selector);
        tracking.confirmDelivery(id);
    }

    function test_ConfirmDelivery_RevertAlreadyDelivered() public {
        uint256 id = _createShipment();
        vm.prank(recipient);
        tracking.confirmDelivery(id);
        vm.prank(recipient);
        vm.expectRevert(LogisticsTracking.AlreadyDelivered.selector);
        tracking.confirmDelivery(id);
    }

    // ── cancelShipment ───────────────────────────────────────────────────────

    function test_CancelShipment() public {
        uint256 id = _createShipment();
        vm.prank(sender);
        tracking.cancelShipment(id);
        assertEq(uint8(tracking.getShipment(id).status), uint8(LogisticsTracking.ShipmentStatus.Cancelled));
    }

    function test_CancelShipment_RevertWrongSender() public {
        uint256 id = _createShipment();
        vm.prank(carrier);
        vm.expectRevert(LogisticsTracking.Unauthorized.selector);
        tracking.cancelShipment(id);
    }

    function test_CancelShipment_RevertAfterDelivery() public {
        uint256 id = _createShipment();
        vm.prank(recipient);
        tracking.confirmDelivery(id);
        vm.prank(sender);
        vm.expectRevert(LogisticsTracking.InvalidStatus.selector);
        tracking.cancelShipment(id);
    }

    // ── recordCheckpoint ─────────────────────────────────────────────────────

    function test_RecordCheckpoint_StoredCorrectly() public {
        uint256 id = _createShipment();
        vm.prank(carrier);
        uint256 cpId = tracking.recordCheckpoint(id, "Zaragoza", "transit", "On time", 0);

        LogisticsTracking.Checkpoint memory cp = tracking.getCheckpoint(cpId);
        assertEq(cp.shipmentId, id);
        assertEq(cp.actor, carrier);
        assertEq(cp.location, "Zaragoza");
        assertEq(cp.checkpointType, "transit");
        assertEq(cp.temperature, 0);
        assertGt(cp.timestamp, 0);
    }

    function test_RecordCheckpoint_EmitsEvent() public {
        uint256 id = _createShipment();
        vm.prank(carrier);
        vm.expectEmit(true, true, false, true);
        emit LogisticsTracking.CheckpointRecorded(1, id, "Zaragoza", carrier);
        tracking.recordCheckpoint(id, "Zaragoza", "transit", "", 0);
    }

    function test_RecordCheckpoint_RevertInactiveActor() public {
        uint256 id = _createShipment();
        vm.prank(admin);
        tracking.deactivateActor(carrier);
        vm.prank(carrier);
        vm.expectRevert(LogisticsTracking.ActorInactive.selector);
        tracking.recordCheckpoint(id, "X", "transit", "", 0);
    }

    function test_RecordCheckpoint_RevertMissingShipment() public {
        vm.prank(carrier);
        vm.expectRevert(LogisticsTracking.ShipmentNotFound.selector);
        tracking.recordCheckpoint(999, "X", "transit", "", 0);
    }

    function test_GetShipmentCheckpoints_ReturnsAll() public {
        uint256 id = _createShipment();
        vm.startPrank(carrier);
        tracking.recordCheckpoint(id, "A", "transit", "", 0);
        tracking.recordCheckpoint(id, "B", "transit", "", 0);
        vm.stopPrank();

        LogisticsTracking.Checkpoint[] memory cps = tracking.getShipmentCheckpoints(id);
        assertEq(cps.length, 2);
    }

    function test_GetCheckpoint_RevertMissing() public {
        vm.expectRevert(LogisticsTracking.CheckpointNotFound.selector);
        tracking.getCheckpoint(999);
    }

    // ── reportIncident ───────────────────────────────────────────────────────

    function test_ReportIncident_StoredCorrectly() public {
        uint256 id = _createShipment();
        vm.prank(inspector);
        uint256 incId = tracking.reportIncident(id, LogisticsTracking.IncidentType.Damage, "Box crushed");

        LogisticsTracking.Incident memory inc = tracking.getIncident(incId);
        assertEq(inc.shipmentId, id);
        assertEq(uint8(inc.incidentType), uint8(LogisticsTracking.IncidentType.Damage));
        assertEq(inc.reporter, inspector);
        assertFalse(inc.resolved);
    }

    function test_ReportIncident_EmitsEvent() public {
        uint256 id = _createShipment();
        vm.prank(inspector);
        vm.expectEmit(true, true, false, true);
        emit LogisticsTracking.IncidentReported(1, id, LogisticsTracking.IncidentType.Delay);
        tracking.reportIncident(id, LogisticsTracking.IncidentType.Delay, "Traffic");
    }

    function test_ReportIncident_RevertMissingShipment() public {
        vm.prank(inspector);
        vm.expectRevert(LogisticsTracking.ShipmentNotFound.selector);
        tracking.reportIncident(999, LogisticsTracking.IncidentType.Lost, "Missing");
    }

    function test_GetShipmentIncidents_ReturnsAll() public {
        uint256 id = _createShipment();
        vm.startPrank(inspector);
        tracking.reportIncident(id, LogisticsTracking.IncidentType.Delay, "Late");
        tracking.reportIncident(id, LogisticsTracking.IncidentType.Damage, "Wet");
        vm.stopPrank();

        LogisticsTracking.Incident[] memory incs = tracking.getShipmentIncidents(id);
        assertEq(incs.length, 2);
    }

    // ── resolveIncident ──────────────────────────────────────────────────────

    function test_ResolveIncident_ByAdmin() public {
        uint256 id = _createShipment();
        vm.prank(inspector);
        uint256 incId = tracking.reportIncident(id, LogisticsTracking.IncidentType.Delay, "Late");

        vm.prank(admin);
        tracking.resolveIncident(incId);
        assertTrue(tracking.getIncident(incId).resolved);
    }

    function test_ResolveIncident_ByReporter() public {
        uint256 id = _createShipment();
        vm.prank(inspector);
        uint256 incId = tracking.reportIncident(id, LogisticsTracking.IncidentType.Delay, "Late");

        vm.prank(inspector);
        tracking.resolveIncident(incId);
        assertTrue(tracking.getIncident(incId).resolved);
    }

    function test_ResolveIncident_EmitsEvent() public {
        uint256 id = _createShipment();
        vm.prank(inspector);
        uint256 incId = tracking.reportIncident(id, LogisticsTracking.IncidentType.Delay, "Late");

        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit LogisticsTracking.IncidentResolved(incId);
        tracking.resolveIncident(incId);
    }

    function test_ResolveIncident_RevertUnauthorized() public {
        uint256 id = _createShipment();
        vm.prank(inspector);
        uint256 incId = tracking.reportIncident(id, LogisticsTracking.IncidentType.Delay, "Late");

        vm.prank(carrier);
        vm.expectRevert(LogisticsTracking.Unauthorized.selector);
        tracking.resolveIncident(incId);
    }

    function test_ResolveIncident_RevertMissing() public {
        vm.prank(admin);
        vm.expectRevert(LogisticsTracking.IncidentNotFound.selector);
        tracking.resolveIncident(999);
    }

    // ── temperature compliance ───────────────────────────────────────────────

    function test_TempCompliance_NonColdChainAlwaysTrue() public {
        uint256 id = _createShipment();
        assertTrue(tracking.verifyTemperatureCompliance(id));
    }

    function test_TempCompliance_ColdChain_InRange() public {
        uint256 id = _createColdShipment();
        vm.prank(carrier);
        tracking.recordCheckpoint(id, "Hub", "transit", "", 50); // 5.0°C
        assertTrue(tracking.verifyTemperatureCompliance(id));
    }

    function test_TempCompliance_ColdChain_TooHot() public {
        uint256 id = _createColdShipment();
        vm.prank(carrier);
        tracking.recordCheckpoint(id, "Hub", "transit", "", 100); // 10.0°C — above max
        assertFalse(tracking.verifyTemperatureCompliance(id));
    }

    function test_TempCompliance_ColdChain_TooCold() public {
        uint256 id = _createColdShipment();
        vm.prank(carrier);
        tracking.recordCheckpoint(id, "Hub", "transit", "", 10); // 1.0°C — below min
        assertFalse(tracking.verifyTemperatureCompliance(id));
    }

    function test_TempCompliance_ColdChain_ZeroTempSkipped() public {
        // temperature == 0 means "not recorded" and should not trigger violation
        uint256 id = _createColdShipment();
        vm.prank(carrier);
        tracking.recordCheckpoint(id, "Hub", "transit", "", 0);
        assertTrue(tracking.verifyTemperatureCompliance(id));
    }
}
