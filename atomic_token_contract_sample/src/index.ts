import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

import * as pino from "pino";
const logger = pino.pino({
    level: "trace",
    transport: {
        targets: [
            {
                // Can be helpful to debug - see details on tracelog.txt, including each message and response as they go over the wire
                target: "pino/file",
                options: { destination: "tracelog.txt" },
                level: "trace",
            },
            {
                target: "pino-pretty",
                options: { destination: 1 },
                level: "info",
            },
        ],
    },
});
const provider = new Eulith.Provider({
    serverURL: config.serverURL,
    refreshToken: config.refreshToken,
    logger: new Eulith.logging.PinoLogger(logger),
});

function walletPrivateKey2Address_(w: string) {
    return new Eulith.LocalSigner({ privateKey: w }).address;
}

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });

function closeTo(a: number, b: number, errorMargin: number) {
    return Math.abs(a - b) < errorMargin;
}

// throw in any target addresses to transfer you'd like, and the amount to xfer will be split among them
const recipients = [
    walletPrivateKey2Address_(config.Wallet2),
    walletPrivateKey2Address_(config.Wallet3),
    walletPrivateKey2Address_(config.Wallet4),
];
logger.info(`Recipients: ${JSON.stringify(recipients)}`);

/*
 *  Simple test of transfers (with contract.transfer or contract.transferFrom)
 */
async function tokenContractWithoutAtomics() {
    logger.info("Start Token Contract WITHOUT atomics Test");

    /*
     *  Test doing atomic transactions on some ERC20 token contract
     */
    const tokenContract = await Eulith.tokens.getTokenContract({
        provider,
        symbol: Eulith.tokens.Symbols.USDC,
    });

    // Just to test/report
    const startingContractBalance = await tokenContract.balanceOf(acct.address);

    // Setup amount we will transfer out (roughly - must be >= amount tranfered)
    const approveAmt = tokenContract.asTokenValue(1.0); // one dollar
    logger.info(
        `About to do transfers of roughly ${approveAmt.asFloat} from ${acct.address} with balance ${startingContractBalance.asFloat} to recipients`
    );

    const useTransferFrom = Math.random() <= 0.5; // better to use transfer in this case, but transferFrom more closely mimics the atomicTx case
    if (useTransferFrom) {
        logger.info(`The dice gods have chosen - using tranferFrom this time, so approving`);
        await tokenContract
            .approve(acct.address, approveAmt, { from: acct.address })
            .signAndSendAndWait(acct, provider);
    } else {
        logger.info(`Transfer the normal way`);
    }

    // grab balances before xfer, just so we can double-check and report success/failure
    let preTransactionRecipientBalances: { [index: string]: number } = {};
    for (const i in recipients) {
        preTransactionRecipientBalances[recipients[i]] = (await tokenContract.balanceOf(recipients[i])).asFloat;
    }

    for (const recip in recipients) {
        const amt = approveAmt.asFloat / recipients.length - 0.001; // dont go over - rounding error
        if (useTransferFrom) {
            await tokenContract
                .transferFrom(
                    acct.address,
                    recipients[recip],
                    tokenContract.asTokenValue(amt),
                    { from: acct.address, to: tokenContract.address, gas: 2 * 1000000 } // @todo - WAG ON GAS
                )
                .signAndSendAndWait(acct, provider);
        } else {
            await tokenContract
                .transfer(
                    recipients[recip],
                    tokenContract.asTokenValue(amt),
                    { from: acct.address, to: tokenContract.address, gas: 2 * 1000000 } // @todo - WAG ON GAS
                )
                .signAndSendAndWait(acct, provider);
        }
    }

    const contractBalanceAfterXFer = await tokenContract.balanceOf(acct.address);

    let errors = false;
    for (const i in recipients) {
        const expectedAmt = approveAmt.asFloat / recipients.length - 0.001; // dont go over - rounding error
        const itsBalance = (await tokenContract.balanceOf(recipients[i])).asFloat;
        logger.info(
            `AFTER-XFER: RECIPIENT: ${recipients[i]}, balance=${itsBalance}: DELTA = ${
                itsBalance - preTransactionRecipientBalances[recipients[i]]
            }`
        );
        if (!closeTo(itsBalance - preTransactionRecipientBalances[recipients[i]], expectedAmt, 0.001)) {
            errors = true;
            logger.error(`**** treating as error this DELTA ****`); // this check code assumes each recip just once in list, OK for just sample code
        }
    }

    logger.info(
        `AFTER-COMMIT: contractBalanceAfterXFer=${contractBalanceAfterXFer.asFloat}: DELTA = ${
            contractBalanceAfterXFer.asFloat - startingContractBalance.asFloat
        }`
    );

    if (
        !closeTo(
            startingContractBalance.asFloat - contractBalanceAfterXFer.asFloat,
            approveAmt.asFloat,
            0.02 * recipients.length
        )
    ) {
        logger.error(
            `oops, expected balance change of ${approveAmt.asFloat}, but got: contractBalanceAfterXFer=${contractBalanceAfterXFer.asFloat}, startingContractBalance=${startingContractBalance.asFloat} `
        );
        errors = true;
    }

    if (errors) {
        logger.error("Token Contract WITHOUT atomics Test - FAILURE");
    } else {
        logger.info("Token Contract WITHOUT atomics Test - SUCCESS");
    }
}

