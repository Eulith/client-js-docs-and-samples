import { expect, it } from "@jest/globals";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";

const provider = commonConfig.provider;

// All these tests require running devrpc

it("testShortOnOffRequest", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });
  const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });
  const collateralToken = (await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.USDC
  })) as Eulith.Contracts.ERC20TokenContract;

  const shortToken = (await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.WETH
  })) as Eulith.Contracts.WethTokenContract;

  const collateralAmount = 100;

  expect(
    new Eulith.Tokens.Value.ERC20({
      v: collateralAmount * 1.2,
      contract: collateralToken
    }).asFloat
  ).toBeCloseTo(collateralToken.asTokenValue(collateralAmount * 1.2).asFloat);

  await collateralToken
    .transfer(agentContractAddress, collateralToken.asTokenValue(collateralAmount * 1.2), { from: acct.address })
    .signAndSendAndWait(acct, provider);

  const contractBalance = await collateralToken.native.methods.balanceOf(agentContractAddress).call();
  expect(parseInt(contractBalance) >= collateralAmount * 10 ** collateralToken.decimals).toBeTruthy();

  const atomicTx = new Eulith.AtomicTx.Transaction({ provider: ew3, signer: acct });
  const eulithShortAPI = new Eulith.Shorts({ atomicTx: atomicTx });
  const leverage = await eulithShortAPI.shortOn({
    collateralToken,
    shortToken,
    collateralAmount
  });
  expect(leverage > 4).toBeTruthy();

  const txReceipt = await atomicTx.commitAndSendAndWait({
    extraTXParams2Merge: { gas: 1000000 },
    timeoutMS: 30 * 1000
  });
  expect(txReceipt.status).toBeTruthy();

  const testShortOff = async (trueForUnwind: boolean) => {
    const atomicTx = new Eulith.AtomicTx.Transaction({ provider: ew3, signer: acct });
    const eulithShortAPI = new Eulith.Shorts({ atomicTx: atomicTx });
    const releasedCollateral = await eulithShortAPI.shortOff({
      collateralToken: collateralToken,
      shortToken: shortToken,
      repayShortAmount: 0.01,
      trueForUnwindA: trueForUnwind
    });
    expect(releasedCollateral > 10).toBeTruthy();
    const txReceipt = await atomicTx.commitAndSendAndWait({
      timeoutMS: 10 * 1000,
      extraTXParams2Merge: { gas: 1000000 }
    });
    expect(txReceipt.status).toBeTruthy();
  };

  await testShortOff(true);
  await testShortOff(false);
});
