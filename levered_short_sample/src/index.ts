import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

const provider = new Eulith.Provider({
    serverURL: config.serverURL,
    refreshToken: config.refreshToken
});

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });

async function setupLeveredShort() {
    /*
     *  Frequently you can ingore the toolkit contract used by the AtomicTx code, but you need to know the
     *  address when you must 'approve' of transactions (spending) done by that contract.
     */
    const toolkitContractAddress = await Eulith.ToolkitContract.address({ provider, signer: acct });

    const collateralToken = await Eulith.tokens.getTokenContract({ provider, symbol: Eulith.tokens.Symbols.USDC });
    const shortToken = await Eulith.tokens.getTokenContract({ provider, symbol: Eulith.tokens.Symbols.WETH });

    const collateralAmount = 1000;

    await collateralToken
        .transfer(toolkitContractAddress, collateralToken.asTokenValue(collateralAmount * 1.2), { from: acct.address })
        .signAndSendAndWait(acct, provider);

    // Start atomic tx
    const atomicTx = new Eulith.AtomicTx({ provider, signer: acct });

    // Get short quote (leverage)
    const eulithShortAPI = new Eulith.Shorts({ atomicTx: atomicTx });
    const leverage = await eulithShortAPI.shortOn({
        collateralToken: collateralToken,
        shortToken: shortToken,
        collateralAmount: collateralAmount
    });

    // Commit, sign, and send the short on position
    const txReceipt = await atomicTx.commitAndSendAndWait({
        extraTXParams2Merge: { gas: 1000000 }, // override gas here
        timeoutMS: 10 * 1000 // optional timeout
    });
    console.log("SUCCESS setting up levered short");
}

async function removeLeveredShort() {
    const collateralToken = await Eulith.tokens.getTokenContract({ provider, symbol: Eulith.tokens.Symbols.USDC });
    const shortToken = await Eulith.tokens.getTokenContract({ provider, symbol: Eulith.tokens.Symbols.WETH });

    const atomicTx = new Eulith.AtomicTx({ provider, signer: acct });

    const eulithShortAPI = new Eulith.Shorts({ atomicTx: atomicTx });
    const releasedCollateral = await eulithShortAPI.shortOff({
        collateralToken: collateralToken,
        shortToken: shortToken,
        repayShortAmount: 0.01, // whole units of the short token
        trueForUnwindA: true // you can pick unwind option A or B... we don't think it matters, but feel free to experiment
    });

    // Commit, sign, and send the short on position
    await atomicTx.commitAndSendAndWait(); // specify {timeoutMS} to adjust default wait, or extraTXParams2Merge to adjust gas
    // no need to check receipt result, since commitAndSendAndWait throws on failed commit
    console.log("SUCCESS removing levered short");
}

const topLevel = async function () {
    await setupLeveredShort();
    await removeLeveredShort();
};

topLevel();
