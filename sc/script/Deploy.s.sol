// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {UserRegistry} from "../src/UserRegistry.sol";
import {LogisticsTracking} from "../src/LogisticsTracking.sol";
import {RawMaterial} from "../src/RawMaterial.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        address admin = msg.sender;

        UserRegistry registry = new UserRegistry(admin);
        LogisticsTracking tracking = new LogisticsTracking(admin);
        RawMaterial rawMaterial = new RawMaterial();

        vm.stopBroadcast();

        console.log("UserRegistry:", address(registry));
        console.log("LogisticsTracking:", address(tracking));
        console.log("RawMaterial:", address(rawMaterial));
    }
}
