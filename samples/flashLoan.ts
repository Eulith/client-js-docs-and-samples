import * as Eulith from "eulith-web3js";

import config from "./commonConfiguration";
import { printBanner } from "./banner";

const eulithAuth = Eulith.Auth.fromToken(config.refreshToken);

// Start creating a Eulith provider (like web3js provider) object, which can be used with web3js (and
// Eulith APIs to communicate with the ethereum network. This handles authentication, and networking
const provider = new Eulith.Provider({
    network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
    auth: eulithAuth
});

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });
const signer = Eulith.Signing.SigningService.assure(acct, provider);

async function exampleFlash() {
    console.log(`Running from wallet: ${acct.address}`);

    // We're going to PAY USDC
    const payTokenContract = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });

    // We're going to Flash borrow WETH
    const takeTokenContract = (await Eulith.Tokens.getTokenContract({
        provider,
        symbol: Eulith.Tokens.Symbols.WETH
    })) as Eulith.Contracts.WethTokenContract;

    const takeAmount = 0.1;
    const payAmount = takeAmount * 2000 + 600; // Assume $2,000 per WETH + plenty extra for fees (just for this example, real fees are not that high!)

    const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: signer });

    await payTokenContract
        .approve(agentContractAddress, payTokenContract.asTokenValue(payAmount * 1.2), { from: acct.address })
        .signAndSendAndWait(acct, provider);

    const atomicTx = new Eulith.AtomicTx.Transaction({ provider, signer: signer });

    const flashPay: Eulith.FlashLiquidity = await Eulith.FlashLiquidity.start({
        parentTx: atomicTx,
        takePay: {
            take: takeTokenContract,
            pay: payTokenContract,
            takeAmount: takeAmount,
            payTransferFrom: acct.address,
            recipient: agentContractAddress
        }
    });

    // You'll get a price and fee for the transaction
    // If PAY and TAKE are the same token, the price is 1.0
    // The fee is ONLY the Uniswap or Aave fee. Eulith does not take a fee here.
    console.log(
        `Price: ${flashPay.price}, fee: ${flashPay.feePct}% (aka ${flashPay.feeAmt
            .map((a) => a.asDisplayString)
            .join(",")})`
    );

    await flashPay.commit();

    const payTokenBalanceBefore = await payTokenContract.balanceOf(acct.address);
    const takeTokenBalanceBefore = await takeTokenContract.balanceOf(agentContractAddress);

    await atomicTx.commitAndSendAndWait({
        timeoutMS: 10 * 1000,
        extraTXParams2Merge: { gas: 1000000 }
    });

    const payTokenBalanceAfter = await payTokenContract.balanceOf(acct.address);
    const takeTokenBalanceAfter = await takeTokenContract.balanceOf(agentContractAddress);

    console.log(
        `PayToken (USDC) Balance: Before Transaction: ${payTokenBalanceBefore.asDisplayString} and after: ${payTokenBalanceAfter.asDisplayString}`
    );
    console.log(
        `TakeToken (WETH) Balance: Before Transaction: ${takeTokenBalanceBefore.asDisplayString} and after: ${takeTokenBalanceAfter.asDisplayString}`
    );
}

(async () => {
    try {
        printBanner();

        await exampleFlash();
    } catch (error) {
        console.error("error: ", error);
    }
})();
