import { expect, it } from "@jest/globals";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";

const logger = commonConfig.logger;
const provider = commonConfig.provider;

// All these tests require running devrpc

it("testStartAaveV3Loan", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });

  const borrowTokenA = await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.USDC
  });
  const borrowTokenB = (await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.WETH
  })) as Eulith.Contracts.WethTokenContract;

  const borAmtA = 10;
  const borAmtB = 1;

  await borrowTokenA
    .transfer(agentContractAddress, borrowTokenA.asTokenValue(borAmtA * 1.2), { from: acct.address, gas: 100000 })
    .signAndSendAndWait(acct, provider);
  await borrowTokenB
    .transfer(agentContractAddress, borrowTokenB.asTokenValue(borAmtB * 1.2), { from: acct.address, gas: 100000 })
    .signAndSendAndWait(acct, provider);

  const contractBalanceABefore = BigInt(await borrowTokenA.native.methods.balanceOf(agentContractAddress).call());
  const contractBalanceBBefore = BigInt(await borrowTokenB.native.methods.balanceOf(agentContractAddress).call());

  const atomicTx = new Eulith.AtomicTx.Transaction({
    provider: ew3,
    signer: acct,
    agentContractAddress
  });

  const flashLoan: Eulith.FlashLiquidity = await Eulith.FlashLiquidity.start({
    parentTx: atomicTx,
    loan: new Eulith.Aave.LoanRequest({
      tokens: [
        { token: borrowTokenA, amount: borAmtA },
        { token: borrowTokenB, amount: borAmtB }
      ]
    })
  });

  logger.debug(`flashLoan fees: ${flashLoan.feeAmt.map((a) => a.asDisplayString).join()}`);

  await flashLoan.commit();

  const txReceipt = await atomicTx.commitAndSendAndWait({
    timeoutMS: 10 * 1000,
    extraTXParams2Merge: { gas: 1000000 }
  });

  expect(txReceipt.status).toBeTruthy();

  const contractABalanceAfter = BigInt(await borrowTokenA.native.methods.balanceOf(agentContractAddress).call());
  expect(contractABalanceAfter - contractBalanceABefore == BigInt(-9000)).toBeTruthy(); // the fee for taking an aave loan

  const contractBBalanceAfter = BigInt(await borrowTokenB.native.methods.balanceOf(agentContractAddress).call());
  expect(contractBBalanceAfter - contractBalanceBBefore == BigInt(-900000000000000)).toBeTruthy(); // the fee for taking an aave loan
});
