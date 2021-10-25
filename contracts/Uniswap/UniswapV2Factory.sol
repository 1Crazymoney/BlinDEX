// SPDX-License-Identifier: GNU General Public License v3.0
// Based on https://github.com/Uniswap/v2-core

pragma solidity 0.6.11;

import './Interfaces/IUniswapV2Factory.sol';
import './UniswapV2Pair.sol';
import "@openzeppelin/contracts/access/Ownable.sol";

contract UniswapV2Factory is IUniswapV2Factory, Ownable {
    address public override feeTo;
    address public override treasury;
    uint256 public override maxSpotVsOraclePriceDivergence_d12;

    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _treasury, uint256 _maxSpotVsOraclePriceDivergence_d12) public {
        treasury = _treasury;
        maxSpotVsOraclePriceDivergence_d12 = _maxSpotVsOraclePriceDivergence_d12;
    }

    function allPairsLength() external override view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        require(tokenA != tokenB, 'UniswapV2: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniswapV2: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'UniswapV2: PAIR_EXISTS'); // single check is sufficient
        bytes memory bytecode = abi.encodePacked(
            type(UniswapV2Pair).creationCode,
            abi.encode(owner()),
            abi.encode(treasury));

        bytes32 salt = keccak256(abi.encodePacked(token0, token1));

        // This creates a new contract
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IUniswapV2Pair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external override onlyOwner {
        feeTo = _feeTo;
    }

    function setTreasury(address _treasury) external override onlyOwner {
        treasury = _treasury;
    }

    function setMaxSpotVsOraclePriceDivergence_d12(uint256 _maxSpotVsOraclePriceDivergence_d12) external override onlyOwner {
        maxSpotVsOraclePriceDivergence_d12 = _maxSpotVsOraclePriceDivergence_d12;
    }
}
