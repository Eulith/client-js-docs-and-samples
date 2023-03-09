import { TransactionConfig } from "web3-eth";
import { KMSClient } from "@aws-sdk/client-kms";
import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

const main = async () => {
    console.log("Sample / Example how to run KMS based signing");
    console.log(
        "  > See KWS signing tutorial : https://luhenning.medium.com/the-dark-side-of-the-elliptic-curve-signing-ethereum-transactions-with-aws-kms-in-javascript-83610d9a6f81"
    );
    console.log(
        "  > Setup AWS KMS key (with limited account/privs probably) and store KEY ID etc in following clientConfig"
    );
    console.log("  > Compute Ethereum address (based on KMS Key)");

    const client = new KMSClient(config.kmsClientConfig);
    console.log(`AWS-KMS KeyID:      ${config.awsKMSKeyID}`);

    const kmsSigner = new Eulith.KMSSigner(client, config.awsKMSKeyID);
    console.log(`AWS-KMS Public key: ${await kmsSigner.getPublicKey()}`); // informational, no need to call
    console.log(`Ethereum Address:   ${await kmsSigner.getAddress()}`); // ''

    // Now try sending a transaction from an existing predefined wallet
    const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });
    const ew3 = new Eulith.Web3({
        provider: new Eulith.Provider({
            serverURL: config.serverURL,
            refreshToken: config.refreshToken,
        }),
        signer: acct,
    });

    {
        // Test normal signing, without actually sending
        const txParams: TransactionConfig = {
            gasPrice: "0x0918400000",
            to: "0x0000000000000000000000000000000000000000",
            value: "0x00",
            data: "0x00",
        };
        const signedTx = await kmsSigner.signTransaction(txParams, ew3);
        console.log(`Tx to Sign:         ${JSON.stringify(txParams)}`);
        console.log(`Signed TX:          ${signedTx.rawTransaction}`);
    }

    // Now try creating an account, doing a transfer (with regular signing), and then use the
    // kms signer to send the money back
    {
        await ew3.ensureToolkitContract(await acct.getAddress());
        console.log(
            `B4 kms bal:         ${await ew3.eth.getBalance(
                await kmsSigner.getAddress()
            )}`
        );
        let txReceiptHash = await ew3.eulith_send_and_sign_transaction({
            from: await acct.getAddress(),
            to: await kmsSigner.getAddress(),
            value: 1213141500000000,
        });
        await ew3.eth.getTransactionReceipt(txReceiptHash); // NOTE Pyhon code doesn't do this, but I think its logically needed
        console.log(
            `AFTER kms bal:      ${await ew3.eth.getBalance(
                await kmsSigner.getAddress()
            )}`
        );

        // Now sign and send with KMS signer
        const kmsEW3 = new Eulith.Web3({
            provider: new Eulith.Provider({
                serverURL: config.serverURL,
                refreshToken: config.refreshToken,
            }),
            signer: kmsSigner,
        });

        // Now final trnasfer using the kmsSigner (inside kmsEW3)
        txReceiptHash = await kmsEW3.eulith_send_and_sign_transaction({
            from: await kmsSigner.getAddress(),
            to: await acct.getAddress(),
            value: 12131415,
        });
        await ew3.eth.getTransactionReceipt(txReceiptHash);
        console.log(
            `At end: KMS bal:    ${await ew3.eth.getBalance(
                await kmsSigner.getAddress()
            )}`
        );
    }
};

main();
