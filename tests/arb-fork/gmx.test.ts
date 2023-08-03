import { expect, it } from "@jest/globals";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";

const logger = new Eulith.Logging.PinoLogger(commonConfig.logger);
const provider = commonConfig.arbProvider;

// All these tests require running devrpc on the Arbitrum fork

it("testGmxSwap", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const wethToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });
  const usdcToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });

  const wethBalanceBefore = await wethToken.balanceOf(acct.address);
  const amountIn = 10;
  const swap = await Eulith.Gmx.swap(ew3, acct, {
    sellToken: usdcToken.address,
    buyToken: wethToken.address,
    amountIn,
    slippage: 0.01,
    approveErc: true
  });

  const swapTxReceipt = await provider.signAndSendTransactionAndWait(swap.tx, acct);
  expect(swapTxReceipt.status).toBeTruthy();

  const wethBalanceAfter = await wethToken.balanceOf(acct.address);
  const diff = wethBalanceAfter.asFloat - wethBalanceBefore.asFloat;
  const expectedDiff = amountIn / swap.price;

  const feeAsPercentOfOutput = (swap.fee / expectedDiff) * 100;
  // according to GMX docs, fee should be 0.2% to 0.8% of the output
  // https://gmxio.gitbook.io/gmx/trading
  expect(feeAsPercentOfOutput).toBeGreaterThan(0.2);
  expect(feeAsPercentOfOutput).toBeLessThan(0.8);

  expect(expectedDiff - diff).toBeLessThan(1e-10);
});

it("testGetGmxPositions", async () => {
  const wethToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });
  const positions = await Eulith.Gmx.getPositions(provider, "0x0CE3977D1707fe3954372877A6AE24075b4A78f4", [{
    collateralToken: wethToken.address,
    indexToken: wethToken.address,
    isLong: true
  }]);

  // These magic numbers are from the block number 76115108
  const position = positions[0];
  expect(position.collateralTokenAddress).toEqual(wethToken.address.toLowerCase());
  expect(position.indexTokenAddress).toEqual(wethToken.address.toLowerCase());
  expect(position.positionSizeDenomUsd).toBeCloseTo(54.74, 2);
});

it("testMintAndRedeemGlp", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const wethToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });

  const balanceBefore = await Eulith.Gmx.getStakedGlpBalance(ew3, acct.address);
  const mintGlpResponse = await Eulith.Gmx.mintGlp(ew3, acct, wethToken, 1);

  for (const tx of mintGlpResponse.txs) {
    const txReceipt = await ew3.provider.signAndSendTransactionAndWait(tx, acct);
    expect(txReceipt.status).toBeTruthy();
  }

  const balanceAfter = await Eulith.Gmx.getStakedGlpBalance(ew3, acct.address);
  expect(balanceAfter - balanceBefore).toBeCloseTo(mintGlpResponse.minGlp, 3);

  const wethBalanceBeforeRedeem = await wethToken.balanceOf(acct.address);

  const redeemAmount = BigInt(1000.0);
  const minReceiveToken = 0.5;
  const redeemGlpTx = await Eulith.Gmx.redeemGlp(ew3, acct, { receiveToken: wethToken, glpAmount: redeemAmount, minReceiveToken });
  const redeemGlpTxReceipt = await provider.signAndSendTransactionAndWait(redeemGlpTx, acct);
  expect(redeemGlpTxReceipt.status).toBeTruthy();

  const balanceAfterRedeem = await Eulith.Gmx.getStakedGlpBalance(ew3, acct.address);
  expect(BigInt(balanceAfter - balanceAfterRedeem)).toEqual(redeemAmount);

  const wethBalanceAfterRedeem = await wethToken.balanceOf(acct.address);
  expect(wethBalanceAfterRedeem.asFloat - wethBalanceBeforeRedeem.asFloat).toBeGreaterThan(minReceiveToken);
});

it("testIncreaseDecreaseGmxPosition", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const wethToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });

  const increaseTxHash = await Eulith.Gmx.increasePosition(ew3, acct, {
    positionToken: wethToken,
    collateralToken: wethToken,
    trueForLong: true,
    collateralAmountIn: 1,
    leverage: 5.0,
    approveErc: true
  });
  const increaseTxReceipt = await Eulith.Utils.waitForTxReceipt({ logger, web3: ew3, txHash: increaseTxHash });
  expect(increaseTxReceipt.status).toBeTruthy();

  // GMX uses an off-chain service to periodically trigger execution of
  // positions, which we don't simulate in these tests, so there isn't anything
  // interesting we can assert on here.
  const positions = await Eulith.Gmx.getPositions(provider, acct.address, [{
    collateralToken: wethToken.address,
    indexToken: wethToken.address,
    isLong: true
  }]);
  expect(positions).toHaveLength(1);

  const decreaseTxHash = await Eulith.Gmx.decreasePosition(ew3, acct, {
    positionToken: wethToken,
    collateralToken: wethToken,
    trueForLong: true,
    decreaseCollateral: 0.5,
    decreaseExposure: 2
  });
  const decreaseTxReceipt = await Eulith.Utils.waitForTxReceipt({ logger, web3: ew3, txHash: decreaseTxHash });
  expect(decreaseTxReceipt.status).toBeTruthy();
});

it("testGmxLimitOrders", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const wethToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });

  const increaseTxHash = await Eulith.Gmx.createIncreaseOrder(ew3, acct, {
    positionToken: wethToken,
    payToken: wethToken,
    trueForLong: true,
    amountIn: 1.0,
    sizeDeltaUsd: 2.0,
    limitPriceUsd: 1500,
    approveErc: true
  });
  const increaseTxReceipt = await Eulith.Utils.waitForTxReceipt({ logger, web3: ew3, txHash: increaseTxHash });
  expect(increaseTxReceipt.status).toBeTruthy();

  const decreaseTxHash = await Eulith.Gmx.createDecreaseOrder(ew3, acct, {
    positionToken: wethToken,
    collateralToken: wethToken,
    sizeDeltaUsd: 50,
    collateralDeltaUsd: 50,
    trueForLong: true,
    limitPriceUsd: 2000
  });
  const decreaseTxReceipt = await Eulith.Utils.waitForTxReceipt({ logger, web3: ew3, txHash: decreaseTxHash });
  expect(decreaseTxReceipt.status).toBeTruthy();
});
