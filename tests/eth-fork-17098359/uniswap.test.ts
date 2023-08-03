import { expect, it } from "@jest/globals";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";
import { TransactionReceipt } from "web3-core";
import Web3 from "web3";

const logger = commonConfig.logger;
const provider = commonConfig.provider;

// All these tests require running devrpc

it("testStartUniswapV3Loan", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });
  const borrowTokenContractA = await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.USDC
  });
  const borrowTokenContractB = await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.WETH
  });

  const borrowAmountA = 10;
  const borrowAmountB = 3;

  await borrowTokenContractA
    .approve(agentContractAddress, borrowTokenContractA.asTokenValue(borrowAmountA * 1.2), { from: acct.address })
    .signAndSendAndWait(acct, provider);

  await borrowTokenContractB
    .approve(agentContractAddress, borrowTokenContractB.asTokenValue(borrowAmountB * 1.2), { from: acct.address })
    .signAndSendAndWait(acct, provider);

  const contractBalanceABefore = await borrowTokenContractA.balanceOf(agentContractAddress);
  const contractBalanceBBefore = await borrowTokenContractB.balanceOf(agentContractAddress);

  const atomicTx = new Eulith.AtomicTx.Transaction({ provider: ew3, signer: acct });
  const flashLoan: Eulith.FlashLiquidity = await Eulith.FlashLiquidity.start({
    parentTx: atomicTx,
    loan: new Eulith.Uniswap.LoanRequest({
      borrowTokenA: borrowTokenContractA,
      borrowAmountA: borrowAmountA,
      borrowTokenB: borrowTokenContractB,
      borrowAmountB: borrowAmountB,
      payTransferFrom: acct.address,
      recipient: agentContractAddress
    })
  });

  logger.debug(`flashLoan fees: ${flashLoan.feeAmt.map((a) => a.asDisplayString).join()}`);

  const txCount = await flashLoan.commit();
  expect(txCount).toBeCloseTo(1);

  const txReceipt = await atomicTx.commitAndSendAndWait({
    timeoutMS: 10 * 1000
  });
  expect(txReceipt.status).toBeTruthy();

  const contractABalanceAfter = await borrowTokenContractA.balanceOf(agentContractAddress);
  expect(contractABalanceAfter.asFloat - contractBalanceABefore.asFloat).toBeCloseTo(borrowAmountA);
  const contractBalanceBAfter = await borrowTokenContractB.balanceOf(agentContractAddress);
  expect(contractBalanceBAfter.asFloat - contractBalanceBBefore.asFloat).toBeCloseTo(borrowAmountB);
});

it("testStartUniswapV3Swap", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });
  const tokenA = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });
  const tokenB = (await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.WETH
  })) as Eulith.Contracts.WethTokenContract;

  const sellAmount = 10;

  const buyBalanceBefore = await tokenB.balanceOf(agentContractAddress);

  await tokenA
    .approve(agentContractAddress, tokenA.asTokenValue(sellAmount * 1.2), { from: acct.address })
    .signAndSendAndWait(acct, provider);

  const quote = await Eulith.Uniswap.getBestPriceQuote({
    swapQuoteRequest: { sellToken: tokenA, buyToken: tokenB, amount: sellAmount },
    payTransferFrom: acct.address,
    provider
  });

  const atomicTx = new Eulith.AtomicTx.Transaction({ provider: ew3, signer: acct });
  const swapAtomicTx: Eulith.AtomicTx.NestedTransaction = await Eulith.Uniswap.startSwap({
    request: quote.swapRequest,
    parentTx: atomicTx
  });
  const txCount = await swapAtomicTx.commit();
  expect(txCount).toBeCloseTo(1);
  const txReceipt: TransactionReceipt = await atomicTx.commitAndSendAndWait();
  expect(txReceipt.status).toBeTruthy();

  const buyBalanceAfter = await tokenB.balanceOf(agentContractAddress);
  expect(Math.round(buyBalanceAfter.asFloat - buyBalanceBefore.asFloat)).toEqual(
    Math.round(sellAmount / quote.price)
  );
});

