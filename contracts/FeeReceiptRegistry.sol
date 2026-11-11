// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Arc Fee Radar — Fee Receipt Registry
/// @notice Permanently publishes user-submitted crosschain fee comparisons on Arc Testnet.
/// @dev Receipts are self-reported, not verified quotes or proof of a transfer. USDC amounts
///      and fees use six-decimal base units (1 USDC = 1_000_000 units). There are no privileged
///      accounts, external calls, token transfers, or payable entry points. Native-value calls
///      and unknown selectors revert; the EVM can nevertheless force native funds here.
contract FeeReceiptRegistry {
    /// @notice A permanent, immutable fee comparison submitted by its author.
    /// @dev Service values: 0 = Gateway, 1 = CCTP Fast, 2 = CCTP Standard.
    struct Receipt {
        /// @notice Account that submitted the receipt.
        address author;
        /// @notice Block timestamp at submission, in Unix seconds.
        uint64 timestamp;
        /// @notice Source domain identifier.
        uint32 srcDomain;
        /// @notice Destination domain identifier.
        uint32 dstDomain;
        /// @notice Compared service: Gateway (0), CCTP Fast (1), or CCTP Standard (2).
        uint8 service;
        /// @notice Whether the comparison includes forwarding.
        bool forwarded;
        /// @notice Transfer amount in six-decimal USDC base units.
        uint256 amount;
        /// @notice Total compared fee in six-decimal USDC base units.
        uint256 totalFee;
    }

    /// @notice Source and destination domains must differ.
    /// @param domain The domain supplied for both ends of the route.
    error SameDomain(uint32 domain);

    /// @notice The service must be 0, 1, or 2.
    /// @param service The unsupported service value.
    error InvalidService(uint8 service);

    /// @notice The transfer amount must be nonzero.
    error ZeroAmount();

    /// @notice The total fee must not exceed the transfer amount.
    /// @param totalFee The submitted fee.
    /// @param amount The submitted transfer amount.
    error FeeExceedsAmount(uint256 totalFee, uint256 amount);

    /// @notice The requested receipt does not exist.
    /// @param id The nonexistent receipt identifier.
    error ReceiptNotFound(uint256 id);

    /// @notice Emitted when a fee receipt is permanently recorded.
    /// @param id Sequential receipt identifier, starting at 1.
    /// @param author Account that submitted the receipt.
    /// @param srcDomain Source domain identifier.
    /// @param dstDomain Destination domain identifier.
    /// @param service Gateway (0), CCTP Fast (1), or CCTP Standard (2).
    /// @param forwarded Whether the comparison includes forwarding.
    /// @param amount Transfer amount in six-decimal USDC base units.
    /// @param totalFee Total compared fee in six-decimal USDC base units.
    event FeeRecorded(
        uint256 indexed id,
        address indexed author,
        uint32 indexed srcDomain,
        uint32 dstDomain,
        uint8 service,
        bool forwarded,
        uint256 amount,
        uint256 totalFee
    );

    /// @dev Total receipts; also the last assigned identifier.
    uint256 private _receiptCount;

    /// @dev Receipt data keyed by its one-based identifier.
    mapping(uint256 => Receipt) private _receipts;

    /// @dev Per-author identifiers in ascending submission order.
    mapping(address => uint256[]) private _authorReceiptIds;

    /// @dev Directional route counts, keyed by source then destination domain.
    mapping(uint32 => mapping(uint32 => uint256)) private _routeCounts;

    /// @notice Permanently publish a self-reported crosschain fee comparison.
    /// @dev Performs no quote verification or domain allowlisting. No receipt can be changed
    ///      or deleted. This nonpayable function performs no loops or external calls.
    /// @param srcDomain Source domain identifier; must differ from dstDomain.
    /// @param dstDomain Destination domain identifier.
    /// @param service Gateway (0), CCTP Fast (1), or CCTP Standard (2).
    /// @param forwarded Whether the comparison includes forwarding.
    /// @param amount Nonzero transfer amount in six-decimal USDC base units.
    /// @param totalFee Total fee in six-decimal USDC base units; cannot exceed amount.
    /// @return id The new one-based receipt identifier.
    function record(
        uint32 srcDomain,
        uint32 dstDomain,
        uint8 service,
        bool forwarded,
        uint256 amount,
        uint256 totalFee
    ) external returns (uint256 id) {
        if (srcDomain == dstDomain) revert SameDomain(srcDomain);
        if (service > 2) revert InvalidService(service);
        if (amount == 0) revert ZeroAmount();
        if (totalFee > amount) revert FeeExceedsAmount(totalFee, amount);

        id = ++_receiptCount;
        _receipts[id] = Receipt({
            author: msg.sender,
            timestamp: uint64(block.timestamp),
            srcDomain: srcDomain,
            dstDomain: dstDomain,
            service: service,
            forwarded: forwarded,
            amount: amount,
            totalFee: totalFee
        });
        _authorReceiptIds[msg.sender].push(id);
        ++_routeCounts[srcDomain][dstDomain];

        emit FeeRecorded(id, msg.sender, srcDomain, dstDomain, service, forwarded, amount, totalFee);
    }

    /// @notice Return the total number of published receipts.
    /// @return count The total, also the largest assigned receipt identifier.
    function receiptCount() external view returns (uint256 count) {
        return _receiptCount;
    }

    /// @notice Read an existing receipt.
    /// @dev Reverts with ReceiptNotFound for zero or an identifier above the total count.
    /// @param id One-based receipt identifier.
    /// @return receipt The stored receipt.
    function getReceipt(uint256 id) external view returns (Receipt memory receipt) {
        if (id == 0 || id > _receiptCount) revert ReceiptNotFound(id);
        return _receipts[id];
    }

    /// @notice Return the number of receipts published by an account.
    /// @param author Account whose receipts are counted.
    /// @return count The author's total receipts.
    function receiptCountOf(address author) external view returns (uint256 count) {
        return _authorReceiptIds[author].length;
    }

    /// @notice Read a bounded page of an author's receipt identifiers in submission order.
    /// @dev Caps limit at 100. Returns an empty array when offset is past the end or limit
    ///      is zero. Subtracts offset before bounding the page to avoid addition overflow.
    /// @param author Account whose receipt identifiers are requested.
    /// @param offset Zero-based index into the author's receipt list.
    /// @param limit Requested page size, capped at 100.
    /// @return ids Up to 100 receipt identifiers, in ascending order.
    function receiptIdsOf(address author, uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory ids)
    {
        uint256[] storage authorIds = _authorReceiptIds[author];
        uint256 length = authorIds.length;
        if (offset >= length || limit == 0) return new uint256[](0);

        uint256 size = limit > 100 ? 100 : limit;
        uint256 remaining = length - offset;
        if (size > remaining) size = remaining;

        ids = new uint256[](size);
        for (uint256 i = 0; i < size; ++i) {
            ids[i] = authorIds[offset + i];
        }
    }

    /// @notice Return the number of receipts on a directional source-to-destination route.
    /// @param src Source domain identifier.
    /// @param dst Destination domain identifier.
    /// @return count Number of recorded receipts for this exact ordered route.
    function routeCount(uint32 src, uint32 dst) external view returns (uint256 count) {
        return _routeCounts[src][dst];
    }
}
