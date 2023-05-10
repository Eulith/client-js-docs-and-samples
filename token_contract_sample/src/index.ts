import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

// Start creating a Eulith provider (like web3js provider) object, which can be used with web3js (and
// Eulith APIs to communicate with the ethereum network. This handles authentication, and networking
const provider = new Eulith.Provider({
    network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
    refreshToken: config.refreshToken
});

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });

function closeTo(a: number, b: number, errorMargin: number) {
    return Math.abs(a - b) < errorMargin;
}

async function tokenContractSimplerEulithAPI() {
    const web3 = new Eulith.Web3({ provider, signer: acct });

    /*
     *  Create a smart proxy to the WETH contract.
     */
    const wethContract = (await Eulith.Tokens.getTokenContract({
        provider,
        symbol: Eulith.Tokens.Symbols.WETH
    })) as Eulith.Contracts.WethTokenContract;

    /*
     *  Fetch the amount of 'wrapped' ETH we have already on the WETH contract.
     */
    const startingBalance = await wethContract.balanceOf(acct.address);

    /*
     *  Transfer 1 ETH, from the ETH associated with our account, to the wrapped ETH contract.
     *
     *  WARNING: contract.deposit does NOT initiate the deposit. It must be chained together with
     *  signAndSendAndWait (or otherwise signed and sent along).
     *
     *  \note also, this contract.deposit API DIFFERS from the web3js approach, in that there is no
     *        .method level, and it operates on 'tokenvalue' objects that are smart about
     *        precision and format conversions.
     */
    await wethContract
        .deposit(new Eulith.Tokens.Value.ETH(1.0), { from: acct.address })
        .signAndSendAndWait(acct, provider); // NB: no need to check result - throws on failure

    // By this point, we've INCREASED our WETH balance, and correspondingly DECREASED our ETH balance associated with accnt.
    // WETH change sb exact, but ETH balance change off by a bit due to gas cost
    const afterDepositBalance = await wethContract.balanceOf(acct.address);
    if (afterDepositBalance.asFloat - startingBalance.asFloat != 1.0) {
        console.log(
            `  oops, expected balance change of 1, but got: afterDepositBalance=${afterDepositBalance.asFloat}, startingBalance=${startingBalance.asFloat} `
        );
    }

    const beforeWithdrawETHBal = new Eulith.Tokens.Value.ETH(await web3.eth.getBalance(acct.address));
    /*
     *  withdraw() UNWRAPS the WETH, putting it back into our ETH account, and removing it from the WETH contract.
     */
    await wethContract
        .withdraw(new Eulith.Tokens.Value.ETH(1.0), { from: acct.address })
        .signAndSendAndWait(acct, provider); // NB: no need to check result - throws on failure
    const afterWithdrawETHBal = new Eulith.Tokens.Value.ETH(await web3.eth.getBalance(acct.address));
    const afterWithdrawBalance = await wethContract.balanceOf(acct.address);

    // Note at this point, our WETH balanace should EXACTLY match our original balance, but the ETH balance will be off by a tiny
    // amount, due to gas costs.
    if (afterWithdrawBalance.asFloat != startingBalance.asFloat) {
        console.log(
            `  oops, expected afterWithdrawBalance to EQUAL startingBalance, but got: afterDepositBalance=${afterWithdrawBalance.asDisplayString}, startingBalance=${startingBalance.asDisplayString} `
        );
    }
    if (!closeTo(afterWithdrawETHBal.asFloat - beforeWithdrawETHBal.asFloat, 1.0, 0.001)) {
        console.log(
            `  oops, expected afterWithdrawETHBal - beforeWithdrawETHBal to be close to 1, but got: afterWithdrawETHBal=${afterWithdrawETHBal.asDisplayString}, beforeWithdrawETHBal=${beforeWithdrawETHBal.asDisplayString} `
        );
    }
    console.log("token Contract Simpler EulithAPI SUCCESS");
}

async function tokenContractWithWeb3JSAPI() {
    // todo write... ONLY 1/8 done using OLD WS API
    // const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });
    // const web3 = new Eulith.Web3({ provider, signer: acct });
    // const wethContract = (await Eulith.Tokens.getTokenContract({
    //     provider,
    //     symbol: Eulith.Tokens.Symbols.WETH,
    //     signer: acct
    // })) as Eulith.Contracts.WethTokenContract;
    // // Note now balance is in WEI, not WETH
    // const contractBalance = parseInt(
    //     await wethContract.native.methods
    //         .balanceOf(wethContract.native.options.address)
    //         .call()
    // );
    // await wethContract.deposit(new Eulith.Tokens.Value.ETH(1.0), {
    //     from: acct.address,
    // }); // NB: no need to check result - throws on failure
    // const afterDepositBalance = await wethContract.balanceOf(
    //     await acct.address
    // );
    // // if (!closeTo (afterDepositBalance.asFloat - startingBalance.asFloat, 1.0)) {
    // //     console.log (`oops, expected balance change of 1, but got: afterDepositBalance=${afterDepositBalance.asFloat}, startingBalance=${startingBalance.asFloat} `);
    // // }
    // const beforeWithdrawETHBal = new Eulith.Tokens.Value.ETH(
    //     await web3.eth.getBalance(await acct.address)
    // );
    // await wethContract.withdraw( new Eulith.Tokens.Value.ETH(1.0), {
    //     from: acct.address,
    // }); // NB: no need to check result - throws on failure
    // const afterWithdrawETHBal = new Eulith.Tokens.Value.ETH(
    //     await web3.eth.getBalance(await acct.address)
    // );
    // const afterWithdrawBalance = await wethContract.balanceOf(acct.address);
    // // if (!closeTo (afterWithdrawBalance.asFloat - startingBalance.asFloat, 0.0)) {
    // //     console.log (`oops, expected afterWithdrawBalance close to startingBalance, but got: afterDepositBalance=${afterWithdrawBalance.asFloat}, startingBalance=${startingBalance.asFloat} `);
    // // }
    // // if (!closeTo (afterWithdrawETHBal.asFloat - beforeWithdrawETHBal.asFloat, 1.0)) {
    // //     console.log (`oops, expected afterWithdrawETHBal - beforeWithdrawETHBal to be close to 1, but got: afterWithdrawETHBal=${afterWithdrawETHBal.asFloat}, beforeWithdrawETHBal=${beforeWithdrawETHBal.asFloat} `);
    // // }
    // console.log("token Contract With Web3JSAPI: SUCCESS");
}

async function tokenContractMixAndMatchAPIs() {
    // Basically same as tokenContractWithWeb3JSAPI but use .native...
    // console.log("token Contract Mix An Match APIs SUCCESS");
}

const topLevel = async function () {
    await tokenContractSimplerEulithAPI();
    await tokenContractWithWeb3JSAPI();
    await tokenContractMixAndMatchAPIs();
};

topLevel();
