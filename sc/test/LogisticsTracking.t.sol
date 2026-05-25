// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LogisticsTracking} from "../src/LogisticsTracking.sol";

contract LogisticsTrackingTest is Test {
    LogisticsTracking tracking;
    address admin = address(0x1);
    address sender = address(0x2);
    address recipient = address(0x3);

    function setUp() public {
        tracking = new LogisticsTracking(admin);
        vm.prank(sender);
        tracking.registerActor("Sender Co", LogisticsTracking.ActorRole.Sender, "Madrid");
    }

    function test_CreateShipment() public {
        vm.prank(sender);
        uint256 shipmentId = tracking.createShipment(recipient, "Widgets", "Madrid", "Barcelona", false);

        LogisticsTracking.Shipment memory shipment = tracking.getShipment(shipmentId);
        assertEq(shipment.sender, sender);
        assertEq(shipment.recipient, recipient);
        assertEq(uint8(shipment.status), uint8(LogisticsTracking.ShipmentStatus.Created));
    }

    function test_ConfirmDelivery() public {
        vm.prank(sender);
        uint256 shipmentId = tracking.createShipment(recipient, "Widgets", "Madrid", "Barcelona", false);

        vm.prank(recipient);
        tracking.confirmDelivery(shipmentId);

        LogisticsTracking.Shipment memory shipment = tracking.getShipment(shipmentId);
        assertEq(uint8(shipment.status), uint8(LogisticsTracking.ShipmentStatus.Delivered));
        assertGt(shipment.dateDelivered, 0);
    }
}
