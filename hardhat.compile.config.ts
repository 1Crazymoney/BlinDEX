import type { HardhatUserConfig } from "hardhat/types";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";

export const typechainOutDir = "typechain";

const solidity6Compiler = {
  version: "0.6.12",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      solidity6Compiler,
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
    overrides: {}
  },
  typechain: {
    outDir: typechainOutDir,
    target: "ethers-v5",
    externalArtifacts: [
      "./node_modules/@uniswap/v2-core/build/UniswapV2Pair.json",
      "./node_modules/@uniswap/v2-core/build/UniswapV2Pair__factory.json",
      "./node_modules/@uniswap/v2-core/build/UniswapV2Factory.json",
      "./node_modules/@uniswap/v2-core/build/UniswapV2Factory__factory.json",
      "./node_modules/@uniswap/v2-periphery/build/UniswapV2Router02.json",
      "./node_modules/@uniswap/v2-periphery/build/UniswapV2Router02__factors.json"
    ]
  },
  external: {
    // Part of the hardhat-deploy package
    contracts: [
      {
        artifacts: "node_modules/@uniswap/v2-core/build"
      },
      {
        artifacts: "node_modules/@uniswap/v2-periphery/build"
      }
    ]
  }
};

export default config;
