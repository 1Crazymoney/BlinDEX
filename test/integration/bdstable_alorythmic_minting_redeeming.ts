import hre from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import cap from "chai-as-promised";
import { diffPct, simulateTimeElapseInDays, simulateTimeElapseInSeconds } from "../../utils/Helpers";
import { toErc20, erc20ToNumber, numberToBigNumberFixed } from "../../utils/Helpers"
import { BdStablePool } from "../../typechain/BdStablePool";
import { SignerWithAddress } from "hardhat-deploy-ethers/dist/src/signer-with-address";
import { updateBdxOracleRefreshRatiosBdEur, updateBdxOracle } from "../helpers/bdStable";
import { getBdEur, getBdx, getWeth } from "../helpers/common";
import { provideLiquidity_BDX_WETH_userTest1, provideLiquidity_BDEUR_WETH_userTest1 } from "../helpers/swaps";
import { getOnChainEthEurPrice } from "../helpers/common";
import { updateWethPair } from "../helpers/swaps";
import { BigNumber } from "ethers";

chai.use(cap);

chai.use(solidity);
const { expect } = chai;

async function performMinting(testUser: SignerWithAddress, bdxAmount: number){
    const [ ownerUser ] = await hre.ethers.getSigners();

    const bdEurPool = await hre.ethers.getContract('BDEUR_WETH_POOL', ownerUser) as unknown as BdStablePool;

    await updateBdxOracleRefreshRatiosBdEur(hre);
    await updateWethPair(hre, "BDXShares");

    await bdEurPool.connect(testUser).mintAlgorithmicBdStable((toErc20(bdxAmount)), (toErc20(1)));
}

describe("BDStable algorythmic", () => {

    beforeEach(async () => {
        await hre.deployments.fixture();
    });

    it("should mint bdeur when CR = 0", async () => {
        const [ ownerUser ] = await hre.ethers.getSigners();
        const testUser = await hre.ethers.getNamedSigner('TEST2');

        const bdx = await getBdx(hre);
        const weth = await getWeth(hre);
        const bdEur = await getBdEur(hre);
        const bdEurPool = await hre.ethers.getContract('BDEUR_WETH_POOL', ownerUser) as unknown as BdStablePool;
    
        // set step to 1 to get CR = 0 after first refresh
        await bdEur.setBdstable_step_d12(numberToBigNumberFixed(1, 12));

        const bdxBalanceBeforeMinting = toErc20(1000000);
        await bdx.mint(testUser.address, bdxBalanceBeforeMinting);

        const ethInBdxPrice = 100;

        const bdxAmountForMintigBdEur = 10;

        const expectedWeth = await weth.balanceOf(testUser.address);
        const bdEurlBalanceBeforeMinting = await bdEur.balanceOf(testUser.address);

        await provideLiquidity_BDEUR_WETH_userTest1(hre, 1000);
        await provideLiquidity_BDX_WETH_userTest1(hre, ethInBdxPrice);

        await updateBdxOracleRefreshRatiosBdEur(hre);
        await updateBdxOracle(hre);

        const bdxInEurPrice = await bdEur.BDX_price_d12();

        await bdx.connect(testUser).approve(bdEurPool.address, toErc20(bdxAmountForMintigBdEur)); 
        await performMinting(testUser, bdxAmountForMintigBdEur);

        const expectedBdxCost = toErc20(bdxAmountForMintigBdEur);
        const expectedBdEurDiff = toErc20(bdxAmountForMintigBdEur).mul(bdxInEurPrice).div(1e12);

        const bdEurBalanceAfterMinting = await bdEur.balanceOf(testUser.address);

        const diffPctBdEur = diffPct(bdEurBalanceAfterMinting.sub(bdEurlBalanceBeforeMinting), expectedBdEurDiff);

        const bdxBalanceAfterMinting = await bdx.balanceOf(testUser.address);
        const actualBdxCost = bdxBalanceBeforeMinting.sub(bdxBalanceAfterMinting);  
        
        const diffPctBdxCost = diffPct(actualBdxCost, expectedBdxCost);
        const actualWeth = await weth.balanceOf(testUser.address);

        const diffPctWethBalance = diffPct(expectedWeth, actualWeth);

        console.log(`Diff BDX cost: ${diffPctBdxCost}%`);
        console.log(`Diff BdEur balance: ${diffPctBdEur}%`);
        console.log(`Diff Weth balance: ${diffPctWethBalance}%`);

        expect(diffPctBdxCost).to.be.closeTo(0, 0.01);
        expect(diffPctWethBalance).to.be.closeTo(0, 0.01);
        expect(diffPctBdEur).to.be.closeTo(0, 0.01);
    });

    it("should redeem bdeur when CR = 0", async () => {
        const [ ownerUser ] = await hre.ethers.getSigners();
        const weth = await getWeth(hre);

        const testUser = await hre.ethers.getNamedSigner('TEST2');

        const { ethInEurPrice_1e12, ethInEurPrice } = await getOnChainEthEurPrice(hre);

        const collateralAmount = 10;

        await provideLiquidity_BDX_WETH_userTest1(hre, ethInEurPrice);
        await performMinting(testUser, collateralAmount);

        const bdEurPool = await hre.ethers.getContract('BDEUR_WETH_POOL', ownerUser) as unknown as BdStablePool;
        
        const bdEur = await getBdEur(hre);

        var bdEurBalanceBeforeRedeem = await bdEur.balanceOf(testUser.address);
        var wethBalanceBeforeRedeem = await weth.balanceOf(testUser.address);

        await bdEur.connect(testUser).approve(bdEurPool.address, bdEurBalanceBeforeRedeem);

        await bdEurPool.connect(testUser).redeem1t1BD(bdEurBalanceBeforeRedeem, toErc20(1));
        await bdEurPool.connect(testUser).collectRedemption();

        var bdEurBalanceAfterRedeem = await bdEur.balanceOf(testUser.address);
        var wethBalanceAfterRedeem = await weth.balanceOf(testUser.address);

        console.log("bdEur balance before redeem: " + erc20ToNumber(bdEurBalanceBeforeRedeem));
        console.log("bdEur balance after redeem:  " + erc20ToNumber(bdEurBalanceAfterRedeem));
        
        console.log("weth balance before redeem:  " + erc20ToNumber(wethBalanceBeforeRedeem));
        console.log("weth balance after redeem:   " + erc20ToNumber(wethBalanceAfterRedeem));

        const wethDelta = erc20ToNumber(wethBalanceAfterRedeem.sub(wethBalanceBeforeRedeem));
        console.log("weth balance delta: " + wethDelta);

        expect(bdEurBalanceBeforeRedeem).to.be.gt(0);
        expect(bdEurBalanceAfterRedeem).to.eq(0);
        expect(wethDelta).to.eq(collateralAmount)
    });
})
