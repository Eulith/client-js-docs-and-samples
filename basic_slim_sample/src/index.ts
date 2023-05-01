import * as Eulith from "eulith-web3js-core";

import config from "./common-configuration";

const provider = new Eulith.Provider({ serverURL: config.serverURL, refreshToken: config.refreshToken });

async function createContract() {
    const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });
    const contractAddress1: string = await Eulith.OnChainAgents.contractAddress({ provider, authoriziedSigner: acct });
    console.log("acct.address=", acct.address);
}

async function helloWorld() {
    const ew3 = new Eulith.Web3({ provider });
    console.log(`chainID = ${await ew3.eth.getChainId()}`);
}

const topLevel = async function () {
    await helloWorld();
    await createContract();
};

topLevel();
