import { expect, it } from "@jest/globals";
import { Sign, SignedTransaction, TransactionConfig } from "web3-core";
import Web3 from "web3";
import * as pino from "pino";
import { signTypedData, SignTypedDataVersion } from "@metamask/eth-sig-util";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";

/**
 *  Configure a pino logger, with trace level 'trace', so all the trace stuff goes to tracelog.txt.
 *  And run everything info level or higher through a pretty printer and dump to standard output (file descriptor 1).
 */
const logger = pino.pino({
    level: "trace",
    transport: {
        targets: [
            {
                target: "pino/file",
                options: { destination: "tracelog-signingTests.txt" },
                level: "trace"
            }
        ]
    }
});

/**
 * provider can be re-allocated alot, or just re-used.
 */
const provider = new Eulith.Provider({
    network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: commonConfig.serverURL }),
    auth: Eulith.Auth.fromRefreshToken(commonConfig.refreshToken),
    logger: new Eulith.Logging.PinoLogger(logger)
});

const uninterestingReUsableForTestingPrivateKey = "0x2d6ff2a33e6142c873df7bede7d329955471ebeae7090ef6189965519aa4cd8c"; // some random uninteresting key (const so reproducible)

/*
 *  All these tests require running devrpc
 *
 *      \note All the tests are named identically to those in the python code for easier
 *            cross-referencing.
 */

/*
 *   version of hashMessage logic, independent of web3js code.
 */
it("test_MyHashMessageUtilityVsWeb3", async () => {
    function oldGetMsgHash(m) {
        const web3 = new Web3();
        return Buffer.from(web3.eth.accounts.hashMessage(m).substring(2), "hex");
    }
    function newGetMsgHash(m) {
        const mapArgumentToMatchQueerWeb3jsInterpretation = Web3.utils.isHexStrict(m)
            ? Buffer.from(Web3.utils.hexToBytes(m))
            : m;
        return Eulith.Signing.hashMessage(mapArgumentToMatchQueerWeb3jsInterpretation);
    }
    const testCaseMessages = ["hi mom", "this is a super good test of a very good test", "abc123", "0x33331245"];
    testCaseMessages.forEach((i) => expect(oldGetMsgHash(i)).toEqual(newGetMsgHash(i)));
});

it("test_ECDSASignature", async () => {
    const testCase =
        "0x002e93da0260f00f678f50bc026e5e6bfb43556d9802c7de38a9e0e38ba83c9341f0831aed0363e52595c3540c3dd5b47475815ba12b05176b9a7ae93241dab51c";
    expect(new Eulith.Signing.ECDSASignature({ rsv: testCase }).rsv).toEqual(testCase);
});

/*
 *  Note - somewhat confusingly, the web3js sign function combines parts of the message digest function
 *  with signing (maybe my misunderstanding? @Kristian/@Moh)
 */