it("testNestedTxs", async () => {
  /*  This is testing nested txs:
   *
   *      o   Start atomic tx and BORROW the money from Uniswap --> funds end up in the toolkit contract
   *      o   SWAP the borrowed money INSIDE the borrow tx --> funds end up in the toolkit contract
   *      o   PAY the loan with PAY TRANSFER FROM the wallet --> funds remain in the toolkit
   *
   */
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });
  const borrowTokenA = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });
  const borrowTokenB = (await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.WETH
  })) as Eulith.Contracts.WethTokenContract;

  const borAmtA = 100;
  const borAmtB = 3;

  // The x 1.2 here is so we pre-approve a bit more than we expect to take, so the
  // loan request succeeds (gas/fee).
  await borrowTokenA
    .approve(agentContractAddress, borrowTokenA.asTokenValue(borAmtA * 1.2), { from: acct.address })
    .signAndSendAndWait(acct, provider);
  await borrowTokenB
    .approve(agentContractAddress, borrowTokenB.asTokenValue(borAmtB * 1.2), { from: acct.address })
    .signAndSendAndWait(acct, provider);

  const contractBalanceABefore = BigInt(await borrowTokenA.native.methods.balanceOf(agentContractAddress).call());
  const contractBalanceBBefore = BigInt(await borrowTokenB.native.methods.balanceOf(agentContractAddress).call());

  const atomicTx = new Eulith.AtomicTx.Transaction({ provider: ew3, signer: acct });
  const flashLoan: Eulith.FlashLiquidity = await Eulith.FlashLiquidity.start({
    parentTx: atomicTx,
    loan: new Eulith.Uniswap.LoanRequest({
      borrowTokenA: borrowTokenA,
      borrowAmountA: borAmtA,
      borrowTokenB: borrowTokenB,
      borrowAmountB: borAmtB,
      payTransferFrom: acct.address,
      recipient: agentContractAddress
    })
  });
  expect(flashLoan.feePct).toEqual(0.0005);
  logger.debug(`flashLoan fees: ${flashLoan.feeAmt.map((a) => a.asDisplayString).join()}`);

  const swapPool = await Eulith.Uniswap.getSwapPool({
    request: {
      tokenContracts: [borrowTokenA, borrowTokenB],
      fee: Eulith.Uniswap.PoolFee.ThirtyBips
    },
    provider
  });

  const quote = await swapPool.getQuote({ sellToken: borrowTokenA, sellAmount: borAmtA });

  const swapAtomicTx: Eulith.AtomicTx.NestedTransaction = await Eulith.Uniswap.startSwap({
    request: quote.swapRequest,
    parentTx: atomicTx
  });
  expect(await swapAtomicTx.commit()).toEqual(0); // first tx in atomicTx
  expect(await flashLoan.commit()).toEqual(1); // second tx in atomicTx

  await atomicTx.commitAndSendAndWait();

  const contractBalanceAfter = BigInt(await borrowTokenA.native.methods.balanceOf(agentContractAddress).call());
  expect(contractBalanceAfter).toEqual(contractBalanceABefore); //  we swapped the full amount away

  const contractBBalanceAfter = BigInt(await borrowTokenB.native.methods.balanceOf(agentContractAddress).call());

  const t1 = Number(contractBBalanceAfter - contractBalanceBBefore) / 100;
  const t2 = (borAmtB * 10 ** borrowTokenB.decimals + (borAmtA / quote.price) * 10 ** borrowTokenB.decimals) / 100;
  expect(Math.round(t1)).toEqual(Math.round(t2));
});

it("testUniv3BestPriceQuote", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });
  const sellToken = await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.USDC
  });
  const buyToken = (await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.WETH
  })) as Eulith.Contracts.WethTokenContract;

  const sellAmount = 5;

  const contractBalanceBefore = BigInt(await buyToken.native.methods.balanceOf(agentContractAddress).call());

  const quote = await Eulith.Uniswap.getBestPriceQuote({
    swapQuoteRequest: {
      sellToken: sellToken,
      buyToken: buyToken,
      amount: sellAmount
    },
    provider
  });

  const doTransfer = async (token: Eulith.Contracts.ERC20TokenContract, amt: number) => {
    const oneWay = Math.random() <= 0.5; // try wrapper api and verify native still works too
    if (oneWay) {
      const tx = {
        to: token.options.address,
        data: token.native.methods
          .transfer(agentContractAddress, Web3.utils.numberToHex(amt * 1.05 * 10 ** token.decimals))
          .encodeABI(),
        from: acct.address
      };
      const txHash = await provider.signAndSendTransaction(tx, acct);
      const txReceipt: TransactionReceipt = await Eulith.Utils.waitForTxReceipt({
        web3: ew3,
        txHash: txHash
      });
      expect(txReceipt.status).toBeTruthy();
    } else {
      await token
        .transfer(agentContractAddress, token.asTokenValue(1.05), { from: acct.address })
        .signAndSendAndWait(acct, provider);
    }
  };

  await doTransfer(sellToken, sellAmount);

  const atomicTx = new Eulith.AtomicTx.Transaction({ provider: ew3, signer: acct });
  const swapAtomicTx: Eulith.AtomicTx.NestedTransaction = await Eulith.Uniswap.startSwap({
    request: quote.swapRequest,
    parentTx: atomicTx
  });
  const txCount = await swapAtomicTx.commit();
  expect(txCount == 1).toBeTruthy();

  const txReceipt: TransactionReceipt = await atomicTx.commitAndSendAndWait({
    timeoutMS: 10 * 1000
  });
  expect(txReceipt.status).toBeTruthy();

  const contractBalanceAfter = BigInt(await buyToken.native.methods.balanceOf(agentContractAddress).call());

  expect(Number(contractBalanceAfter - contractBalanceBefore) / 10 ** buyToken.decimals).toBeCloseTo(
    sellAmount / quote.price,
    6
  );
});

