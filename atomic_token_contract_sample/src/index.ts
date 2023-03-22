import { TransactionReceipt } from "web3-core";
import * as Eulith from "eulith-web3js";

import config from "./common-configuration";
const provider = new Eulith.Provider({
    serverURL: config.serverURL,
    refreshToken: config.refreshToken,
});
// // TMP ADD PINO LOGGER TO TEST SINCE DEBUGGING
// import * as pino from "pino";
// const logger = pino.pino({
//     level: "trace",
//     transport: {
//         targets: [
//             {
//                 target: "pino/file",
//                 options: { destination: "tracelog.txt" },
//                 level: "trace",
//             },
//             {
//                 target: "pino-pretty",
//                 options: { destination: 1 },
//                 level: "info",
//             },
//         ],
//     },
// });
// const provider = new Eulith.Provider({
//     serverURL: config.serverURL,
//     refreshToken: config.refreshToken,
//     logger: new Eulith.logging.PinoLogger(logger),
// });

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });

const web3 = new Eulith.Web3({ provider: provider, signer: acct });

function closeTo(a: number, b: number, errorMargin: number) {
    return Math.abs(a - b) < errorMargin;
}

/*
 *  SEE sample token_contract_sample for comments about what this is doing
 */
async function tokenContractWithoutAtomics() {
    const wethContract = (await Eulith.tokens.getTokenContract({
        provider: provider,
        symbol: Eulith.tokens.Symbols.WETH,
    })) as Eulith.contracts.WethTokenContract;

    const startingBalance = await wethContract.balanceOf(acct.address);

    const amount = new Eulith.tokens.value.ETH(1.0);

    await wethContract
        .deposit(amount, {
            from: acct.address,
        })
        .signAndSendAndWait(acct, provider);

    const afterDepositBalance = await wethContract.balanceOf(acct.address);
    if (
        afterDepositBalance.asFloat - startingBalance.asFloat !=
        amount.asFloat
    ) {
        console.log(
            `oops, expected balance change of ${amount.asFloat}, but got: afterDepositBalance=${afterDepositBalance.asFloat}, startingBalance=${startingBalance.asFloat} `
        );
    }

    const beforeWithdrawETHBal = new Eulith.tokens.value.ETH(
        await web3.eth.getBalance(acct.address)
    );
    await wethContract
        .withdraw(amount, {
            from: await acct.address,
        })
        .signAndSendAndWait(acct, provider);

    const afterWithdrawETHBal = new Eulith.tokens.value.ETH(
        await web3.eth.getBalance(acct.address)
    );
    const afterWithdrawBalance = await wethContract.balanceOf(acct.address);

    if (afterWithdrawBalance.asFloat != startingBalance.asFloat) {
        console.log(
            `oops, expected afterWithdrawBalance to EQUAL startingBalance, but got: afterDepositBalance=${afterWithdrawBalance.asFloat}, startingBalance=${startingBalance.asFloat} `
        );
    }
    if (
        !closeTo(
            afterWithdrawETHBal.asFloat - beforeWithdrawETHBal.asFloat,
            1.0,
            0.001
        )
    ) {
        console.log(
            `oops, expected afterWithdrawETHBal - beforeWithdrawETHBal to be close to 1, but got: afterWithdrawETHBal=${afterWithdrawETHBal.asFloat}, beforeWithdrawETHBal=${beforeWithdrawETHBal.asFloat} `
        );
    }
    console.log("token Contract WITHOUT atomics SUCCESS");
}

async function tokenContractWithAtomics() {
    const wethContract = (await Eulith.tokens.getTokenContract({
        provider: provider,
        symbol: Eulith.tokens.Symbols.WETH,
    })) as Eulith.contracts.WethTokenContract;

    const startingBalance = await wethContract.balanceOf(acct.address);

    const amount = new Eulith.tokens.value.ETH(1.0);

    let atomicTx = new Eulith.AtomicTx({
        provider: provider,
        accountAddress: acct.address,
        signer: acct,
    });

    // logger.info(`***about to do atomicTx.addTransaction (DEPOSIT)`)
    await atomicTx.addTransaction(
        wethContract.deposit(amount, {
            from: acct.address,
        })
    );

    const afterDepositBalanceButBeforeCommit = await wethContract.balanceOf(
        acct.address
    );
    // logger.info(`***about to do atomicTx.commitAndSendAndWait`)
    await atomicTx.commitAndSendAndWait();
    // logger.info(`***wait for atomicTx.commitAndSendAndWait finsihed`)
    const afterDepositBalanceButAfterCommit = await wethContract.balanceOf(
        acct.address
    );
    if (afterDepositBalanceButBeforeCommit.asFloat != startingBalance.asFloat) {
        console.log(
            `oops, expected balance unchanged before commit: but got: afterDepositBalanceButBeforeCommit=${afterDepositBalanceButAfterCommit.asFloat}, startingBalance=${startingBalance.asFloat} `
        );
    }
    if (
        afterDepositBalanceButAfterCommit.asFloat - startingBalance.asFloat !=
        amount.asFloat
    ) {
        console.log(
            `oops, expected balance change of ${amount.asFloat}, but got: afterDepositBalanceButAfterCommit=${afterDepositBalanceButAfterCommit.asFloat}, startingBalance=${startingBalance.asFloat} `
        );
    }

    const beforeWithdrawETHBal = new Eulith.tokens.value.ETH(
        await web3.eth.getBalance(acct.address)
    );
    await wethContract
        .withdraw(amount, {
            from: await acct.address,
        })
        .signAndSendAndWait(acct, provider);

    // just do first part in TX - til I have  better example
    console.log("token Contract WITH atomics SUCCESS");
}

const topLevel = async function () {
    await tokenContractWithoutAtomics();
    await tokenContractWithAtomics();
};

topLevel();
