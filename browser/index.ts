import Web3 from "web3";
import * as Eulith from "eulith-web3js"; // could use 'eulith-web3js-core' to reduce dependencies

async function usingWindowFetch_(a1: any, a2: any) {
    return await window.fetch(a1, a2);
}

async function doFetchChainID() {
    const providerArgs = {
        network: Eulith.Networks.Predefined.mainnet.with({
            eulithURL: (document.getElementById("serverURL") as any).value
        }),
        refreshToken: (document.getElementById("refreshToken") as any).value
    };

    const provider = new Eulith.Provider(providerArgs);

    const web3 = new Web3(provider);
    let chainID: string | undefined;

    try {
        chainID = (await web3.eth.getChainId()).toString();
    } catch (e) {
        chainID = `Err: ${e.message}`;
    }

    document.getElementById("chainID").innerText = chainID;
}

(window as any).doFetchChainID = doFetchChainID;
