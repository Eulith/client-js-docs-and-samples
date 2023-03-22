import Web3 from "web3";
import { TransactionConfig, TransactionReceipt } from "web3-core";
import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

const provider = new Eulith.Provider({
    serverURL: config.serverURL,
    refreshToken: config.refreshToken,
});

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });

async function exampleFlash() {
    const ew3 = new Eulith.Web3({
        provider: provider,
        signer: acct,
    });

    await ew3.ensureToolkitContract(acct.address);

    // We're going to PAY USDC
    const payToken = await Eulith.tokens.getTokenContract({
        provider: provider,
        symbol: Eulith.tokens.Symbols.USDC,
    });

    // We're going to TAKE WETH
    const takeToken = (await Eulith.tokens.getTokenContract({
        provider: provider,
        symbol: Eulith.tokens.Symbols.WETH,
    })) as Eulith.contracts.WethTokenContract;

    // TAKE 2 whole WETH
    const takeAmount = 2;

    const atomicTx = new Eulith.AtomicTx({
        web3: ew3,
        accountAddress: acct.address,
    });

    const flashPay: Eulith.FlashLiquidity = await Eulith.FlashLiquidity.start({
        parentTx: atomicTx,
        paymentDef: {
            take: takeToken,
            pay: payToken,
            takeAmount: takeAmount,
            payTransferFrom: Web3.utils.toChecksumAddress(acct.address),
        },
    });

    // You'll get a price and fee for the transaction
    // If PAY and TAKE are the same token, the price is 1.0
    // The fee is ONLY the Uniswap or Aave fee. Eulith does not take a fee here.
    const price = flashPay.price;
    const fee = flashPay.fee; // represented as a percentage

    // @todo DISCUSS WITH Kristian - this is a good time to explain why we return the txNumber, or
    // to REMOVE IT FROM SAMPLE
    const txNum: number = await flashPay.commit();

    const txReceipt: TransactionReceipt = await atomicTx.commitAndSendAndWait({
        timeoutMS: 10 * 1000,
        extraTXParams2Merge: { gas: 100000 }, // @todo mention/discuss with Kristian
    });
    console.log("SUCCESS");
}

const topLevel = async function () {
    await exampleFlash();
};

topLevel();
