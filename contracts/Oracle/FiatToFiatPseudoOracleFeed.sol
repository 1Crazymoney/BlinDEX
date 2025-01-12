// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPriceFeed.sol";

// We need feeds with fiats prices. For now on RSK chain there are no such feeds.
// We populate our own feeds
contract FiatToFiatPseudoOracleFeed is IPriceFeed, Ownable {
    uint8 private constant DECIMALS = 12;
    uint256 private constant PRICE_PRECISION = 1e12;
    uint256 private constant SECONDS_IN_DAY = 60 * 60 * 24;

    uint256 private recentPrice;
    uint256 public lastUpdateTimestamp;
    uint256 public maxDayChange_d12 = 1e11; // 10%

    address private updater;

    constructor(address _updater, uint256 _recentPrice) {
        require(_updater != address(0), "Updater address cannot be 0");

        updater = _updater;
        recentPrice = _recentPrice;
        lastUpdateTimestamp = block.timestamp;
    }

    function decimals() external pure override returns (uint8) {
        return DECIMALS;
    }

    function price() external view override returns (uint256) {
        return recentPrice;
    }

    function setUpdater(address newUpdater) external onlyOwner {
        require(newUpdater != address(0), "Updater cannot be set to the zero address");

        address oldUpdater = updater;
        updater = newUpdater;
        emit UpdaterChanged(oldUpdater, updater);
    }

    function setPrice(uint256 _price) external onlyUpdaterOrOwner {
        if (_msgSender() != owner()) {
            uint256 diff = _price > recentPrice ? _price - recentPrice : recentPrice - _price;

            uint256 dayChange_d12 = (PRICE_PRECISION * diff * SECONDS_IN_DAY) / recentPrice / (block.timestamp - lastUpdateTimestamp);

            require(dayChange_d12 <= maxDayChange_d12, "Price change too big");
        }

        recentPrice = _price;
        lastUpdateTimestamp = block.timestamp;
        emit PriceChanged(_price);
    }

    function setMaxDayChange_d12(uint256 _maxDayChange_d12) external onlyOwner {
        maxDayChange_d12 = _maxDayChange_d12;
        emit MaxDayChangeChanged(_maxDayChange_d12);
    }

    modifier onlyUpdaterOrOwner() {
        require(_msgSender() == updater || _msgSender() == owner(), "You're not updater");
        _;
    }

    event UpdaterChanged(address indexed oldUpdater, address indexed newUpdater);
    event PriceChanged(uint256 indexed newPrice);
    event MaxDayChangeChanged(uint256 indexed newMaxDayChange_d12);
}
