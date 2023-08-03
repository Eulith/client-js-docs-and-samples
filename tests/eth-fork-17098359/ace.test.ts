import { expect, it } from "@jest/globals";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";
import { waitForAce } from "../fixture/ace";

const provider = commonConfig.provider;

it("testCommitForAce", async () => {
  const ownerAccount = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });

  const armorAgent = await Eulith.OnChainAgents.armorAgent({
    provider,
    authorizedSigner: ownerAccount
  });

  const ew3 = new Eulith.Web3({ provider, signer: ownerAccount });
  const safeBalance = BigInt(await ew3.eth.getBalance(armorAgent.safeAddress));
  expect(safeBalance).toBeGreaterThanOrEqual(BigInt(1));

  await waitForAce(ew3, ownerAccount.address);

  const atomicTx = new Eulith.AtomicTx.Transaction({
    provider: ew3,
    signer: ownerAccount,
    gnosis: armorAgent.safeAddress
  });
  const recipientAddress = "0x8Ef090678C0B80F6F4aD8B5300Ccd41d22940968";
  await atomicTx.addTransaction({
    from: ownerAccount.address,
    to: recipientAddress,
    value: 1
  });

  const commitTxHash = await atomicTx.commitForAce();
  await Eulith.Utils.waitForTxReceipt({ provider, txHash: commitTxHash });

  const recipientBalance = BigInt(await ew3.eth.getBalance(recipientAddress));
  expect(recipientBalance).toEqual(BigInt(1));
});

it("testUniswapLimitOrder", async () => {
  const ownerAccount = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });

  const borrowTokenA = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });
  const borrowTokenB = (await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.WETH
  })) as Eulith.Contracts.WethTokenContract;

  const swapPool = await Eulith.Uniswap.getSwapPool({
    request: {
      tokenContracts: [borrowTokenA, borrowTokenB],
      fee: Eulith.Uniswap.PoolFee.ThirtyBips
    },
    provider
  });

  const sellAmount = 10.0;
  const balance = await borrowTokenA.balanceOf(ownerAccount.address);
  expect(balance.asFloat).toBeGreaterThanOrEqual(sellAmount);

  const request = {
    price: 0,
    tick_upper: null,
    tick_lower: null,
    sell_amount: sellAmount,
    sell_token: borrowTokenA.address,
    pool_address: swapPool.address
  };
  const createResponse = await Eulith.Uniswap.V3.createLimitOrder(provider, request);
  expect(createResponse.actualSellAmount).toEqual(sellAmount);
  expect(createResponse.order.sellZero).toBeTruthy();

  const ew3 = new Eulith.Web3({ provider, signer: ownerAccount });
  await waitForAce(ew3, ownerAccount.address);

  const atomicTransaction = new Eulith.AtomicTx.Transaction({
    provider: ew3,
    signer: ownerAccount
  });

  const addResponse = await Eulith.Uniswap.V3.addLimitOrderToAtomicTx(provider, atomicTransaction, createResponse.order, swapPool.address);
  expect(addResponse.orderId).toBeGreaterThanOrEqual(0);

  const commitTxHash = await atomicTransaction.commitForAce();
  await Eulith.Utils.waitForTxReceipt({ provider, txHash: commitTxHash });

  const submitMintHashResponse = await Eulith.Uniswap.V3.submitMintHash(provider, addResponse.orderId, commitTxHash, null);
  expect(submitMintHashResponse).toBeTruthy();

  const orders = await Eulith.Uniswap.V3.getLimitOrders(provider);
  expect(orders).toHaveLength(1);
  expect(orders[0].orderId).toEqual(addResponse.orderId);
  expect(orders[0].status).toEqual("confirmed");

  const confirmedOrder = await Eulith.Uniswap.V3.confirmLimitOrder(provider, addResponse.orderId);
  expect(confirmedOrder.orderId).toEqual(addResponse.orderId);
  expect(confirmedOrder.status).toEqual("confirmed");
});
