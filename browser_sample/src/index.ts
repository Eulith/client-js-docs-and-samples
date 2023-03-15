import Web3 from "web3";
// import * as Eulith from 'eulith-web3js-core';
import * as Eulith from "eulith-web3js";

async function doFetchChainID() {
    const providerArgs = {
        serverURL: (document.getElementById("serverURL") as any).value,
        refreshToken: (document.getElementById("refreshToken") as any).value,
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

// async function helloWorld(): Promise<string> {
//     const provider = new Eulith.Provider(providerArgs);
//     console.log("constructoed provider");
//     const web3 = new Web3(provider);
//     let chainID: string | undefined;
//     try {
//         chainID = await (await web3.eth.getChainId()).toString();
//     } catch (e) {
//         chainID = `Err: ${e.message}`;
//     }
//     return ["Hello", "webpack", "using", "chainid", chainID].join(" ");
// }
// async function component() {
//     const element = document.createElement("div");
//     element.innerHTML = await helloWorld();
//     return element;
// }

// component().then((a) => document.body.appendChild(a));
