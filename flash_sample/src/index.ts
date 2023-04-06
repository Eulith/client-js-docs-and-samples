import Web3 from "web3";
import { TransactionReceipt } from "web3-core";
import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

// Start creating a Eulith provider (like web3js provider) object, which can be used with web3js (and
// Eulith APIs to communicate with the ethereum network. This handles authentication, and networking
const provider = new Eulith.Provider({ serverURL: config.serverURL, refreshToken: config.refreshToken });

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });

/*
 *  Example, of doing a simple swap, within a transaction - buying WETH with USDC
 */
async function exampleFlash() {
    console.log("exampleFlash: START");

    // We're going to PAY USDC
    const payTokenContract = await Eulith.tokens.getTokenContract({ provider, symbol: Eulith.tokens.Symbols.USDC });

    // We're going to TAKE WETH
    const takeTokenContract = (await Eulith.tokens.getTokenContract({
        provider,
        symbol: Eulith.tokens.Symbols.WETH
    })) as Eulith.contracts.WethTokenContract;

    // @todo rewrite using new TOKENVALUE
    // TAKE 2 whole WETH
    const takeAmount = 2;

    // @todo figure out how to clean this logic up!!!
    // # magic number math to cover enough USDC to pay back the ETH and max $1,500 per.
    const payAmount = takeAmount * 1500 * 1.2;

    /*
     *  Frequently you can ingore the toolkit address used by the AtomicTx code, but you need to know the
     *  address when you must 'approve' of transactions (spending) done by that proxy
     */
    const toolkitContractAddress = await Eulith.ToolkitContract.address({ provider, signer: acct });

    // @todo - this from: acct.address sb AUTOMATIC?? DISCUSS WITH @Kristain/Moh

    // The x 1.2 here is so we pre-approve a bit more than we expect to take, so the
    // loan request succeeds (gas/fee).
    await payTokenContract
        .approve(toolkitContractAddress, payTokenContract.asTokenValue(payAmount * 1.2), { from: acct.address })
        .signAndSendAndWait(acct, provider);

    /*
     * Start an atomic transaction. The atomic transaction needs to know the provider to talk to
     * and the signer (or the account address - which can be extracted from the signer)
     *
     *  \note - constructor for AtomicTx allows you to OPTIONALLY specify toolkitContractAddress for performance sake only.
     *          It can be computed internally automatically.
     */
    const atomicTx = new Eulith.AtomicTx({ provider, signer: acct /*, toolkitContractAddress*/ });

    /**
     *  Create the payment exchange object to be serialized in the atomic transaction.
     */
    const flashPay: Eulith.FlashLiquidity = await Eulith.FlashLiquidity.start({
        parentTx: atomicTx,
        paymentDef: {
            take: takeTokenContract,
            pay: payTokenContract,
            takeAmount: takeAmount,
            payTransferFrom: Web3.utils.toChecksumAddress(acct.address),
            recipient: acct.address
        }
    });

    // You'll get a price and fee for the transaction
    // If PAY and TAKE are the same token, the price is 1.0
    // The fee is ONLY the Uniswap or Aave fee. Eulith does not take a fee here.
    console.log(
        `  The price was ${flashPay.price}, and the fee was: ${flashPay.feePct}% (aka ${flashPay.feeAmt
            .map((a) => a.asDisplayString)
            .join(",")})`
    );

    // @todo DISCUSS WITH Kristian - this is a good time to explain why we return the txNumber, or
    // to REMOVE IT FROM SAMPLE
    const txNum: number = await flashPay.commit();

    const payTokenBalanceBefore = await payTokenContract.balanceOf(acct.address);
    const takeTokenBalanceBefore = await takeTokenContract.balanceOf(toolkitContractAddress);

    console.log(
        `  BEFORE TX: To start: payTokenContract: accnt has balance ${
            (await payTokenContract.balanceOf(acct.address)).asDisplayString
        }, but proxy has balance ${(await payTokenContract.balanceOf(toolkitContractAddress)).asDisplayString}`
    );
    console.log(
        `  BEFORE TX: To start: takeTokenContract: accnt has balance ${
            (await takeTokenContract.balanceOf(acct.address)).asDisplayString
        }, but proxy has balance ${(await takeTokenContract.balanceOf(toolkitContractAddress)).asDisplayString}`
    );

    // commitAndSendAndWait will throw if the transaction fails, or times out
    //
    // NOTE - if you are getting errors 'Unable to automatically compute gas value for tx'; or
    // This will sometimes fail on the dev server with Error: reverted with 'ERC20: transfer amount exceeds balance'
    // which can be fixed by restarting the dev server; '"gas" is missing', then comment in the extraTXParams2Merge
    // This APPEARS to only happen when you have run out of ETH in your account, so restart the dev server (cuz oyu will then
    // get TRANASACTION FAILED here and in hte CALL server log, get 'error reverted without a reason' or 'Error: reverted with 'ERC20: transfer amount exceeds balance''
    const txReceipt: TransactionReceipt = await atomicTx.commitAndSendAndWait({
        timeoutMS: 10 * 1000
        //extraTXParams2Merge: { gas:  1000000 }, // @todo mention/discuss with Kristian
    });

    const payTokenBalanceAfter = await payTokenContract.balanceOf(acct.address);
    const takeTokenBalanceAfter = await takeTokenContract.balanceOf(toolkitContractAddress);

    console.log(
        `  payToken Balance: Before Transaction: ${payTokenBalanceBefore.asDisplayString} and after: ${payTokenBalanceAfter.asDisplayString}`
    );
    console.log(
        `  takeToken Balance: Before Transaction: ${takeTokenBalanceBefore.asDisplayString} and after: ${takeTokenBalanceAfter.asDisplayString}`
    );
    console.log(
        `  AFTER TX: To start: payTokenContract: accnt has balance ${
            (await payTokenContract.balanceOf(acct.address)).asDisplayString
        }, but proxy has balance ${(await payTokenContract.balanceOf(toolkitContractAddress)).asDisplayString}`
    );
    console.log(
        `  AFTER TX: To start: takeTokenContract: accnt has balance ${
            (await takeTokenContract.balanceOf(acct.address)).asDisplayString
        }, but proxy has balance ${(await takeTokenContract.balanceOf(toolkitContractAddress)).asDisplayString}`
    );

    console.log("exampleFlash: SUCCESS");
}

const topLevel = async function () {
    await exampleFlash();
};

topLevel();
