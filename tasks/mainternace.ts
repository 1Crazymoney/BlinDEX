import { task } from "hardhat/config";
import {
  getAllBDStables,
  getBdEu,
  getBdEuWethPool,
  getBdUs,
  getBdx,
  getBot,
  getDeployer,
  getTreasury,
  getUniswapPairOracle,
  getWeth,
  formatAddress,
  getSovrynFeed_RbtcUsd as getSovrynFeed_RbtcUsd,
  getSovrynFeed_RbtcEths as getSovrynFeed_RbtcEths,
  getFiatToFiat_EurUsd,
  getTokenData
} from "../utils/DeployedContractsHelpers";
import type { UniswapV2Pair } from "../typechain/UniswapV2Pair";
import { bigNumberToDecimal, d12_ToNumber, d18_ToNumber, to_d12, to_d18 } from "../utils/NumbersHelpers";
import { getPools, updateUniswapPairsOracles, resetUniswapPairsOracles } from "../utils/UniswapPoolsHelpers";
import type { BDStable } from "../typechain/BDStable";
import type { FiatToFiatPseudoOracleFeed } from "../typechain/FiatToFiatPseudoOracleFeed";
import type { IOracleBasedCryptoFiatFeed } from "../typechain/IOracleBasedCryptoFiatFeed";
import type { SovrynSwapPriceFeed } from "../typechain/SovrynSwapPriceFeed";
import type { BtcToEthOracleChinlink } from "../typechain/BtcToEthOracleChinlink";
import type { IPriceFeed } from "../typechain/IPriceFeed";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { UpdaterRSK } from "../typechain/UpdaterRSK";
import { BigNumber } from "@ethersproject/bignumber";
import { PriceFeedContractNames } from "../deploy/7_deploy_price_feeds";
import { getAllUniswapPairsData } from "./liquidity-pools";
import * as constants from "../utils/Constants";
import moment from "moment";

