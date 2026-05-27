// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RawMaterial} from "../src/RawMaterial.sol";

contract RawMaterialTest is Test {
    RawMaterial rm;
    address alice = address(0xA);
    address bob   = address(0xB);
    address carol = address(0xC);

    function setUp() public {
        rm = new RawMaterial();
    }

    // Public mapping returns a tuple — wrap it in a struct for convenience
    function _getTransfer(uint256 txId) internal view returns (RawMaterial.TransferRequest memory req) {
        (uint256 id, uint256 tokenId, address from, address to, uint256 amount, RawMaterial.TransferStatus status, uint256 createdAt) = rm.transferRequests(txId);
        req = RawMaterial.TransferRequest(id, tokenId, from, to, amount, status, createdAt);
    }

    // ── createToken ──────────────────────────────────────────────────────────

    function test_CreateToken_Basic() public {
        vm.prank(alice);
        uint256 id = rm.createToken("Cotton", 1000, '{"origin":"AR"}', 0);

        assertEq(id, 1);
        RawMaterial.Token memory t = rm.getToken(1);
        assertEq(t.name, "Cotton");
        assertEq(t.supply, 1000);
        assertEq(t.balance, 1000);
        assertEq(t.creator, alice);
        assertEq(t.parentId, 0);
    }

    function test_CreateToken_WithParent() public {
        vm.prank(alice);
        rm.createToken("Cotton", 1000, "", 0);

        vm.prank(bob);
        uint256 id = rm.createToken("Yarn", 500, "", 1);

        RawMaterial.Token memory t = rm.getToken(id);
        assertEq(t.parentId, 1);
    }

    function test_CreateToken_RevertOnZeroSupply() public {
        vm.prank(alice);
        vm.expectRevert(RawMaterial.InvalidAmount.selector);
        rm.createToken("Bad", 0, "", 0);
    }

    function test_CreateToken_RevertOnMissingParent() public {
        vm.prank(alice);
        vm.expectRevert(RawMaterial.TokenNotFound.selector);
        rm.createToken("Orphan", 100, "", 99);
    }

    function test_CreateToken_IncreasesNextId() public {
        vm.startPrank(alice);
        rm.createToken("A", 1, "", 0);
        rm.createToken("B", 2, "", 0);
        vm.stopPrank();

        assertEq(rm.nextTokenId(), 3);
    }

    function test_CreateToken_EmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit RawMaterial.TokenCreated(1, alice, "Cotton", 1000);
        rm.createToken("Cotton", 1000, "", 0);
    }

    function test_CreateToken_OwnerListUpdated() public {
        vm.prank(alice);
        rm.createToken("T1", 100, "", 0);
        vm.prank(alice);
        rm.createToken("T2", 200, "", 0);

        RawMaterial.Token[] memory tokens = rm.getTokensByOwner(alice);
        assertEq(tokens.length, 2);
        assertEq(tokens[0].name, "T1");
        assertEq(tokens[1].name, "T2");
    }

    function test_GetToken_RevertOnMissing() public {
        vm.expectRevert(RawMaterial.TokenNotFound.selector);
        rm.getToken(99);
    }

    // ── createTransferRequest ────────────────────────────────────────────────

    function _createAliceToken() internal returns (uint256) {
        vm.prank(alice);
        return rm.createToken("Cotton", 1000, "", 0);
    }

    function test_TransferRequest_CreatedSuccessfully() public {
        uint256 tokenId = _createAliceToken();

        vm.prank(alice);
        uint256 txId = rm.createTransferRequest(bob, tokenId, 300);

        RawMaterial.TransferRequest memory req = _getTransfer(txId);
        assertEq(req.from, alice);
        assertEq(req.to, bob);
        assertEq(req.amount, 300);
        assertEq(uint8(req.status), uint8(RawMaterial.TransferStatus.Pending));

        // Creator balance should be reduced immediately
        RawMaterial.Token memory t = rm.getToken(tokenId);
        assertEq(t.balance, 700);
    }

    function test_TransferRequest_RevertZeroAmount() public {
        uint256 tokenId = _createAliceToken();
        vm.prank(alice);
        vm.expectRevert(RawMaterial.InvalidAmount.selector);
        rm.createTransferRequest(bob, tokenId, 0);
    }

    function test_TransferRequest_RevertInsufficientBalance() public {
        uint256 tokenId = _createAliceToken();
        vm.prank(alice);
        vm.expectRevert(RawMaterial.InsufficientBalance.selector);
        rm.createTransferRequest(bob, tokenId, 9999);
    }

    function test_TransferRequest_RevertZeroAddress() public {
        uint256 tokenId = _createAliceToken();
        vm.prank(alice);
        vm.expectRevert(RawMaterial.InvalidRecipient.selector);
        rm.createTransferRequest(address(0), tokenId, 100);
    }

    function test_TransferRequest_RevertMissingToken() public {
        vm.prank(alice);
        vm.expectRevert(RawMaterial.TokenNotFound.selector);
        rm.createTransferRequest(bob, 999, 100);
    }

    function test_TransferRequest_NonOwnerReverts() public {
        uint256 tokenId = _createAliceToken();
        vm.prank(carol);
        vm.expectRevert(RawMaterial.NotTokenOwner.selector);
        rm.createTransferRequest(bob, tokenId, 50);
    }

    function test_TransferRequest_EmitsEvent() public {
        uint256 tokenId = _createAliceToken();
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit RawMaterial.TransferRequested(1, tokenId, alice, bob, 100);
        rm.createTransferRequest(bob, tokenId, 100);
    }

    // ── acceptTransfer ───────────────────────────────────────────────────────

    function _setupTransfer(uint256 amount) internal returns (uint256 tokenId, uint256 txId) {
        tokenId = _createAliceToken();
        vm.prank(alice);
        txId = rm.createTransferRequest(bob, tokenId, amount);
    }

    function test_AcceptTransfer_UpdatesReceivedBalance() public {
        (uint256 tokenId, uint256 txId) = _setupTransfer(400);

        vm.prank(bob);
        rm.acceptTransfer(txId);

        assertEq(rm.getReceivedBalance(tokenId, bob), 400);
        assertEq(uint8(_getTransfer(txId).status), uint8(RawMaterial.TransferStatus.Accepted));
    }

    function test_AcceptTransfer_AddsToOwnerList() public {
        (, uint256 txId) = _setupTransfer(100);
        vm.prank(bob);
        rm.acceptTransfer(txId);

        RawMaterial.Token[] memory bobTokens = rm.getTokensByOwner(bob);
        assertEq(bobTokens.length, 1);
    }

    function test_AcceptTransfer_NoDuplicateInOwnerList() public {
        uint256 tokenId = _createAliceToken();
        vm.prank(alice);
        uint256 tx1 = rm.createTransferRequest(bob, tokenId, 100);
        vm.prank(bob);
        rm.acceptTransfer(tx1);

        vm.prank(alice);
        uint256 tx2 = rm.createTransferRequest(bob, tokenId, 50);
        vm.prank(bob);
        rm.acceptTransfer(tx2);

        RawMaterial.Token[] memory bobTokens = rm.getTokensByOwner(bob);
        assertEq(bobTokens.length, 1); // still one entry
        assertEq(rm.getReceivedBalance(tokenId, bob), 150);
    }

    function test_AcceptTransfer_RevertWrongRecipient() public {
        (, uint256 txId) = _setupTransfer(100);
        vm.prank(carol);
        vm.expectRevert(RawMaterial.NotTransferRecipient.selector);
        rm.acceptTransfer(txId);
    }

    function test_AcceptTransfer_RevertNotPending() public {
        (, uint256 txId) = _setupTransfer(100);
        vm.prank(bob);
        rm.acceptTransfer(txId);
        vm.prank(bob);
        vm.expectRevert(RawMaterial.TransferNotPending.selector);
        rm.acceptTransfer(txId);
    }

    function test_AcceptTransfer_EmitsEvent() public {
        (, uint256 txId) = _setupTransfer(100);
        vm.prank(bob);
        vm.expectEmit(true, false, false, false);
        emit RawMaterial.TransferAccepted(txId);
        rm.acceptTransfer(txId);
    }

    // ── cancelTransfer ───────────────────────────────────────────────────────

    function test_CancelTransfer_RestoresCreatorBalance() public {
        uint256 tokenId = _createAliceToken();
        vm.prank(alice);
        uint256 txId = rm.createTransferRequest(bob, tokenId, 600);

        vm.prank(alice);
        rm.cancelTransfer(txId);

        RawMaterial.Token memory t = rm.getToken(tokenId);
        assertEq(t.balance, 1000); // fully restored
        assertEq(uint8(_getTransfer(txId).status), uint8(RawMaterial.TransferStatus.Cancelled));
    }

    function test_CancelTransfer_RestoresReceivedBalance() public {
        // Bob receives some tokens, then tries to transfer and cancel
        (uint256 tokenId, uint256 txId) = _setupTransfer(500);
        vm.prank(bob);
        rm.acceptTransfer(txId);

        vm.prank(bob);
        uint256 tx2 = rm.createTransferRequest(carol, tokenId, 200);
        vm.prank(bob);
        rm.cancelTransfer(tx2);

        assertEq(rm.getReceivedBalance(tokenId, bob), 500); // restored
    }

    function test_CancelTransfer_RevertWrongSender() public {
        (, uint256 txId) = _setupTransfer(100);
        vm.prank(carol);
        vm.expectRevert(RawMaterial.NotTransferSender.selector);
        rm.cancelTransfer(txId);
    }

    function test_CancelTransfer_RevertNotPending() public {
        (, uint256 txId) = _setupTransfer(100);
        vm.prank(bob);
        rm.acceptTransfer(txId);
        vm.prank(alice);
        vm.expectRevert(RawMaterial.TransferNotPending.selector);
        rm.cancelTransfer(txId);
    }

    // ── rejectTransfer ───────────────────────────────────────────────────────

    function test_RejectTransfer_RestoresBalance() public {
        uint256 tokenId = _createAliceToken();
        vm.prank(alice);
        uint256 txId = rm.createTransferRequest(bob, tokenId, 300);

        vm.prank(bob);
        rm.rejectTransfer(txId);

        RawMaterial.Token memory t = rm.getToken(tokenId);
        assertEq(t.balance, 1000);
        assertEq(uint8(_getTransfer(txId).status), uint8(RawMaterial.TransferStatus.Rejected));
    }

    function test_RejectTransfer_RevertWrongRecipient() public {
        (, uint256 txId) = _setupTransfer(100);
        vm.prank(carol);
        vm.expectRevert(RawMaterial.NotTransferRecipient.selector);
        rm.rejectTransfer(txId);
    }

    function test_RejectTransfer_RevertNotPending() public {
        (, uint256 txId) = _setupTransfer(100);
        vm.prank(bob);
        rm.rejectTransfer(txId);
        vm.prank(bob);
        vm.expectRevert(RawMaterial.TransferNotPending.selector);
        rm.rejectTransfer(txId);
    }

    function test_RejectTransfer_EmitsEvent() public {
        (, uint256 txId) = _setupTransfer(100);
        vm.prank(bob);
        vm.expectEmit(true, false, false, false);
        emit RawMaterial.TransferRejected(txId);
        rm.rejectTransfer(txId);
    }

    // ── query helpers ────────────────────────────────────────────────────────

    function test_GetTransfersBySender() public {
        uint256 tokenId = _createAliceToken();
        vm.startPrank(alice);
        rm.createTransferRequest(bob, tokenId, 100);
        rm.createTransferRequest(carol, tokenId, 50);
        vm.stopPrank();

        RawMaterial.TransferRequest[] memory reqs = rm.getTransfersBySender(alice);
        assertEq(reqs.length, 2);
    }

    function test_GetTransfersByRecipient() public {
        uint256 tokenId = _createAliceToken();
        vm.prank(alice);
        rm.createTransferRequest(bob, tokenId, 100);

        RawMaterial.TransferRequest[] memory reqs = rm.getTransfersByRecipient(bob);
        assertEq(reqs.length, 1);
        assertEq(reqs[0].to, bob);
    }

    function test_GetReceivedBalancesBatch() public {
        vm.startPrank(alice);
        uint256 t1 = rm.createToken("T1", 100, "", 0);
        uint256 t2 = rm.createToken("T2", 200, "", 0);
        rm.createTransferRequest(bob, t1, 40);
        rm.createTransferRequest(bob, t2, 80);
        vm.stopPrank();

        vm.prank(bob);
        rm.acceptTransfer(1);
        vm.prank(bob);
        rm.acceptTransfer(2);

        uint256[] memory ids = new uint256[](2);
        ids[0] = t1;
        ids[1] = t2;
        uint256[] memory balances = rm.getReceivedBalancesBatch(ids, bob);
        assertEq(balances[0], 40);
        assertEq(balances[1], 80);
    }

    function test_GetTokensByOwner_EmptyForUnknown() public view {
        RawMaterial.Token[] memory tokens = rm.getTokensByOwner(carol);
        assertEq(tokens.length, 0);
    }

    // ── fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_CreateToken_SupplyMatchesBalance(uint256 supply) public {
        vm.assume(supply > 0 && supply <= type(uint128).max);
        vm.prank(alice);
        uint256 id = rm.createToken("Fuzz", supply, "", 0);
        RawMaterial.Token memory t = rm.getToken(id);
        assertEq(t.supply, supply);
        assertEq(t.balance, supply);
    }

    function testFuzz_TransferAndCancel_BalanceRestored(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 1000);
        uint256 tokenId = _createAliceToken();
        vm.prank(alice);
        uint256 txId = rm.createTransferRequest(bob, tokenId, amount);
        vm.prank(alice);
        rm.cancelTransfer(txId);
        assertEq(rm.getToken(tokenId).balance, 1000);
    }
}
