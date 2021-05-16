import hre from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ChainlinkBasedCryptoFiatFeed } from '../../typechain/ChainlinkBasedCryptoFiatFeed';
import cap from "chai-as-promised";

import { bigNumberToDecmal } from "../../utils/Helpers";

chai.use(cap);

chai.use(solidity);
const { expect } = chai;

describe("Chainlink besed Oracles", () => {
    before(async () => {
        await hre.deployments.fixture();
    });

    it("should get eth/eur price", async () => {
        const ownerUser = await hre.ethers.getNamedSigner('POOL_CREATOR');
        
        const chainlinkBasedCryptoFiatFeed_ETH_EUR = await hre.ethers.getContract(
            'ChainlinkBasedCryptoFiatFeed_WETH_EUR', 
            ownerUser) as unknown as ChainlinkBasedCryptoFiatFeed;;

        const price = await chainlinkBasedCryptoFiatFeed_ETH_EUR.getPrice_1e12();
        
        const priceDecimal = bigNumberToDecmal(price, 12);

        console.log("ETH/EUR price: " + priceDecimal);

        expect(priceDecimal).to.be.gt(1000);
        expect(priceDecimal).to.be.lt(5000);
    })
})