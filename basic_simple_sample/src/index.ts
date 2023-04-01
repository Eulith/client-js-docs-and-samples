import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

// Start creating a Eulith provider (like web3js provider) object, which can be used with web3js (and
// Eulith APIs to communicate with the ethereum network. This handles authentication, and networking
const provider = new Eulith.Provider({ serverURL: config.serverURL, refreshToken: config.refreshToken });

async function helloWorld() {
    const ew3 = new Eulith.Web3({ provider });
    console.log(`chainID = ${await ew3.eth.getChainId()}`);
}

const topLevel = async function () {
    await helloWorld();
};

topLevel();
