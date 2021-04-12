import { BigNumber } from 'ethers';
import hre from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import {SignerWithAddress} from 'hardhat-deploy-ethers/dist/src/signer-with-address';
import { WETH } from "../../typechain/WETH";
import { BDStable } from "../../typechain/BDStable";
import { BdStablePool } from "../../typechain/BdStablePool";
import { UniswapV2Router02 } from "../../typechain/UniswapV2Router02";
import { StakingRewards } from "../../typechain/StakingRewards";
import { UniswapV2Factory } from "../../typechain/UniswapV2Factory";
import { ERC20 } from "../../typechain/ERC20";
import TimeTraveler from "../../utils/TimeTraveler"
import { BDXShares } from '../../typechain/BDXShares';

chai.use(solidity);
const { expect } = chai;

function toErc20(n: number): BigNumber {
  return BigNumber.from(10).pow(18).mul(n)
}

describe("StakingRewards", () => {
  const timeTraveler = new TimeTraveler(hre.network.provider);
  const bdxFirstYearSchedule = toErc20(21000000).mul(20).div(100);
  const bdxPerSecond = bdxFirstYearSchedule.div(365*24*60*60);

  describe("BDX accruing through liquidity mining", () => {
    it("should toggle collateral price", async () => {

      const ownerUser = await hre.ethers.getNamedSigner('POOL_CREATOR');
      const testUser1 = await hre.ethers.getNamedSigner('TEST1');
      const testUser2 = await hre.ethers.getNamedSigner('TEST2');
      const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
      const weth = await hre.ethers.getContractAt("WETH", WETH_ADDRESS, ownerUser) as unknown as WETH;
      const bdStablePool = await hre.ethers.getContract('BDEUR_WETH_POOL', ownerUser) as unknown as BdStablePool;
      const bdEur = await hre.ethers.getContract('BDEUR', ownerUser) as unknown as BDStable;
      const bdx = await hre.ethers.getContract('BDXShares', ownerUser) as unknown as BDXShares;
      const uniswapV2Router02 = await hre.ethers.getContract('UniswapV2Router02', ownerUser) as unknown as UniswapV2Router02;
      const stakingRewards_BDEUR_WETH = await hre.ethers.getContract('StakingRewards_BDEUR_WETH', ownerUser) as unknown as StakingRewards;
      const uniswapFactory = await hre.ethers.getContract("UniswapV2Factory", ownerUser) as unknown as UniswapV2Factory;  

      const swapPairAddress = await uniswapFactory.getPair(bdEur.address, weth.address);
      const lpToken_BdEur_WETH = await hre.ethers.getContractAt("ERC20", swapPairAddress, ownerUser) as unknown as ERC20;

      async function provideLiquidity_WETH_BDEUR(
        amountWeth: number, 
        amountBdEur: number,
        user: SignerWithAddress)
      {
        // todo ag mock function, should be replaced in the future
        // extracts collateral form user's account
        // assings bdeur to the user
        await bdStablePool.connect(user).mintBdStable(toErc20(amountBdEur));

        // mint WETH fromETH
        await weth.connect(user).deposit({ value: toErc20(amountWeth) });
        
        // add liquidity to the uniswap pool (weth-bdeur)
        // reveive LP tokens
        await weth.connect(user).approve(uniswapV2Router02.address, toErc20(amountWeth));
        await bdEur.connect(user).approve(uniswapV2Router02.address, toErc20(amountBdEur));
        
        const currentBlock = await hre.ethers.provider.getBlock("latest");

        // router routes to the proper pair
        await uniswapV2Router02.connect(user).addLiquidity(
          weth.address, 
          bdEur.address, 
          toErc20(amountWeth), 
          toErc20(amountBdEur), 
          toErc20(amountWeth), 
          toErc20(amountBdEur), 
          user.address, 
          currentBlock.timestamp + 60);

        // approve LP tokens transfer to the liquidity rewards manager
        await lpToken_BdEur_WETH.connect(user).approve(stakingRewards_BDEUR_WETH.address, toErc20(100));
      }

      async function simulateTimeElapseInDays(days: number){
        const minutesInDay = 60*24;
        const secondsInDay = minutesInDay*60;
        await timeTraveler.increaseTime(days*secondsInDay);
      }

      const depositedLPTokenUser1 = 2;
      const depositedLPTokenUser2 = 6;

      const totalDepositedLpTokens =
        +depositedLPTokenUser1 
        +depositedLPTokenUser2;

      await provideLiquidity_WETH_BDEUR(1, 5, testUser1);
      await provideLiquidity_WETH_BDEUR(4, 20, testUser2);

      console.log("LP token ballance user1 (erc20): " + (await lpToken_BdEur_WETH.balanceOf(testUser1.address)));
      console.log("LP token ballance user2 (erc20): " + (await lpToken_BdEur_WETH.balanceOf(testUser2.address)));

      // await stakingRewards_BDEUR_WETH.connect(testUser1).stake(toErc20(depositedLPTokenUser1));
      await stakingRewards_BDEUR_WETH.connect(testUser1).stakeLocked(toErc20(depositedLPTokenUser1), 5);
      await stakingRewards_BDEUR_WETH.connect(testUser2).stake(toErc20(depositedLPTokenUser2));

      const days = 70;
      await simulateTimeElapseInDays(days)

      // await stakingRewards_BDEUR_WETH.connect(testUser1).withdraw(toErc20(depositedLPTokenUser1));
      await (await stakingRewards_BDEUR_WETH.connect(testUser1).getReward()).wait();

      const secondsSinceLastReward = days*24*60*60;
      // const expectedReward = bdxPerSecond.mul(secondsSinceLastReward).mul(depositedLPTokenUser1).div(totalDepositedLpTokens);
      const expectedReward = bdxPerSecond.mul(secondsSinceLastReward).mul(depositedLPTokenUser1*10).div(depositedLPTokenUser1*10+depositedLPTokenUser2);
      const bdxReward = await bdx.balanceOf(testUser1.address);
      
      console.log("Expected: "+ expectedReward);
      console.log("Actual: "+ bdxReward);

      expect(bdxReward).to.eq(expectedReward);
    });
  })
});