it("test_SignDataAsWeb3AccountsSign", async () => {
    type PersonalMessageSignature = Eulith.Signing.PersonalMessageSignature;
    async function doWeb3JSSign(data, privateKey): Promise<PersonalMessageSignature> {
        const web3 = new Web3();
        let r: Sign = web3.eth.accounts.sign(data, privateKey); // note no explicit Eulith.Signing.hashMessage(data) here!
        return r;
    }
    async function doOldEulithSign(data: string, privateKey): Promise<PersonalMessageSignature> {
        const acct = new Eulith.Signing.LocalSigner({ privateKey });
        const mapArgumentToMatchQueerWeb3jsInterpretation = Web3.utils.isHexStrict(data)
            ? Buffer.from(Web3.utils.hexToBytes(data))
            : data;
        const tmp: Eulith.Signing.ECDSASignature = await acct.signHash(
            Eulith.Signing.hashMessage(mapArgumentToMatchQueerWeb3jsInterpretation)
        );
        return { r: tmp.r, v: tmp.v, s: tmp.s, message: "", messageHash: "", signature: tmp.rsv };
    }
    async function doSigningServiceSign(data: string, privateKey): Promise<PersonalMessageSignature> {
        const acct = new Eulith.Signing.LocalSigner({ privateKey });
        const signer = new Eulith.Signing.SigningService({ provider, cryptographicSigner: acct });
        const mapArgumentToMatchQueerWeb3jsInterpretation = Web3.utils.isHexStrict(data)
            ? Buffer.from(Web3.utils.hexToBytes(data))
            : data;
        return await signer.signMessage(mapArgumentToMatchQueerWeb3jsInterpretation);
    }
    const privateKey = uninterestingReUsableForTestingPrivateKey;
    const testCaseMessages = ["hello world", "hi mom", "0x33331245"];
    for (const i of testCaseMessages) {
        const signedData: PersonalMessageSignature = await doOldEulithSign(i, privateKey);
        const web3SignedData: PersonalMessageSignature = await doWeb3JSSign(i, privateKey);
        const newSignedSvc: PersonalMessageSignature = await doSigningServiceSign(i, privateKey);
        // doWeb3JSSign only returns RSV correctly, but new API returns full PersonalMessageSignature (aka web3js Sign)
        expect(new Eulith.Signing.ECDSASignature(signedData).rsv).toEqual(
            new Eulith.Signing.ECDSASignature(web3SignedData).rsv
        );
        expect(new Eulith.Signing.ECDSASignature(signedData).rsv).toEqual(
            new Eulith.Signing.ECDSASignature(newSignedSvc).rsv
        );
        if (i != "0x33331245") {
            // then message wont match... cuz of crazy re-interpet for web3js
            expect(web3SignedData).toEqual(newSignedSvc);
        }
    }
});

/*
 *  Verify Eulith.Signing.recoverSignerAddress works like web3.eth.accounts.recover (at least one overload)
 */
it("test_RecoverSignerAddress", async () => {
    const privateKey = uninterestingReUsableForTestingPrivateKey;
    const acct = new Eulith.Signing.LocalSigner({ privateKey });
    const testStr = "hello world";
    const web3 = new Web3();
    const signedData: Eulith.Signing.ECDSASignature = await acct.signHash(
        Buffer.from(web3.eth.accounts.hashMessage(testStr).substring(2), "hex")
    );
    let whoSigned: string = web3.eth.accounts.recover(testStr, signedData.rsv);
    expect(Web3.utils.checkAddressChecksum(whoSigned)).toBeTruthy();
    expect(whoSigned).toEqual(Eulith.Signing.recoverSignerAddress(testStr, signedData.rsv));
});

/*
 *   I believe the importance of verifying that web3.eth.accounts.recover returns the original acct.address
 *  is that this is what is used by Ethereum to verify the authenticity of signed transactions.
 */
it("test_SignaturesAreRecoverableUsingWeb3", async () => {
    const privateKey = uninterestingReUsableForTestingPrivateKey;
    const acct = new Eulith.Signing.LocalSigner({ privateKey });
    const testCaseMessages = ["hello world", "hi mom"];
    for (const i of testCaseMessages) {
        const signedData: Eulith.Signing.ECDSASignature = await acct.signHash(Eulith.Signing.hashMessage(i));
        let whoSigned: string = Eulith.Signing.recoverSignerAddress(i, signedData.rsv);
        expect(whoSigned).toEqual(acct.address);
    }
});

// NOTE - this must have ALL the OPTIONAL CRITICAL fields filled in, since else canonicalize no worky
const txConfigParamsTest1 = {
    chainId: 1,
    from: "0x697ff5Fbdc88f4C17BabB5D12C40D3486e79b1b8",
    gas: 21000,
    gasPrice: 2266559216,
    nonce: 0,
    to: "0x0fd1f65e8F06C71e0E98Ccb175Bc9E38865BbDfb",
    value: 12345678
};