export function load() {
  task("update:all")
    .addParam("btcusd", "BTCUSD price")
    .addParam("btceth", "BTCETH price")
    .addParam("eurusd", "EURUSD price")
    .setAction(async ({ btcusd, btceth, eurusd }, hre) => {
      const signer = await getBot(hre);

      if (hre.network.name === "rsk") {
        console.log("starting sovryn swap price oracles updates");
        const oracleEthUsd = await getSovrynFeed_RbtcUsd(hre);
        await (await oracleEthUsd.updateOracleWithVerification(to_d12(btcusd))).wait();
        console.log("updated ETH / USD (RSK BTC / USD)");

        const oracleBtcEth = await getSovrynFeed_RbtcEths(hre);
        await (await oracleBtcEth.updateOracleWithVerification(to_d12(btceth))).wait();
        console.log("updated BTC / ETH (same on both networks)");

        console.log("starting fiat to fiat oracles updates");
        const oracleEurUsd = await getFiatToFiat_EurUsd(hre);
        await (await oracleEurUsd.setPrice(to_d12(eurusd))).wait();
        console.log("updated EUR / USD");
      }

      console.log("starting uniswap pairs oracles updates");
      await updateUniswapPairsOracles(hre, signer);

      console.log("starting refresh collateral ratio");
      const stables = await getAllBDStables(hre);

      for (const stable of stables) {
        await (await stable.connect(signer).refreshCollateralRatio()).wait();
        console.log(`${await stable.symbol()} refreshed collateral ratio`);
      }
    });

  task("update:btceth:rsk")
    .addParam("btceth", "BTCETH price")
    .setAction(async ({ btceth }, hre) => {
      if (hre.network.name !== "rsk") {
        throw new Error("RSK only task");
      }

      const signer = await getBot(hre);

      const oracleBtcEth = (await hre.ethers.getContract(PriceFeedContractNames.BTC_ETH, signer)) as SovrynSwapPriceFeed;
      await (await oracleBtcEth.updateOracleWithVerification(to_d12(btceth))).wait();
      console.log("updated RSK BTC/ETH (same on both networks)");
    });

  task("update:eurusd:rsk")
    .addPositionalParam("eurusd", "EURUSD price")
    .setAction(async ({ eurusd }, hre) => {
      if (hre.network.name !== "rsk") {
        throw new Error("RSK only task");
      }
      const deployer = await getDeployer(hre);
      const oracleEurUsd = (await hre.ethers.getContract(PriceFeedContractNames.EUR_USD, deployer)) as FiatToFiatPseudoOracleFeed;
      await (await oracleEurUsd.connect(deployer).setPrice(to_d12(eurusd))).wait();
      console.log("updated EUR / USD");
    });

  task("update:eurusd:maxDayChange:rsk")
    .addPositionalParam("change", "Max day change")
    .setAction(async ({ change }, hre) => {
      if (hre.network.name !== "rsk") {
        throw new Error("RSK only task");
      }

      if (change < 0.01 || change > 0.2) {
        throw new Error("Max day change shloud be between 0.01 and 0.2");
      }

      const deployer = await getDeployer(hre);
      const oracleEurUsd = (await hre.ethers.getContract(PriceFeedContractNames.EUR_USD, deployer)) as FiatToFiatPseudoOracleFeed;
      await (await oracleEurUsd.connect(deployer).setMaxDayChange_d12(to_d12(change))).wait();
      console.log("updated EUR / USD max day change");
    });

  task("reset:uniswap-oracles").setAction(async (args, hre) => {
    await resetUniswapPairsOracles(hre);
  });

  task("update:uniswap-oracles-as-deployer").setAction(async (args, hre) => {
    const deployer = await getDeployer(hre);
    await updateUniswapPairsOracles(hre, deployer);
  });

  task("update:all-with-updater")
    .addParam("btcusd", "BTCUSD price")
    .addParam("btceth", "BTCETH price")
    .addParam("eurusd", "EURUSD price")
    .setAction(async ({ btcusd, btceth, eurusd }, hre) => {
      console.log("starting the updater");

      const bot = await getBot(hre);
      const updater = (await hre.ethers.getContract("UpdaterRSK", bot)) as UpdaterRSK;

      const uniOracles = [];
      const pools = await getPools(hre);
      for (const pool of pools) {
        const oracle = await getUniswapPairOracle(hre, pool[0].name, pool[1].name);
        uniOracles.push(oracle.address);
      }

      const oracleEthUsd = await getSovrynFeed_RbtcUsd(hre);
      const oracleBtcEth = await getSovrynFeed_RbtcEths(hre); // this one is not inverted
      const oracleEurUsd = await getFiatToFiat_EurUsd(hre);

      const sovrynOracles = [formatAddress(hre, oracleEthUsd.address), formatAddress(hre, oracleBtcEth.address)];
      const sovrynPrices = [to_d12(btcusd), to_d12(btceth)];

      const fiatToFiatOracles = [formatAddress(hre, oracleEurUsd.address)];
      const fiatToFiatPrices = [to_d12(eurusd)];

      const stablesAddresses = (await getAllBDStables(hre)).map(stable => stable.address);
      await (await updater.update(sovrynOracles, sovrynPrices, fiatToFiatOracles, fiatToFiatPrices, uniOracles, stablesAddresses)).wait();

      console.log("updater has updated");
    });

  task("set:oracles:ConsultLeniency")
    .addPositionalParam("newVal", "new value")
    .setAction(async ({ newVal }, hre) => {
      const pools = await getPools(hre);

      console.log("setting consultLeniency to: " + newVal);

      for (const pool of pools) {
        const oracle = await getUniswapPairOracle(hre, pool[0].name, pool[1].name);
        console.log(`starting for ${pool[0].name} / ${pool[1].name}`);

        await (await oracle.setConsultLeniency(newVal)).wait();
        console.log("pool done");
      }
      console.log("all done");
    });

  task("set:oracles:AllowStaleConsults")
    .addPositionalParam("enable", "1 = enable, 0 = disable")
    .setAction(async ({ enable }, hre) => {
      const pools = await getPools(hre);
      for (const pool of pools) {
        const oracle = await getUniswapPairOracle(hre, pool[0].name, pool[1].name);

        await (await oracle.setAllowStaleConsults(+enable === 0 ? false : true)).wait();
        console.log(`oracle ${pool[0].name} / ${pool[1].name} allow stale consults = ${enable}`);
      }
    });

  task("set:lockCollateralRatioAt")
    .addPositionalParam("stableAddress", "stable address")
    .addPositionalParam("val", "value")
    .setAction(async ({ stableAddress, val }, hre) => {
      if (val < 0 || val > 1) {
        throw "invalid cr value";
      }

      const deployer = await getDeployer(hre);

      const stable = (await hre.ethers.getContractAt("BDStable", formatAddress(hre, stableAddress))) as BDStable;
      await (await stable.connect(deployer).lockCollateralRatioAt(to_d12(val))).wait();
    });

  task("set:stable-toggleCollateralRatioPaused")
    .addPositionalParam("stableAddress", "stable address")
    .setAction(async ({ stableAddress }, hre) => {
      const deployer = await getDeployer(hre);

      const stable = (await hre.ethers.getContractAt("BDStable", formatAddress(hre, stableAddress))) as BDStable;
      await (await stable.connect(deployer).toggleCollateralRatioPaused()).wait();
    });

  task("set:rsk-eur-usd")
    .addPositionalParam("newPrice", "new price")
    .setAction(async ({ newPrice }, hre) => {
      if (hre.network.name !== "rsk") {
        throw new Error("RSK only task");
      }
      const bot = await hre.ethers.getNamedSigner("BOT");

      if (newPrice < 0.5 || newPrice > 2) {
        throw "invalid price";
      }

      console.log("Setting EUR/USD: " + newPrice);

      const feed = (await hre.ethers.getContract(PriceFeedContractNames.EUR_USD)) as FiatToFiatPseudoOracleFeed;
      await (await feed.connect(bot).setPrice(to_d12(newPrice))).wait();
    });

  task("run:mint-some-bdeu")
    .addPositionalParam("allowBdx", "can we pay bdx on top o collateral to mint")
    .setAction(async (args, hre) => {
      const pool = await getBdEuWethPool(hre);
      const weth = await getWeth(hre);
      const bdx = await getBdx(hre);

      const btcIn = to_d18(0.00001);
      await (await weth.approve(pool.address, to_d18(0.001))).wait();
      await (await bdx.approve(pool.address, to_d18(100))).wait();
      await (await pool.mintFractionalBdStable(btcIn, to_d18(1), to_d18(0.001), false)).wait();
    });

  // -------------------------- readonly

  task("show:oracles-prices").setAction(async (args, hre) => {
    await showUniswapOraclesPrices(hre, true);
  });

  task("show:pool-reserves")
    .addPositionalParam("pairAddress", "pair address")
    .setAction(async ({ pairAddress }, hre) => {
      const pair = (await hre.ethers.getContractAt("UniswapV2Pair", formatAddress(hre, pairAddress))) as UniswapV2Pair;
      const reserves = await pair.getReserves();
      console.log(`Reserves: ${d18_ToNumber(reserves[0])} ${d18_ToNumber(reserves[1])}`);
    });

  task("show:users").setAction(async (args, hre) => {
    const deployer = await getDeployer(hre);
    const treasury = await getTreasury(hre);
    const bot = await getBot(hre);

    console.log("deployer: " + deployer.address);
    console.log("treasury: " + treasury.address);
    console.log("bot     : " + bot.address);
  });

  task("show:bdeu:ef-bdx-cov").setAction(async (args, hre) => {
    await show_efBDXCov(await getBdEu(hre));
  });

  task("show:bdus:ef-bdx-cov").setAction(async (args, hre) => {
    await show_efBDXCov(await getBdUs(hre));
  });

  task("show:rsk-eur-usd").setAction(async (args, hre) => {
    if (hre.network.name !== "rsk") {
      throw new Error("RSK only task");
    }
    await show_eurUsd(hre);
  });

  task("show:rsk-eth-usd").setAction(async (args, hre) => {
    if (hre.network.name !== "rsk") {
      throw new Error("RSK only task");
    }
    await show_ethUsd(hre);
  });

  task("show:full-diagnostics").setAction(async (_args, hre) => {
    console.log("==================================");
    console.log("Oracles - Price Feeds");
    console.log("==================================");
    await show_ethEur(hre);
    await show_ethUsd(hre);
    await show_btcEth(hre);
    await show_eurUsd(hre);

    console.log("==================================");
    console.log("Oracles - Uniswap");
    console.log("==================================");
    await showUniswapOraclesPrices(hre);

    console.log("==================================");
    console.log("BDStables Information");
    console.log("==================================");

    const stables = await getAllBDStables(hre);

    for (const stable of stables) {
      await show_efCR(stable);
      await show_CR(stable);
      await show_efBDXCov(stable);
    }

    console.log("==================================");
    console.log("Uniswap Pairs Information");
    console.log("==================================");
    console.log(await getAllUniswapPairsData(hre));
  });

  task("show:efCRs").setAction(async (args, hre) => {
    const stables = await getAllBDStables(hre);

    for (const stable of stables) {
      await show_efCR(stable);
    }
  });

  async function show_ethEur(hre: HardhatRuntimeEnvironment) {
    const feed = (await hre.ethers.getContract(PriceFeedContractNames.ETH_EUR)) as IOracleBasedCryptoFiatFeed;
    const price = d12_ToNumber(await feed.getPrice_1e12());
    console.log(`${constants.NATIVE_TOKEN_NAME[hre.network.name]}/EUR: ${price}`);
  }

  async function show_ethUsd(hre: HardhatRuntimeEnvironment) {
    const feed = (await hre.ethers.getContract(PriceFeedContractNames.ETH_USD_ADAPTER)) as IOracleBasedCryptoFiatFeed;
    const price = d12_ToNumber(await feed.getPrice_1e12());
    console.log(`${constants.NATIVE_TOKEN_NAME[hre.network.name]}/USD: ${price}`);
  }

  async function show_btcEth(hre: HardhatRuntimeEnvironment) {
    let price;
    if (hre.network.name === "rsk") {
      const feed = (await hre.ethers.getContract(PriceFeedContractNames.BTC_ETH)) as IPriceFeed;
      price = bigNumberToDecimal(await feed.price(), await feed.decimals());
    } else {
      const feed = (await hre.ethers.getContract(PriceFeedContractNames.BTC_ETH)) as BtcToEthOracleChinlink;
      price = d12_ToNumber(await feed.getPrice_1e12());
    }

    console.log(`BTC/ETH (should be the same on all networks): ${price}`);
  }

  async function show_eurUsd(hre: HardhatRuntimeEnvironment) {
    const feed = (await hre.ethers.getContract(PriceFeedContractNames.EUR_USD)) as IPriceFeed;
    const price = bigNumberToDecimal(await feed.price(), await feed.decimals());
    let lastUpdateTimestamp = 0;
    if (hre.network.name === "rsk") {
      const feedConcrete = feed as FiatToFiatPseudoOracleFeed;
      lastUpdateTimestamp = await (await feedConcrete.lastUpdateTimestamp()).toNumber();
    }

    console.log(`EUR/USD: ${price} last updated: ${new Date(lastUpdateTimestamp * 1000)}`);
  }

  async function show_efBDXCov(stable: BDStable) {
    const efBdxCov = await stable.get_effective_bdx_coverage_ratio();
    console.log(`${await stable.symbol()} efBDXCov: ${d12_ToNumber(efBdxCov.mul(100))}%`);
  }

  async function show_efCR(stable: BDStable) {
    const efCR = await stable.effective_global_collateral_ratio_d12();
    console.log(`${await stable.symbol()} efCR: ${d12_ToNumber(efCR.mul(100))}%`);
  }

  async function show_CR(stable: BDStable) {
    const efCR = await stable.global_collateral_ratio_d12();
    console.log(`${await stable.symbol()} CR: ${d12_ToNumber(efCR.mul(100))}%`);
  }

  async function showUniswapOraclesPrices(hre: HardhatRuntimeEnvironment, showPrices = true) {
    const pools = await getPools(hre);

    for (const pool of pools) {
      const oracle = await getUniswapPairOracle(hre, pool[0].name, pool[1].name);
      const updatedAgo = new Date().getTime() / 1000 - (await oracle.blockTimestampLast());
      const humanizedUpdatedAgo = moment.duration(-Math.round(updatedAgo), "seconds").humanize(true);

      if (showPrices) {
        const token0Address = pool[0].token.address;
        const token1Address = pool[1].token.address;
        const [token0Data, token1Data] = await Promise.all([getTokenData(token0Address, hre), getTokenData(token1Address, hre)]);

        const amountIn = to_d18(1e6);
        let amountOut;

        if (token0Data.decimals < token1Data.decimals) {
          const missingDecimals = BigNumber.from(token1Data.decimals - token0Data.decimals);
          amountOut = await oracle.consult(token0Address, amountIn.div(BigNumber.from(10).pow(missingDecimals)));
        } else if (token0Data.decimals > token1Data.decimals) {
          const missingDecimals = BigNumber.from(token0Data.decimals - token1Data.decimals);
          amountOut = await oracle.consult(token0Address, amountIn.mul(BigNumber.from(10).pow(missingDecimals)));
        } else {
          amountOut = await oracle.consult(token0Address, amountIn);
        }

        const price = d12_ToNumber(to_d12(1).mul(amountOut).div(amountIn));

        console.log(`oracle ${pool[0].name} / ${pool[1].name} price: ${price}, updated: ${humanizedUpdatedAgo}`);
        console.log(`       ${pool[1].name} / ${pool[0].name} price: ${1 / price}`);
      } else {
        console.log(`oracle ${pool[0].name} / ${pool[1].name} updated: ${humanizedUpdatedAgo}`);
      }
    }
  }
}
