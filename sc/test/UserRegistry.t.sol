// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {UserRegistry} from "../src/UserRegistry.sol";

contract UserRegistryTest is Test {
    UserRegistry registry;
    address admin = address(0x1);
    address producer = address(0x2);

    function setUp() public {
        registry = new UserRegistry(admin);
    }

    function test_AdminPreApproved() public view {
        UserRegistry.User memory user = registry.getUser(1);
        assertEq(user.wallet, admin);
        assertEq(uint8(user.role), uint8(UserRegistry.UserRole.Admin));
        assertEq(uint8(user.status), uint8(UserRegistry.UserStatus.Approved));
    }

    function test_RegisterPending() public {
        vm.prank(producer);
        registry.register(uint8(UserRegistry.UserRole.Producer));

        UserRegistry.User memory user = registry.getUserByWallet(producer);
        assertEq(user.wallet, producer);
        assertEq(uint8(user.status), uint8(UserRegistry.UserStatus.Pending));
        assertTrue(registry.isRegistered(producer));
    }

    function test_ApproveUser() public {
        vm.prank(producer);
        registry.register(uint8(UserRegistry.UserRole.Producer));

        vm.prank(admin);
        registry.approveUser(2);

        UserRegistry.User memory user = registry.getUser(2);
        assertEq(uint8(user.status), uint8(UserRegistry.UserStatus.Approved));
    }
}
