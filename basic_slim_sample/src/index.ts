import * as Eulith from "eulith-web3js-core";

import config from "./common-configuration";

async function createContract() {
    const ew3 = new Eulith.Web3({
        provider: new Eulith.Provider({
            serverURL: config.serverURL,
            refreshToken: config.refreshToken,
        }),
    });
    const acct = new Eulith.LocalSigner({
        privateKey:
            "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7",
    });
    const contractAddress1: string = await ew3.ensureToolkitContract(
        acct.address
    );
    console.log("acct.address=", acct.address);
}

async function helloWorld() {
    const ew3 = new Eulith.Web3({
        provider: new Eulith.Provider({
            serverURL: config.serverURL,
            refreshToken: config.refreshToken,
        }),
    });
    console.log(`chainID = ${await ew3.eth.getChainId()}`);
}

const topLevel = async function () {
    await helloWorld();
    await createContract();
};

topLevel();