it("testFlashPayFlashLogicDifferentTokens", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });
  const payToken = await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.USDC
  });
  const takeToken = (await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.WETH
  })) as Eulith.Contracts.WethTokenContract;
  const takeAmount = 0.1;

  // # magic number math to cover enough USDC to pay back the ETH and max $1,500 per.
  const payAmount = takeAmount * 2000 * 1.2;

  // The x 1.2 here is so we pre-approve a bit more than we expect to take, so the
  // loan request succeeds (gas/fee).
  await payToken
    .approve(agentContractAddress, payToken.asTokenValue(payAmount * 1.2), { from: acct.address })
    .signAndSendAndWait(acct, provider);

  const atomicTx = new Eulith.AtomicTx.Transaction({ provider: ew3, signer: acct });
  const flashPay: Eulith.FlashLiquidity = await Eulith.FlashLiquidity.start({
    parentTx: atomicTx,
    takePay: {
      take: takeToken,
      pay: payToken,
      takeAmount: takeAmount,
      payTransferFrom: Web3.utils.toChecksumAddress(acct.address)
    }
  });

  expect(1000 < flashPay.price && flashPay.price < 2000).toBeTruthy(); // # assert price is reasonable
  expect(flashPay.feePct).toEqual(0.0005);

  const tx_num: number = await flashPay.commit();
  expect(tx_num).toEqual(1);

  // @todo REDO when we have a better 'contract subclass strategy' - takeTokenBalanceBefore = takeToken.balance_of_float(agentContractAddress)
  const takeTokenBalanceBefore = BigInt(await takeToken.native.methods.balanceOf(agentContractAddress).call());

  const txReceipt: TransactionReceipt = await atomicTx.commitAndSendAndWait({
    timeoutMS: 10 * 1000
  });
  expect(txReceipt.status).toBeTruthy();

  const takeTokenBalanceAfter = BigInt(await takeToken.native.methods.balanceOf(agentContractAddress).call());

  expect(Number(takeTokenBalanceAfter - takeTokenBalanceBefore) / 10 ** takeToken.decimals).toEqual(takeAmount);
});

it("testFlashPayFlashLogicSameTokens", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });
  const payToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });
  const takeAmount = 2;

  // The x 1.2 here is so we pre-approve a bit more than we expect to take, so the
  // loan request succeeds (gas/fee).
  await payToken
    .approve(agentContractAddress, payToken.asTokenValue(takeAmount * 1.2), { from: acct.address })
    .signAndSendAndWait(acct, provider);

  const atomicTx = new Eulith.AtomicTx.Transaction({ provider: ew3, signer: acct });
  const flashPay: Eulith.FlashLiquidity = await Eulith.FlashLiquidity.start({
    parentTx: atomicTx,
    takePay: {
      take: payToken,
      pay: payToken,
      takeAmount: takeAmount,
      payTransferFrom: Web3.utils.toChecksumAddress(acct.address)
    }
  });

  expect(flashPay.price).toBeCloseTo(1);
  expect(flashPay.feePct).toEqual(0.0005);

  const txNum: number = await flashPay.commit();
  expect(txNum).toEqual(1);

  // @todo REDO when we have a better 'contract subclass strategy' - takeTokenBalanceBefore = takeToken.balance_of_float(agentContractAddress)
  const takeTokenBalanceBefore = BigInt(await payToken.native.methods.balanceOf(agentContractAddress).call());

  const txReceipt: TransactionReceipt = await atomicTx.commitAndSendAndWait();
  expect(txReceipt.status).toBeTruthy();

  const takeTokenBalanceAfter = BigInt(await payToken.native.methods.balanceOf(agentContractAddress).call());

  expect(Number(takeTokenBalanceAfter - takeTokenBalanceBefore) / 10 ** payToken.decimals).toEqual(takeAmount);
});
