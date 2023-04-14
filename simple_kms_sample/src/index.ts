import { TransactionConfig } from "web3-eth";
import { SignedTransaction } from "web3-core";
import { KMSClient } from "@aws-sdk/client-kms";
import { strict as assert } from "assert";

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
    console.log(`  AWS-KMS KeyID:      ${config.awsKMSKeyID}`);

    const kmsSigner = await Eulith.KMSSigner.mk(client, config.awsKMSKeyID);
    console.log(`  AWS-KMS Public key: ${kmsSigner.publicKey}`); // informational, no need to call
    console.log(`  Ethereum Address:   ${kmsSigner.address}`); // ''

    // Now try sending a transaction from an existing predefined wallet
    const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });
    const provider = new Eulith.Provider({
        serverURL: config.serverURL,
        refreshToken: config.refreshToken
    });
    const ew3 = new Eulith.Web3({
        provider,
        signer: acct
    });

    {
        // Test normal signing, without actually sending
        const txParams: TransactionConfig = {
            gasPrice: "0x0918400000",
            to: "0x0000000000000000000000000000000000000000",
            value: "0x00",
            data: "0x00"
        };
        const signedTx: SignedTransaction = await kmsSigner.signTransaction(txParams, ew3);
        console.log(`  (OLD)Tx to Sign:    ${JSON.stringify(txParams)}`);
        // console.log(`  (OLD)Signed RAWTX:  ${signedTx.rawTransaction}`);
        console.log(`  (OLD)Signed TX RSV: ${new Eulith.signing.ECDSASignature(signedTx).rsv}`);
        assert(Eulith.signing.recoverTransactionSigner(signedTx.rawTransaction) == kmsSigner.address);
    }

    {
        // Same test, new API
        const txParams: TransactionConfig = {
            gasPrice: "0x0918400000",
            to: "0x0000000000000000000000000000000000000000",
            value: "0x00",
            data: "0x00"
        };
        const utx = new Eulith.UnsignedTransaction(txParams);
        const signedTx: SignedTransaction = await utx.signTransaction({ provider, signer: kmsSigner });
        console.log(`  Signed TX RSV:     ${new Eulith.signing.ECDSASignature(signedTx).rsv}`);
        // console.log(`  Signed TX:         ${JSON.stringify(signedTx)}`);
        assert(Eulith.signing.recoverTransactionSigner(signedTx.rawTransaction) == kmsSigner.address);
    }
    return;

    // Now try creating an account, doing a transfer (with regular signing), and then use the
    // kms signer to send the money back
    {
        console.log(`  B4 kms bal:         ${await ew3.eth.getBalance(await kmsSigner.address)}`);
        let txReceiptHash = await provider.signAndSendTransaction(
            {
                from: acct.address,
                to: kmsSigner.address,
                value: 1213141500000000
            },
            acct
        );
        await ew3.eth.getTransactionReceipt(txReceiptHash); // NOTE Pyhon code doesn't do this, but I think its logically needed
        console.log(`  AFTER kms bal:      ${await ew3.eth.getBalance(await kmsSigner.address)}`);

        // // Now sign and send with KMS signer
        // const kmsEW3 = new Eulith.Web3({
        //     provider,
        //     signer: kmsSigner,
        // });

        // Now final transfer using the kmsSigner (inside kmsEW3)
        txReceiptHash = await provider.signAndSendTransaction(
            {
                from: kmsSigner.address,
                to: acct.address,
                value: 12131415
            },
            kmsSigner
        );
        await ew3.eth.getTransactionReceipt(txReceiptHash);
        console.log(`  At end: KMS bal:    ${await ew3.eth.getBalance(kmsSigner.address)}`);
    }
};

main();
