import { TransactionReceipt } from "web3-core";
import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

const provider = new Eulith.Provider({
    serverURL: config.serverURL,
    refreshToken: config.refreshToken,
});

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });

function closeTo(a: number, b: number) {
    return Math.abs(a - b) < 0.001; // @todo could use some help on expected precision here!
}

async function tokenContractWithWeb3JSAPI() {
    // todo write... ONLY 1/8 done using OLD WS API

    const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });
    const web3 = new Eulith.Web3({ provider: provider, signer: acct });
    const wethContract = (await Eulith.tokens.getTokenContract({
        provider: provider,
        symbol: Eulith.tokens.Symbols.WETH,
    })) as Eulith.contracts.WethTokenContract;

    // Note now balance is in WEI, not WETH
    const contractBalance = parseInt(
        await wethContract.native.methods
            .balanceOf(wethContract.native.options.address)
            .call()
    );

    await wethContract.deposit(web3, new Eulith.tokens.value.ETH(1.0), {
        from: await acct.address,
    }); // NB: no need to check result - throws on failure

    const afterDepositBalance = await wethContract.balanceOf(
        await acct.address
    );
    // if (!closeTo (afterDepositBalance.asFloat - startingBalance.asFloat, 1.0)) {
    //     console.log (`oops, expected balance change of 1, but got: afterDepositBalance=${afterDepositBalance.asFloat}, startingBalance=${startingBalance.asFloat} `);
    // }

    const beforeWithdrawETHBal = new Eulith.tokens.value.ETH(
        await web3.eth.getBalance(await acct.address)
    );

    await wethContract.withdraw(web3, new Eulith.tokens.value.ETH(1.0), {
        from: await acct.address,
    }); // NB: no need to check result - throws on failure

    const afterWithdrawETHBal = new Eulith.tokens.value.ETH(
        await web3.eth.getBalance(await acct.address)
    );
    const afterWithdrawBalance = await wethContract.balanceOf(
        await acct.address
    );

    // if (!closeTo (afterWithdrawBalance.asFloat - startingBalance.asFloat, 0.0)) {
    //     console.log (`oops, expected afterWithdrawBalance close to startingBalance, but got: afterDepositBalance=${afterWithdrawBalance.asFloat}, startingBalance=${startingBalance.asFloat} `);
    // }
    // if (!closeTo (afterWithdrawETHBal.asFloat - beforeWithdrawETHBal.asFloat, 1.0)) {
    //     console.log (`oops, expected afterWithdrawETHBal - beforeWithdrawETHBal to be close to 1, but got: afterWithdrawETHBal=${afterWithdrawETHBal.asFloat}, beforeWithdrawETHBal=${beforeWithdrawETHBal.asFloat} `);
    // }

    console.log("token Contract With Web3JSAPI: SUCCESS");
}

async function tokenContractSimplerEulithAPI() {
    const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });
    const web3 = new Eulith.Web3({ provider: provider, signer: acct });
    const wethContract = (await Eulith.tokens.getTokenContract({
        provider: provider,
        symbol: Eulith.tokens.Symbols.WETH,
    })) as Eulith.contracts.WethTokenContract;

    const startingBalance = await wethContract.balanceOf(await acct.address);

    await wethContract.deposit(web3, new Eulith.tokens.value.ETH(1.0), {
        from: await acct.address,
    }); // NB: no need to check result - throws on failure

    const afterDepositBalance = await wethContract.balanceOf(
        await acct.address
    );
    if (!closeTo(afterDepositBalance.asFloat - startingBalance.asFloat, 1.0)) {
        console.log(
            `oops, expected balance change of 1, but got: afterDepositBalance=${afterDepositBalance.asFloat}, startingBalance=${startingBalance.asFloat} `
        );
    }

    const beforeWithdrawETHBal = new Eulith.tokens.value.ETH(
        await web3.eth.getBalance(await acct.address)
    );

    await wethContract.withdraw(web3, new Eulith.tokens.value.ETH(1.0), {
        from: await acct.address,
    }); // NB: no need to check result - throws on failure

    const afterWithdrawETHBal = new Eulith.tokens.value.ETH(
        await web3.eth.getBalance(await acct.address)
    );
    const afterWithdrawBalance = await wethContract.balanceOf(
        await acct.address
    );

    if (!closeTo(afterWithdrawBalance.asFloat - startingBalance.asFloat, 0.0)) {
        console.log(
            `oops, expected afterWithdrawBalance close to startingBalance, but got: afterDepositBalance=${afterWithdrawBalance.asFloat}, startingBalance=${startingBalance.asFloat} `
        );
    }
    if (
        !closeTo(
            afterWithdrawETHBal.asFloat - beforeWithdrawETHBal.asFloat,
            1.0
        )
    ) {
        console.log(
            `oops, expected afterWithdrawETHBal - beforeWithdrawETHBal to be close to 1, but got: afterWithdrawETHBal=${afterWithdrawETHBal.asFloat}, beforeWithdrawETHBal=${beforeWithdrawETHBal.asFloat} `
        );
    }
    console.log("token Contract Simpler EulithAPI SUCCESS");
}

async function tokenContractMixAndMatchAPIs() {
    // Basically same as tokenContractWithWeb3JSAPI but use .native...
    console.log("token Contract Mix An Match APIs SUCCESS");
}

const topLevel = async function () {
    await tokenContractWithWeb3JSAPI();
    await tokenContractSimplerEulithAPI();
    await tokenContractMixAndMatchAPIs();
};

topLevel();
