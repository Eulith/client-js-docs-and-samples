import Web3 from "web3";
import * as Eulith from "eulith-web3js";        // could use 'eulith-web3js-core' to reduce dependencies

async function usingWindowFetch_(a1: any, a2: any) {
    return await window.fetch(a1, a2);
}

async function doFetchChainID() {
    const providerArgs = {
        serverURL: (document.getElementById("serverURL") as any).value,
        refreshToken: (document.getElementById("refreshToken") as any).value,
        // fetcherInstance: usingWindowFetch_           // defaults to axios, but do this to use fetch
    };

    const provider = new Eulith.Provider(providerArgs);
    // console.log("constructoed provider");
    const web3 = new Web3(provider);
    let chainID: string | undefined;
    try {
        chainID = await (await web3.eth.getChainId()).toString();
    } catch (e) {
        chainID = `Err: ${e.message}`;
    }
    // console.log ('chainid=', chainID)
    document.getElementById("chainID").innerText = chainID;
}
(window as any).doFetchChainID = doFetchChainID;
