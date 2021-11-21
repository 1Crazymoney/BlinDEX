import { HardhatUserConfig } from 'hardhat/types';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import 'hardhat-dependency-compiler'

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ],
    overrides: {
      "contracts/Oracle/UniswapPairOracle.sol": {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      "@uniswap/lib/contracts/libraries/FixedPoint.sol": {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      "@uniswap/lib/contracts/libraries/BitMath.sol": {
        version: "0.6.6",
        settings: {optimizer: {
          enabled: true,
          runs: 200
        }}
      },
      "@uniswap/lib/contracts/libraries/FullMath.sol": {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      "@uniswap/v2-core/contracts/UniswapV2Pair.sol": {
        version: "0.5.16",
        settings: { 
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      "@uniswap/v2-core/contracts/UniswapV2Factory.sol": {
        version: "0.5.16",
        settings: { 
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol": {
        version: "0.6.6",
        settings: { 
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      "@uniswap/v2-periphery/contracts/libraries/UniswapV2OracleLibrary.sol": {
        version: "0.6.6",
        settings: { 
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    }
  },
  dependencyCompiler: {
    paths: [
      '@uniswap/v2-core/contracts/UniswapV2Pair.sol',
      '@uniswap/v2-core/contracts/UniswapV2Factory.sol',
      '@uniswap/v2-periphery/contracts/UniswapV2Router02.sol',
    ],
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5"
  },
};

export default config