import { TransactionReceipt } from "web3-core";
import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

const provider = new Eulith.Provider({
    serverURL: config.serverURL,
    refreshToken: config.refreshToken,
});

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });

async function exampleAtomicTransaction() {
    const ew3 = new Eulith.Web3({
        provider: provider,
        signer: acct,
    });

    await ew3.ensureToolkitContract(await acct.address);

    // Start Atomic Tx
    const atomicTransaction = new Eulith.AtomicTx({
        web3: ew3,
        accountAddress: await acct.address,
    });

    // Append
    await atomicTransaction.addTransaction({
        from: await acct.address,
        to: "0x8Ef090678C0B80F6F4aD8B5300Ccd41d22940968",
        value: 12131415, // Value in WEI
    });

    // Append
    await atomicTransaction.addTransaction({
        from: await acct.address,
        to: "0x646F39db3e04b2d356ca1B3F387d94b60FE6bB1A",
        value: 22131415, // Value in WEI
    });

    // Append
    await atomicTransaction.addTransaction({
        from: await acct.address,
        to: "0x7321E1AD2fECeD81E5ED1E5122CCf1D981c325b2",
        value: 32131415, // Value in WEI
    });

    // Commit Atomic Tx
    const oneWay = Math.random() <= 0.5;
    if (oneWay) {
        console.log("Using step by step commit and explict send");
        const combinedTransactionAsTxParams = await atomicTransaction.commit();

        // Sign and send
        const txHash: string = await ew3.eulith_send_and_sign_transaction(
            combinedTransactionAsTxParams
        );

        // Get tx hash
        const txReceipt: TransactionReceipt =
            await ew3.eth.getTransactionReceipt(txHash);
    } else {
        console.log("Using commitAndSendAndWait");
        // Sign and send and wait for txReceipt
        await atomicTransaction.commitAndSendAndWait({ timeoutMS: 10 * 1000 });
    }
    console.log("SUCCESS");
}

const topLevel = async function () {
    await exampleAtomicTransaction();
};

topLevel();
