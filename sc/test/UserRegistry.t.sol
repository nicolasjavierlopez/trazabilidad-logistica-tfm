// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {UserRegistry} from "../src/UserRegistry.sol";

contract UserRegistryTest is Test {
    UserRegistry registry;
    address admin    = address(0x1);
    address producer = address(0x2);
    address factory  = address(0x3);
    address retailer = address(0x4);

    function setUp() public {
        registry = new UserRegistry(admin);
    }

    // ── constructor ──────────────────────────────────────────────────────────

    function test_AdminPreApproved() public view {
        UserRegistry.User memory user = registry.getUser(1);
        assertEq(user.wallet, admin);
        assertEq(uint8(user.role), uint8(UserRegistry.UserRole.Admin));
        assertEq(uint8(user.status), uint8(UserRegistry.UserStatus.Approved));
    }

    function test_AdminStoredInWalletMapping() public view {
        assertTrue(registry.isRegistered(admin));
    }

    function test_NextUserIdStartsAt2AfterAdmin() public view {
        assertEq(registry.nextUserId(), 2);
    }

    // ── register ─────────────────────────────────────────────────────────────

    function test_RegisterPending() public {
        vm.prank(producer);
        registry.register(uint8(UserRegistry.UserRole.Producer));

        UserRegistry.User memory user = registry.getUserByWallet(producer);
        assertEq(user.wallet, producer);
        assertEq(uint8(user.role), uint8(UserRegistry.UserRole.Producer));
        assertEq(uint8(user.status), uint8(UserRegistry.UserStatus.Pending));
        assertTrue(registry.isRegistered(producer));
    }

    function test_Register_EmitsEvent() public {
        vm.prank(producer);
        vm.expectEmit(true, true, false, true);
        emit UserRegistry.UserRegistered(2, producer, UserRegistry.UserRole.Producer, UserRegistry.UserStatus.Pending);
        registry.register(uint8(UserRegistry.UserRole.Producer));
    }

    function test_RegisterFactory() public {
        vm.prank(factory);
        registry.register(uint8(UserRegistry.UserRole.Factory));
        assertEq(uint8(registry.getUserByWallet(factory).role), uint8(UserRegistry.UserRole.Factory));
    }

    function test_RegisterRetailer() public {
        vm.prank(retailer);
        registry.register(uint8(UserRegistry.UserRole.Retailer));
        assertEq(uint8(registry.getUserByWallet(retailer).role), uint8(UserRegistry.UserRole.Retailer));
    }

    function test_Register_RevertAlreadyRegistered() public {
        vm.prank(producer);
        registry.register(uint8(UserRegistry.UserRole.Producer));
        vm.prank(producer);
        vm.expectRevert(UserRegistry.AlreadyRegistered.selector);
        registry.register(uint8(UserRegistry.UserRole.Producer));
    }

    function test_Register_RevertAsAdmin() public {
        vm.prank(producer);
        vm.expectRevert(UserRegistry.InvalidRole.selector);
        registry.register(uint8(UserRegistry.UserRole.Admin));
    }

    function test_Register_RevertAsNone() public {
        vm.prank(producer);
        vm.expectRevert(UserRegistry.InvalidRole.selector);
        registry.register(uint8(UserRegistry.UserRole.None));
    }

    function test_IsRegistered_FalseForUnknown() public view {
        assertFalse(registry.isRegistered(address(0xDEAD)));
    }

    // ── approveUser ──────────────────────────────────────────────────────────

    function _registerProducer() internal {
        vm.prank(producer);
        registry.register(uint8(UserRegistry.UserRole.Producer));
    }

    function test_ApproveUser() public {
        _registerProducer();
        vm.prank(admin);
        registry.approveUser(2);
        assertEq(uint8(registry.getUser(2).status), uint8(UserRegistry.UserStatus.Approved));
    }

    function test_ApproveUser_EmitsEvent() public {
        _registerProducer();
        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit UserRegistry.UserStatusChanged(2, UserRegistry.UserStatus.Approved);
        registry.approveUser(2);
    }

    function test_ApproveUser_RevertNotAdmin() public {
        _registerProducer();
        vm.prank(factory);
        vm.expectRevert(UserRegistry.NotAdmin.selector);
        registry.approveUser(2);
    }

    function test_ApproveUser_RevertUserNotFound() public {
        vm.prank(admin);
        vm.expectRevert(UserRegistry.UserNotFound.selector);
        registry.approveUser(999);
    }

    // ── rejectUser ───────────────────────────────────────────────────────────

    function test_RejectUser() public {
        _registerProducer();
        vm.prank(admin);
        registry.rejectUser(2);
        assertEq(uint8(registry.getUser(2).status), uint8(UserRegistry.UserStatus.Rejected));
    }

    function test_RejectUser_EmitsEvent() public {
        _registerProducer();
        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit UserRegistry.UserStatusChanged(2, UserRegistry.UserStatus.Rejected);
        registry.rejectUser(2);
    }

    function test_RejectUser_RevertNotAdmin() public {
        _registerProducer();
        vm.prank(producer);
        vm.expectRevert(UserRegistry.NotAdmin.selector);
        registry.rejectUser(2);
    }

    function test_RejectUser_RevertUserNotFound() public {
        vm.prank(admin);
        vm.expectRevert(UserRegistry.UserNotFound.selector);
        registry.rejectUser(999);
    }

    // ── setPending ───────────────────────────────────────────────────────────

    function test_SetPending_AfterApproval() public {
        _registerProducer();
        vm.prank(admin);
        registry.approveUser(2);
        vm.prank(admin);
        registry.setPending(2);
        assertEq(uint8(registry.getUser(2).status), uint8(UserRegistry.UserStatus.Pending));
    }

    function test_SetPending_RevertNotAdmin() public {
        _registerProducer();
        vm.prank(producer);
        vm.expectRevert(UserRegistry.NotAdmin.selector);
        registry.setPending(2);
    }

    // ── getAllUsers / getUserCount ────────────────────────────────────────────

    function test_GetAllUsers_IncludesAdmin() public view {
        UserRegistry.User[] memory all = registry.getAllUsers();
        assertEq(all.length, 1);
        assertEq(all[0].wallet, admin);
    }

    function test_GetAllUsers_AfterMultipleRegistrations() public {
        vm.prank(producer);
        registry.register(uint8(UserRegistry.UserRole.Producer));
        vm.prank(factory);
        registry.register(uint8(UserRegistry.UserRole.Factory));

        UserRegistry.User[] memory all = registry.getAllUsers();
        assertEq(all.length, 3);
    }

    function test_GetUserCount_Pending() public {
        vm.prank(producer);
        registry.register(uint8(UserRegistry.UserRole.Producer));
        vm.prank(factory);
        registry.register(uint8(UserRegistry.UserRole.Factory));

        (uint256 total, uint256 pending, uint256 approved, uint256 rejected) = registry.getUserCount();
        assertEq(total, 3);    // admin + 2
        assertEq(pending, 2);
        assertEq(approved, 1); // admin
        assertEq(rejected, 0);
    }

    function test_GetUserCount_AfterApproveAndReject() public {
        vm.prank(producer);
        registry.register(uint8(UserRegistry.UserRole.Producer));
        vm.prank(factory);
        registry.register(uint8(UserRegistry.UserRole.Factory));

        vm.startPrank(admin);
        registry.approveUser(2);
        registry.rejectUser(3);
        vm.stopPrank();

        (, uint256 pending, uint256 approved, uint256 rejected) = registry.getUserCount();
        assertEq(pending, 0);
        assertEq(approved, 2); // admin + producer
        assertEq(rejected, 1);
    }

    // ── transactions log ─────────────────────────────────────────────────────

    function test_GetUserTransactions_AdminHasInitialTx() public view {
        UserRegistry.Transaction[] memory txs = registry.getUserTransactions(1);
        assertEq(txs.length, 1);
        assertEq(keccak256(bytes(txs[0].action)), keccak256(bytes("admin_initialized")));
    }

    function test_GetUserTransactions_RegisterAddsEntry() public {
        _registerProducer();
        UserRegistry.Transaction[] memory txs = registry.getUserTransactions(2);
        assertEq(txs.length, 1);
        assertEq(keccak256(bytes(txs[0].action)), keccak256(bytes("register")));
    }

    function test_GetUserTransactions_ApproveAddsEntry() public {
        _registerProducer();
        vm.prank(admin);
        registry.approveUser(2);

        UserRegistry.Transaction[] memory txs = registry.getUserTransactions(2);
        assertEq(txs.length, 2);
        assertEq(keccak256(bytes(txs[1].action)), keccak256(bytes("approve")));
    }

    function test_TxCount_IncreasesWithEachAction() public {
        _registerProducer();
        vm.startPrank(admin);
        registry.approveUser(2);
        registry.setPending(2);
        registry.rejectUser(2);
        vm.stopPrank();

        assertEq(registry.getUser(2).txCount, 4); // register + approve + setPending + reject
    }

    // ── getUserByWallet edge cases ───────────────────────────────────────────

    function test_GetUserByWallet_ReturnsZeroForUnknown() public view {
        UserRegistry.User memory user = registry.getUserByWallet(address(0xDEAD));
        assertEq(user.wallet, address(0));
        assertEq(uint8(user.role), uint8(UserRegistry.UserRole.None));
        assertEq(uint8(user.status), uint8(UserRegistry.UserStatus.None));
    }

    // ── fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_Register_ValidRoles(uint8 role) public {
        // Valid roles: Producer=2, Factory=3, Retailer=4, Consumer=5
        vm.assume(role >= uint8(UserRegistry.UserRole.Producer) && role <= uint8(UserRegistry.UserRole.Consumer));
        address user = address(0xF1);
        vm.prank(user);
        registry.register(role);
        assertTrue(registry.isRegistered(user));
    }
}
