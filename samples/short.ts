import * as Eulith from "eulith-web3js";

import config from "./commonConfiguration";
import { printBanner } from "./banner";

const eulithAuth = Eulith.Auth.fromToken(config.refreshToken);
const provider = new Eulith.Provider({
    network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
    auth: eulithAuth,
});

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });

async function shortOn() {
    const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });

    const collateralToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });
    const shortToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });

    const collateralAmount = 10;
    const addALittleForFees = 0.2;

    console.log(`Shorting with ${collateralAmount} USDC`);

    await collateralToken
        .transfer(agentContractAddress, collateralToken.asTokenValue(collateralAmount + addALittleForFees), {
            from: acct.address
        })
        .signAndSendAndWait(acct, provider);

    // Start atomic tx
    const atomicTx = new Eulith.AtomicTx.Transaction({ provider, signer: acct });

    // Get short quote (leverage)
    const eulithShortAPI = new Eulith.Shorts({ atomicTx: atomicTx });
    const leverage = await eulithShortAPI.shortOn({ collateralToken, shortToken, collateralAmount });

    console.log(`Available leverage: ${leverage}`);

    // Commit, sign, and send the short on position
    const txReceipt = await atomicTx.commitAndSendAndWait({
        extraTXParams2Merge: { gas: 1000000 }, // override gas here
        timeoutMS: 10 * 1000 // optional timeout
    });

    console.log(`Created short position: ${txReceipt.transactionHash}`);
}

async function shortOff() {
    const collateralToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });
    const shortToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });

    const atomicTx = new Eulith.AtomicTx.Transaction({ provider, signer: acct });

    const eulithShortAPI = new Eulith.Shorts({ atomicTx: atomicTx });
    const releasedCollateral = await eulithShortAPI.shortOff({
        collateralToken,
        shortToken,
        repayShortAmount: 0.001, // whole units of the short token
        trueForUnwindA: true // you can pick unwind option A or B... we don't think it matters, but feel free to experiment
    });

    await atomicTx.commitAndSendAndWait();
    console.log(`Short off succeeded, released collateral: ${releasedCollateral} USDC`);
}

(async () => {
    try {
        printBanner();

        await shortOn();
        await shortOff();
    } catch (error) {
        console.error("error: ", error);
    }
})();
