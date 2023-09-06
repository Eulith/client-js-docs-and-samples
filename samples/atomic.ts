import { TransactionReceipt } from "web3-core";
import * as Eulith from "eulith-web3js";
import { printBanner } from "./banner";

import config from "./commonConfiguration";

const eulithAuth = Eulith.Auth.fromRefreshToken(config.refreshToken);

// Start creating a Eulith provider (like web3js provider) object, which can be used with web3js (and
// Eulith APIs to communicate with the ethereum network. This handles authentication, and networking
const provider = new Eulith.Provider({
    network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
    auth: eulithAuth
});

// Sample account/signer to test with
// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });

async function exampleAtomicTransaction() {
    printBanner();

    console.log("Starting sample atomic transaction...");

    // Web3 object generally not needed, but maybe handy for some apis (like to access web3.eth apis directly)
    const ew3 = new Eulith.Web3({ provider, signer: acct });

    // Start Atomic Tx (or could pass CTOR {web3: ew3, accountAddress: acct.address})
    const atomicTransaction = new Eulith.AtomicTx.Transaction({ provider, signer: acct });

    // Append
    await atomicTransaction.addTransaction({
        from: acct.address,
        to: "0x8Ef090678C0B80F6F4aD8B5300Ccd41d22940968",
        value: 12131415 // Value in WEI (but see token samples for a better API/way)
    });

    // Append
    await atomicTransaction.addTransaction({
        from: acct.address,
        to: "0x646F39db3e04b2d356ca1B3F387d94b60FE6bB1A",
        value: 22131415
    });

    // Append
    await atomicTransaction.addTransaction({
        from: acct.address,
        to: "0x7321E1AD2fECeD81E5ED1E5122CCf1D981c325b2",
        value: 32131415
    });

    // Sign and send and wait for txReceipt
    const txReceipt: TransactionReceipt = await atomicTransaction.commitAndSendAndWait({ timeoutMS: 10 * 1000 }); // timeout optional

    console.log(`Transaction hash: ${txReceipt.transactionHash}`);
}

(async () => {
    try {
        await exampleAtomicTransaction();
    } catch (error) {
        console.error("error: ", error);
    }
})();
