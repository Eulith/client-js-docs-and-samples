import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

import * as pino from "pino";

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

/*
 *  Construct a Eulith.Provider with the appropriate server and refresh token configuration, and hand it
 *  a logger wrapping the pino logger.
 */
const provider = new Eulith.Provider({
    serverURL: config.serverURL,
    refreshToken: config.refreshToken,
    logger: new Eulith.logging.PinoLogger(logger),
});

async function createContract() {
    const ew3 = new Eulith.Web3({ provider: provider });
    const acct = new Eulith.LocalSigner({ privateKey: config.Wallet1 });
    const contractAddress1: string = await ew3.ensureToolkitContract(
        acct.address
    );
    logger.info(`acct.address: ${acct.address}`);
}

async function helloWorld() {
    const ew3 = new Eulith.Web3({ provider: provider });
    logger.info(`chainID: ${await ew3.eth.getChainId()}`);
}

const topLevel = async function () {
    await helloWorld();
    await createContract();
};

topLevel();
