import * as Eulith from "eulith-web3js";

import config from "./commonConfiguration";
import { printBanner } from "./banner";

const eulithAuth = Eulith.Auth.fromRefreshToken(config.refreshToken);
const provider = new Eulith.Provider({
    network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
    auth: eulithAuth,
});

const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });

async function bestPrice() {
    const sellToken = await Eulith.Tokens.getTokenContract({
        provider,
        symbol: Eulith.Tokens.Symbols.USDC
    });

    const buyToken = (await Eulith.Tokens.getTokenContract({
        provider,
        symbol: Eulith.Tokens.Symbols.WETH
    })) as Eulith.Contracts.WethTokenContract;

    const sellAmount = 5;

    const agentContractAddress = await Eulith.OnChainAgents.contractAddress({
        provider,
        authorizedSigner: acct
    });

    const fundingContractBalance = await sellToken.balanceOf(acct.address);
    const proxyBalanceBefore = await buyToken.balanceOf(agentContractAddress);

    const addALittleForFees = 1;

    await sellToken
        .approve(agentContractAddress, sellToken.asTokenValue(sellAmount + addALittleForFees), {
            from: acct.address
        })
        .signAndSendAndWait(acct, provider);

    const quote = await Eulith.Uniswap.getBestPriceQuote({
        swapQuoteRequest: { sellToken: sellToken, buyToken: buyToken, amount: sellAmount },
        payTransferFrom: acct.address,
        provider
    });

    console.log(
        `Fees for this tranaction will be ${quote.feeAmt.asDisplayString}, and the price is ${quote.price} ${sellToken.symbol} per ${buyToken.symbol}`
    );

    const atomicTx = new Eulith.AtomicTx.Transaction({ provider, signer: acct });

    const swapAtomicTx: Eulith.AtomicTx.NestedTransaction = await Eulith.Uniswap.startSwap({
        request: quote.swapRequest,
        parentTx: atomicTx
    });

    await swapAtomicTx.commit(); // Commit the swap tx

    const txReceipt = await atomicTx.commitAndSendAndWait(); // Commit the parent tx

    console.log(`Swap tx receipt: ${txReceipt.transactionHash}\n`);

    console.log(
        `After swap: fundingContract DELTA: ${
            (await sellToken.balanceOf(acct.address)).asFloat - fundingContractBalance.asFloat
        } ${sellToken.symbol}, and toolkit contract's balance DELTA (how much we added) in the transaction: ${
            (await buyToken.balanceOf(agentContractAddress)).asFloat - proxyBalanceBefore.asFloat
        } ${buyToken.symbol}`
    );
}

(async () => {
    try {
        printBanner();

        await bestPrice();
    } catch (error) {
        console.error("error: ", error);
    }
})();