it("test_fillTransactionDefaults", async () => {
    const acct = new Eulith.Signing.LocalSigner({ privateKey: uninterestingReUsableForTestingPrivateKey });
    for (const ti of [txConfigParamsTest1]) {
        const useTXConfig = await Eulith.Utils.fillTransactionDefaults(
            ti,
            new Eulith.Web3({ provider, signer: acct }),
            provider.logger
        );
        expect(ti).toEqual(useTXConfig);
    }

    for (const ti of [txConfigParamsTest1]) {
        const lessTxConfig: TransactionConfig = { ...ti, chainId: undefined };
        const useTXConfig: TransactionConfig = await Eulith.Utils.fillTransactionDefaults(
            lessTxConfig,
            new Eulith.Web3({ provider, signer: acct }),
            provider.logger
        );
        lessTxConfig.chainId = useTXConfig.chainId; // it was missing - so if we add just that back, should get same obj
        expect(lessTxConfig).toEqual(useTXConfig);
    }
});

it("test_Canonicalize", async () => {
    const acct = new Eulith.Signing.LocalSigner({ privateKey: uninterestingReUsableForTestingPrivateKey });
    for (const ti of [txConfigParamsTest1]) {
        const utx = new Eulith.Signing.UnsignedTransaction(ti);
        const utxCanonicalized: Eulith.Signing.UnsignedTransaction = await utx.canonicalize(acct.address, provider);

        (utxCanonicalized as any).gasLimit = undefined;
        expect(utx.serialize()).toEqual(utxCanonicalized.serialize());
    }

    // BUT - verify if we ELIMIANTE a few fields, though we dont know what we'll get canonicalized, mostly should work
    for (const ti of [txConfigParamsTest1]) {
        const lessTxConfig: TransactionConfig = { ...ti, chainId: undefined };
        const utx = new Eulith.Signing.UnsignedTransaction(lessTxConfig);
        const utxCanonicalized: Eulith.Signing.UnsignedTransaction = await utx.canonicalize(acct.address, provider);
        utx.chainId = utxCanonicalized.chainId;
        (utx as any).gasLimit = (utxCanonicalized as any).gasLimit;
        expect(utx.serialize).toEqual(utxCanonicalized.serialize);
    }
});

it("test_SignTxWorks", async () => {
    const acct = new Eulith.Signing.LocalSigner({ privateKey: uninterestingReUsableForTestingPrivateKey });
    for (const ti of [txConfigParamsTest1]) {
        const utx = new Eulith.Signing.UnsignedTransaction(ti);
        const signedResult: SignedTransaction = await utx.signTransaction({ provider, signer: acct });
        expect(Eulith.Signing.recoverTransactionSigner(signedResult.rawTransaction as string)).toEqual(acct.address);
    }
});

it("test_SignTxMatchesWeb3", async () => {
    async function doWeb3JSSign(txConfig: TransactionConfig): Promise<SignedTransaction> {
        const web3 = new Web3();
        return await web3.eth.accounts.signTransaction(txConfig, uninterestingReUsableForTestingPrivateKey);
    }
    const acct = new Eulith.Signing.LocalSigner({ privateKey: uninterestingReUsableForTestingPrivateKey });

    // BUT - verify if we ELIMIANTE a few fields, though we dont know what we'll get canonicalized, mostly should work
    for (const ti of [txConfigParamsTest1]) {
        const referenceSignature: SignedTransaction = await doWeb3JSSign(ti);
        expect(Eulith.Signing.recoverTransactionSigner(referenceSignature.rawTransaction as string)).toEqual(
            acct.address
        );

        const utx = new Eulith.Signing.UnsignedTransaction(ti);
        const signedResult = await utx.signTransaction({ provider, signer: acct });
        expect(referenceSignature.rawTransaction).toEqual(signedResult.rawTransaction);
        expect(referenceSignature.messageHash).toEqual(signedResult.messageHash);
        expect(referenceSignature.transactionHash).toEqual(signedResult.transactionHash);
        expect(new Eulith.Signing.ECDSASignature(referenceSignature).rsv).toEqual(
            new Eulith.Signing.ECDSASignature(signedResult).rsv
        );
    }
});

