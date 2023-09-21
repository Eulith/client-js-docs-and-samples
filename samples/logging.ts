import * as Eulith from "eulith-web3js";
import config from "./commonConfiguration";
import * as pino from "pino";
import { printBanner } from "./banner";

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
                level: "trace"
            },
            {
                target: "pino-pretty",
                options: { destination: 1 },
                level: "info"
            }
        ]
    }
});

/*
 *  Construct a Eulith.Provider with the appropriate server and refresh token configuration, and hand it
 *  a logger wrapping the pino logger.
 */
const eulithAuth = Eulith.Auth.fromToken(config.refreshToken);
const provider = new Eulith.Provider({
    network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
    auth: eulithAuth,
    logger: new Eulith.Logging.PinoLogger(logger)
});

async function createContract() {
    const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });
    const contractAddress: string = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });
    logger.info(`Contract address: ${contractAddress}`);
}

async function helloWorld() {
    const ew3 = new Eulith.Web3({ provider });
    logger.info(`HelloWorld retrieved chainID: ${await ew3.eth.getChainId()}`);
}

(async () => {
    try {
        printBanner();

        await helloWorld();
        await createContract();
    } catch (error) {
        console.error("error: ", error);
    }
})();
