import { TransactionConfig } from "web3-eth";
import { expect } from "@jest/globals";

import * as Eulith from "../../src/index";
import { waitForAce } from "./ace";

export async function runOneSwap({
    provider,
    recipient,
    routeThrough,
    signer,
    atomic = true,
    ace = false
}: {
    provider: Eulith.Provider;
    recipient?: string;
    routeThrough?: Eulith.Swaps.Provider;
    signer: Eulith.Signing.ICryptographicSigner | Eulith.Signing.SigningService;
    atomic?: boolean;
    ace?: boolean;
}): Promise<void> {
    const address = signer.address;

    const sellAmt = 0.00001;

    const weth = (await Eulith.Tokens.getTokenContract({
        provider,
        symbol: Eulith.Tokens.Symbols.WETH
    })) as Eulith.Contracts.WethTokenContract;
    const uni = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.UNI });

    const params: Eulith.Swaps.Request = new Eulith.Swaps.Request({
        sellToken: weth,
        buyToken: uni,
        sellAmount: sellAmt,
        recipient: recipient,
        routeThrough: routeThrough
    });
    const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedAddress: address });

    const balanceBeforeDeposit = await weth.balanceOf(address);
    const depositAmount = 2.0;

    await weth
        .deposit(new Eulith.Tokens.Value.ETH(depositAmount), {
            gas: 100000
        })
        .signAndSendAndWait(signer, provider);

    const balanceAfterDeposit = await weth.balanceOf(address);
    expect(balanceAfterDeposit.asFloat - balanceBeforeDeposit.asFloat).toBeCloseTo(depositAmount);

    // make sure the contract owns sufficient WETH
    // (NOTE differs from python in that it waits on the transaction)
    await weth
        .transfer(agentContractAddress, new Eulith.Tokens.Value.ETH(sellAmt), { from: address, gas: 100000 })
        .signAndSendAndWait(signer, provider);

    const contractSellBalance = await weth.balanceOf(agentContractAddress);
    expect(contractSellBalance.asFloat).toBeCloseTo(sellAmt);

    const target = recipient ?? address;

    const prevBuyBalance = await uni.balanceOf(target);
    expect(prevBuyBalance.asFloat).toBeCloseTo(0, 1); // assert prevBuyBalance == 0  # test not idempotent because can't replay the canned txs response from the server

    const atomicTx =
        atomic == true ? new Eulith.AtomicTx.Transaction({ provider, signer, accountAddress: address }) : null;

    const ew3 = new Eulith.Web3({ provider: atomicTx?.provider ?? provider, signer });

    if (ace) {
        await waitForAce(ew3, signer.address);
    }

    const swp: [number, TransactionConfig[]] = await ew3.eulithSwapQuote(params);
    const price = swp[0];
    const txs = swp[1];
    if (atomicTx) {
        await atomicTx.addTransactions(txs);

        let txHash;
        if (ace) {
            txHash = await atomicTx.commitForAce();
        } else {
            const combinedTransactionAsTxParams = await atomicTx.commit();
            combinedTransactionAsTxParams.gas = 1000000;
            txHash = await provider.signAndSendTransaction(combinedTransactionAsTxParams, signer);
        }
        await ew3.eth.getTransactionReceipt(txHash);
    } else {
        await ew3.eulithSendMultiTransaction(txs);
    }

    const measured_amount = parseFloat(await uni.native.methods.balanceOf(target).call()) / 1000000000000;

    const sellAmtInWei = Math.round(sellAmt * 1e18); // @todo lose this - convert to just new Eulith.Tokens.Value stuff
    const expectedAmount = sellAmtInWei / price / 1000000000000;

    expect(measured_amount).toBeCloseTo(expectedAmount, 0);
}

export async function runOneCallToSwap({
    provider,
    recipient,
    routeThrough,
    liquiditySource,
    slippageTolerance,
    signer
}: {
    provider: Eulith.Provider;
    recipient?: string;
    routeThrough?: Eulith.Swaps.Provider;
    liquiditySource?: Eulith.Swaps.LiquiditySource;
    slippageTolerance?: number;
    signer: Eulith.Signing.ICryptographicSigner;
}): Promise<void> {
    const ew3 = new Eulith.Web3({ provider, signer: signer });

    const sellAmt = 0.00001;

    const weth = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });
    const uni = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.UNI });

    const params: Eulith.Swaps.Request = new Eulith.Swaps.Request({
        sellToken: weth,
        buyToken: uni,
        sellAmount: sellAmt,
        recipient: recipient,
        routeThrough: routeThrough,
        slippageTolerance: slippageTolerance,
        liquiditySource: liquiditySource
    });
    await ew3.eulithSwapQuote(params);
}