/*
 *  Simple test of contract transfers, like tokenContractWithoutAtomics, except using atomic transactions
 */
async function tokenContractWithAtomics() {
    logger.info("Start Token Contract WITH atomics Test");

    /*
     *  Test doing atomic transactions on some ERC20 token contract
     */
    const tokenContract = await Eulith.tokens.getTokenContract({
        provider,
        symbol: Eulith.tokens.Symbols.USDC,
    });

    // Just to test/report
    const startingContractBalance = await tokenContract.balanceOf(acct.address);

    // precompute proxyContractAddress, so we can 'approve' that address for later transfers
    const proxyContractAddress = await Eulith.ToolkitContract.address({ provider, signer: acct });

    const approveAmt = tokenContract.asTokenValue(1.0); // one dollar

    // Pre-approve an amount to be used in the atomic transaction
    await tokenContract
        .approve(proxyContractAddress, approveAmt, { from: acct.address })
        .signAndSendAndWait(acct, provider);
    logger.info(`APPROVED: ${approveAmt.asFloat} for proxyContractAddress: ${proxyContractAddress})`);

    // begin the transaction (proxyContractAddress parameter optional, but we happen to have it handy, so why recompute)
    let atomicTx = new Eulith.AtomicTx({ provider, signer: acct, proxyContractAddress });
    logger.trace(
        `tokenContract.allowance: ${(await tokenContract.allowance(acct.address, proxyContractAddress)).asFloat}`
    );

    let preTransactionRecipientBalances: { [index: string]: number } = {};
    for (const i in recipients) {
        preTransactionRecipientBalances[recipients[i]] = (await tokenContract.balanceOf(recipients[i])).asFloat;
    }

    for (const recip in recipients) {
        // @todo test - I dont think we EVEN NEED TO WAIT on each addTransaction
        const amt = approveAmt.asFloat / recipients.length - 0.001; // dont go over - rounding error
        await atomicTx.addTransaction(
            tokenContract.transferFrom(acct.address, recipients[recip], tokenContract.asTokenValue(amt), {
                from: acct.address,
                to: tokenContract.address,
                gas: 1,
            })
        );
    }

    const contractBalanceAfterTransferBeforeCommit = await tokenContract.balanceOf(acct.address);
    const enufGasFor1or2Repips = 100000;
    const enufGasFor3OrMoreRepips = 2 * enufGasFor1or2Repips;
    const gas2Use = recipients.length <= 2 ? enufGasFor1or2Repips : enufGasFor3OrMoreRepips; // @todo NO IDEA ABOUT GAS???
    await atomicTx.commitAndSendAndWait({ extraTXParams2Merge: { gas: gas2Use } });
    const contractBalanceAfterCommit = await tokenContract.balanceOf(acct.address);

    let errors = false;
    for (const i in recipients) {
        const expectedAmt = approveAmt.asFloat / recipients.length - 0.001; // dont go over - rounding error
        const itsBalance = (await tokenContract.balanceOf(recipients[i])).asFloat;
        logger.info(
            `AFTER-COMMIT: RECIPIENT: ${recipients[i]}, balance=${itsBalance}: DELTA = ${
                itsBalance - preTransactionRecipientBalances[recipients[i]]
            }`
        );
        if (!closeTo(itsBalance - preTransactionRecipientBalances[recipients[i]], expectedAmt, 0.001)) {
            errors = true;
            logger.error(`**** treating as error this DELTA ****`); // this check code assumes each recip just once in list, OK for just sample code
        }
    }

    logger.info(
        `AFTER-COMMIT: tokenContract.allowance=${
            (await tokenContract.allowance(acct.address, proxyContractAddress)).asFloat
        }`
    );
    logger.info(
        `AFTER-COMMIT: contractBalanceAfterCommit=${contractBalanceAfterCommit.asFloat}: DELTA = ${
            contractBalanceAfterCommit.asFloat - startingContractBalance.asFloat
        }`
    );

    if (contractBalanceAfterTransferBeforeCommit.asFloat != startingContractBalance.asFloat) {
        logger.error(
            `oops, expected balance unchanged before commit: but got: afterDepositBalanceButBeforeCommit=${contractBalanceAfterTransferBeforeCommit.asFloat}, startingContractBalance=${startingContractBalance.asFloat} `
        );
        errors = true;
    }
    if (
        !closeTo(
            startingContractBalance.asFloat - contractBalanceAfterCommit.asFloat,
            approveAmt.asFloat,
            0.02 * recipients.length
        )
    ) {
        logger.error(
            `oops, expected balance change of ${approveAmt.asFloat}, but got: contractBalanceAfterCommit=${contractBalanceAfterCommit.asFloat}, startingContractBalance=${startingContractBalance.asFloat} `
        );
        errors = true;
    }

    if (errors) {
        logger.error("Token Contract WITH atomics Test - FAILURE");
    } else {
        logger.info("Token Contract WITH atomics Test - SUCCESS");
    }
}

const topLevel = async function () {
    try {
        await tokenContractWithoutAtomics();
        await tokenContractWithAtomics();
    } catch (e: any) {
        logger.error(`Caught exception: ${e.message}`);
    }
};

topLevel();