it("test_SigningServiceWorksWithLocalSigner", async () => {
    const acct = new Eulith.Signing.LocalSigner({ privateKey: uninterestingReUsableForTestingPrivateKey });
    for (const ti of [txConfigParamsTest1]) {
        const tmphack2TestSS = Eulith.Signing.SigningService.assure(acct, provider);
        const signedResult: SignedTransaction = await tmphack2TestSS.signTransaction(ti);
        expect(Eulith.Signing.recoverTransactionSigner(signedResult.rawTransaction as string)).toEqual(acct.address);
    }
});

it("test_SignTypedDataAPI", async () => {
    const acct = new Eulith.Signing.LocalSigner({ privateKey: uninterestingReUsableForTestingPrivateKey });
    let examples = (() => {
        const example1: Eulith.Signing.TypedData = {
            types: {
                EIP712Domain: [
                    { type: "uint256", name: "chainId" },
                    { type: "address", name: "verifyingContract" }
                ],
                SafeTx: [
                    { type: "address", name: "to" },
                    { type: "uint256", name: "value" },
                    { type: "bytes", name: "data" },
                    { type: "uint8", name: "operation" },
                    { type: "uint256", name: "safeTxGas" },
                    { type: "uint256", name: "baseGas" },
                    { type: "uint256", name: "gasPrice" },
                    { type: "address", name: "gasToken" },
                    { type: "address", name: "refundReceiver" },
                    { type: "uint256", name: "nonce" }
                ]
            },
            domain: {
                verifyingContract: "0xd01B3c4E09678998599D430f7602539bf6fa05eA",
                chainId: 1
            },
            primaryType: "SafeTx",
            message: {
                to: "0xd01B3c4E09678998599D430f7602539bf6fa05eA",
                value: "0",
                data: "0x610b592500000000000000000000000039859dbdde9be0448b1f817699fc5dc35dc0dbdd",
                operation: 0,
                baseGas: 0,
                gasPrice: 0,
                gasToken: "0x0000000000000000000000000000000000000000",
                refundReceiver: "0x0000000000000000000000000000000000000000",
                nonce: 0,
                safeTxGas: 0
            }
        };

        // THIS EXAMPLE FROM https://eips.ethereum.org/EIPS/eip-712
        const example2: Eulith.Signing.TypedData = {
            types: {
                EIP712Domain: [
                    { name: "name", type: "string" },
                    { name: "version", type: "string" },
                    { name: "chainId", type: "uint256" },
                    { name: "verifyingContract", type: "address" }
                ],
                Person: [
                    { name: "name", type: "string" },
                    { name: "wallet", type: "address" }
                ],
                Mail: [
                    { name: "from", type: "Person" },
                    { name: "to", type: "Person" },
                    { name: "contents", type: "string" }
                ]
            },
            primaryType: "Mail",
            domain: {
                name: "Ether Mail",
                version: "1",
                chainId: 1,
                verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
            },
            message: {
                from: { name: "Cow", wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826" },
                to: { name: "Bob", wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" },
                contents: "Hello, Bob!"
            }
        };
        return [example1, example2];
    })();

    for (const e of examples) {
        const signer = Eulith.Signing.SigningService.assure(acct, provider);
        const eulithDataSignature = await signer.signTypedData(e);
        const metaMaskAlgorithmSingedTypeDataResult = signTypedData({
            privateKey: Buffer.from(uninterestingReUsableForTestingPrivateKey.substring(2), "hex"),
            data: e,
            version: SignTypedDataVersion.V4
        });
        expect(eulithDataSignature.rsv).toEqual(metaMaskAlgorithmSingedTypeDataResult);
        expect(Eulith.Signing.recoverTypedDataSignature(e, eulithDataSignature.rsv)).toEqual(signer.address);
    }
});
