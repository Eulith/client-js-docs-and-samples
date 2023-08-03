import { expect, it } from "@jest/globals";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";

const provider = commonConfig.provider;

// All these tests require running devrpc

it("testDepositWithdrawWeth", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const web3 = new Eulith.Web3({ provider, signer: acct });
  const wethContract = (await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.WETH
  })) as Eulith.Contracts.WethTokenContract;

  const startingBalance = await wethContract.balanceOf(acct.address);

  await wethContract
    .deposit(new Eulith.Tokens.Value.ETH(1.0), {
      from: acct.address
    })
    .signAndSendAndWait(acct, provider);

  const afterDepositBalance = await wethContract.balanceOf(acct.address);
  expect(afterDepositBalance.asFloat - startingBalance.asFloat).toBeCloseTo(1.0);

  const beforeWithdrawETHBal = new Eulith.Tokens.Value.ETH(await web3.eth.getBalance(acct.address));

  await wethContract
    .withdraw(new Eulith.Tokens.Value.ETH(1.0), {
      from: acct.address
    })
    .signAndSendAndWait(acct, provider);

  const afterWithdrawETHBal = new Eulith.Tokens.Value.ETH(await web3.eth.getBalance(acct.address));
  const afterWithdrawBalance = await wethContract.balanceOf(acct.address);

  expect(afterWithdrawBalance.asFloat - startingBalance.asFloat).toBeCloseTo(0);
  expect(afterWithdrawETHBal.asFloat - beforeWithdrawETHBal.asFloat).toBeCloseTo(1);
});
