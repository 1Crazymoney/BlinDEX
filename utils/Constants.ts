import { to_d18 } from "./Helpers";

export const wETH_address = <any>{
    localhost: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    mainnetFork: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    rinkeby: '0xc778417e063141139fce010982780140aa0cd5ab',
    kovan: '0xd0a1e359811322d97991e03f863a0c30c2cf029c'
};
export const wBTC_address = <any>{
    localhost: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    mainnetFork: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    rinkeby: '0xc778417e063141139fce010982780140aa0cd5ab',
    kovan: '0xCf516441828895f47aA02C335b6c0d37F9B7c3C2',
};

export const EUR_USD_CHAINLINK_FEED = <any>{
    localhost: "0xb49f677943BC038e9857d61E7d053CaA2C1734C1",
    mainnetFork: "0xb49f677943BC038e9857d61E7d053CaA2C1734C1",
    rinkeby: "0x78F9e60608bF48a1155b4B2A5e31F32318a1d85F",
    kovan: "0x0c15Ab9A0DB086e062194c273CC79f41597Bbf13",
};
export const ETH_USD_CHAINLINK_FEED = <any>{
    localhost: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    mainnetFork: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    rinkeby: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
    kovan: "0x9326BFA02ADD2366b30bacB125260Af641031331",
};
export const BTC_USD_CHAINLINK_FEED = <any>{
    localhost: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
    mainnetFork: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
    rinkeby: "0xECe365B379E1dD183B20fc5f022230C044d51404",
    kovan: "0x6135b13325bfC4B00278B4abC5e20bbce2D6580e",
};
export const BTC_ETH_CHAINLINK_FEED = <any>{
    localhost: "0xdeb288F737066589598e9214E782fa5A8eD689e8",
    mainnetFork: "0xdeb288F737066589598e9214E782fa5A8eD689e8",
    rinkeby: "0x2431452A0010a43878bF198e170F6319Af6d27F4",
    kovan: "0xF7904a295A029a3aBDFFB6F12755974a958C7C25",
};

export const uniswapFactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
export const uniswapRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'

export const numberOfLPs = 11;

export const initalBdStableToOwner_d18 = <any>{
    localhost: to_d18(10000),
    mainnetFork: to_d18(10000),
    rinkeby: to_d18(10000),
    kovan: to_d18(10000)
};