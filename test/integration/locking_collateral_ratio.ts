import hre from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import cap from "chai-as-promised";
import { bigNumberToDecimal, d12_ToNumber, diffPct, to_d12, to_d18, to_d8 } from "../../utils/Helpers";
import { getBdEur, getBdEurWbtcPool, getBdEurWethPool, getBdx, getDeployer, getOnChainBtcEurPrice, getOnChainEthEurPrice, getUser, getWbtc, getWeth, mintWbtc as mintWbtcFromEth } from "../helpers/common";
import { setUpFunctionalSystem } from "../helpers/SystemSetup";
import { simulateTimeElapseInSeconds } from "../../utils/HelpersHardhat";

chai.use(cap);

chai.use(solidity);
const { expect } = chai;

describe("Locking collateral ratio", () => {

    beforeEach(async () => {
        await hre.deployments.fixture();
        await setUpFunctionalSystem(hre);
    });

    it("collateral ratio should move when unlocked", async () => {
        const bdEur = await getBdEur(hre);
        const initialCR_d12 = await bdEur.global_collateral_ratio_d12();
        const initialCR = d12_ToNumber(initialCR_d12);

        expect(initialCR).to.be.lt(1); // test validation

        await DecreaseCollateralizationAndWait();

        const actualCR_d12 = await bdEur.global_collateral_ratio_d12();
        const actualCR = d12_ToNumber(actualCR_d12);

        console.log("initialCR: " + initialCR);
        console.log("actualCR: " + actualCR);
        expect(actualCR).to.be.lt(initialCR);
    });

    it("collateral ratio NOT should move when locked", async () => {
        const bdEur = await getBdEur(hre);
        const initialCR_d12 = await bdEur.global_collateral_ratio_d12();
        const initialCR = d12_ToNumber(initialCR_d12);

        expect(initialCR).to.be.lt(1); // test validation

        await bdEur.lockCollateralRationAt(initialCR_d12);

        await DecreaseCollateralizationAndWait();

        const actualCR_d12 = await bdEur.global_collateral_ratio_d12();
        const actualCR = d12_ToNumber(actualCR_d12);

        console.log("initialCR: " + initialCR);
        console.log("actualCR: " + actualCR);
        expect(actualCR).to.be.eq(initialCR);
    });

    async function DecreaseCollateralizationAndWait(){
        const bdEurWethPool = await getBdEurWethPool(hre);
        const weth = await getWeth(hre);
        const bdx = await getBdx(hre);
      
        await simulateTimeElapseInSeconds(60*60*24);

        // owner mints some BdEur in order to natrually trigger oracles and CR update
        const collateralAmount = to_d18(0.001);
        const excessiveBdxAmount = to_d18(1000);
        await weth.approve(bdEurWethPool.address, collateralAmount);
        await bdx.approve(bdEurWethPool.address, excessiveBdxAmount);
        await bdEurWethPool.mintFractionalBdStable(collateralAmount, excessiveBdxAmount, 1);
    }
});