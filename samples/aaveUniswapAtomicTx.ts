import { TransactionReceipt } from "web3-core";
import * as Eulith from "eulith-web3js";
import { printBanner } from "./banner";

import config from "./commonConfiguration";

const eulithAuth = Eulith.Auth.fromToken(config.token);

// Start creating a Eulith provider (like web3js provider) object, which can be used with web3js (and
// Eulith APIs to communicate with the ethereum network. This handles authentication, and networking
const provider = new Eulith.Provider({
  network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
  auth: eulithAuth
});

// Sample account/signer to test with
// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });
const signer =  Eulith.Signing.SigningService.assure(acct, provider);

async function exampleAaveUniswapAtomicTx() {
  /**
   This sample does a complex atomic transaction to demonstrate the capability of this technology.
   In the code that follows, we will construct and execute a transaction that:

   1. Deposits some WETH as collateral into Aave
   2. Borrows USDC against that collateral
   3. Mints a Uniswap LP position with that USDC

   This samples assumes you are running against Aave V2 markets on ETH mainnet.
   This assumption is trivial to change by adjusting the Eulith.Provider.network above
   and the aavePool address below.

   Please get in touch with engineers@eulith.com if you have any questions.
   */
  printBanner();

  console.log("Starting Aave & Uniswap example atomic transaction...");

  // This is the lending pool address for ETH mainnet
  const aavePool = new Eulith.Contracts.AaveLendingPoolV2(provider, "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9")

  const weth = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });
  const usdc = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });

  // You need to have DeFi Armor set up ahead of time to run this sample.
  const armorAgent = await Eulith.OnChainAgents.armorAgent({ provider, authorizedAddress: acct.address });
  if (armorAgent === undefined) {
    throw new Error(`could not find armor agent for authorized trading key ${acct.address}`);
  }

  // Start an Atomic Transaction
  const atomicTransaction = new Eulith.AtomicTx.Transaction({
    provider,
    signer,
    tradingKeyAddress: acct.address,
    safeAddress: armorAgent.safeAddress
  });

  const depositAmount = weth.asTokenValue("100000000000000000"); // 0.1 WETH
  const borrowAmount = usdc.asTokenValue("10000000"); // 10 USDC

  const approvePoolTx = weth.approve(aavePool.address, depositAmount);
  await atomicTransaction.addTransaction(approvePoolTx);

  const depositTx = aavePool.deposit(weth.address, depositAmount.asFundamentalBN, armorAgent.safeAddress, 0);
  await atomicTransaction.addTransaction(depositTx);

  const borrowTx = aavePool.borrow(usdc.address, borrowAmount.asFundamentalBN, 1, 0, armorAgent.safeAddress);
  await atomicTransaction.addTransaction(borrowTx);

  const usdcWethPool = await Eulith.Uniswap.getSwapPool({
    request: {
      tokenContracts: [weth, usdc],
      fee: Eulith.Uniswap.PoolFee.ThirtyBips
    },
    provider
  });

  // We handle the Uniswap math for you
  // If you prefer to pass exact values for minting (liquidity, ticks, etc),
  // we have another endpoint for that.
  await usdcWethPool.mintByPrice({
    request: {
      priceLower: 1400,
      priceUpper: 1600,
      priceDenominatedInToken: usdc.address,
      amountZero: 1, // 1.0 usdc
      amountOne: 0
    },
    parentTransaction: atomicTransaction
  });

  const txReceipt: TransactionReceipt = await atomicTransaction.commitAndSendAndWait();

  console.log(`Transaction hash: ${txReceipt.transactionHash}`);
}

(async () => {
  try {
    await exampleAaveUniswapAtomicTx();
  } catch (error) {
    console.error("error: ", error);
  }
})();
