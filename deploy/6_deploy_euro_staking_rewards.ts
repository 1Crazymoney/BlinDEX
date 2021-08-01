import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { BDXShares } from '../typechain/BDXShares';
import { UniswapV2Factory } from '../typechain/UniswapV2Factory';
import { StakingRewards } from '../typechain/StakingRewards';
import * as constants from '../utils/Constants'
import { StakingRewardsDistribution } from '../typechain/StakingRewardsDistribution';
import { Timelock } from '../typechain/Timelock';

async function setupStakingContract(
  hre: HardhatRuntimeEnvironment,
  addressA: string,
  addressB: string,
  nameA: string,
  nameB: string,
  isTrueBdPool: boolean)
{
  const uniswapFactoryContract = await hre.ethers.getContract("UniswapV2Factory") as UniswapV2Factory;
  const pairAddress = await uniswapFactoryContract.getPair(addressA, addressB); 

  const stakingRewardsContractName = `StakingRewards_${nameA}_${nameB}`;

  const stakingRewards_ProxyDeployment = await hre.deployments.deploy(
    stakingRewardsContractName, {
    from: (await hre.getNamedAccounts()).DEPLOYER_ADDRESS,
    proxy: {
      proxyContract: 'OptimizedTransparentProxy',
    },
    contract: "StakingRewards",
    args: []
  });

  const stakingRewardsDistribution = await hre.ethers.getContract("StakingRewardsDistribution") as StakingRewardsDistribution;
  const stakingRewards_Proxy = await hre.ethers.getContract(stakingRewardsContractName) as StakingRewards;

  const [ deployer ] = await hre.ethers.getSigners();

  const timelock = await hre.ethers.getContract("Timelock") as Timelock;

  await (await stakingRewards_Proxy.initialize(
    pairAddress,
    timelock.address,
    stakingRewardsDistribution.address,
    isTrueBdPool)).wait();

  await (await stakingRewardsDistribution.connect(deployer).registerPools([<string>stakingRewards_ProxyDeployment.address], [1e6])).wait();

  console.log(`${stakingRewardsContractName} deployed to proxy:`, stakingRewards_ProxyDeployment.address);
  console.log(`${stakingRewardsContractName} deployed to impl: `, stakingRewards_ProxyDeployment.implementation);
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const networkName = hre.network.name;
  const [ deployer ] = await hre.ethers.getSigners();
  
  const bdeur = await hre.deployments.get('BDEUR');
  const bdx = await hre.ethers.getContract("BDXShares") as BDXShares;

  //todo ag set true pools rewards proportions

  console.log("Setting up staking contracts");

  await setupStakingContract(hre, bdx.address, constants.wETH_address[networkName], "BDX", "WETH", false);
  console.log("Set up statking: BDX/WETH");

  await setupStakingContract(hre, bdx.address, constants.wBTC_address[networkName], "BDX", "WBTC", false);
  console.log("Set up statking: BDX/WBTC");

  await setupStakingContract(hre, bdx.address, bdeur.address, "BDX", "BDEUR", true);
  console.log("Set up statking: BDX/BDEUR");

  await setupStakingContract(hre, bdeur.address, constants.wETH_address[networkName], "BDEUR", "WETH", false);
  console.log("Set up statking: BDEUR/WETH");

  await setupStakingContract(hre, bdeur.address, constants.wBTC_address[networkName], "BDEUR", "WBTC", false);
  console.log("Set up statking: BDEUR/WBTC");

  console.log("Bdx shares connected with StakingRewards");

	// One time migration
	return true;
};
func.id = __filename
func.tags = ['StakingRewards'];
func.dependencies = ['LiquidityPools', 'StakingRewardsDistribution'];
export default func;