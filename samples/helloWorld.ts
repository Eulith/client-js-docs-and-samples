import * as Eulith from "eulith-web3js";

import config from "./commonConfiguration";
import {printBanner} from "./banner";

// Start creating a Eulith provider (like web3js provider) object, which can be used with web3js (and
// Eulith APIs to communicate with the ethereum network. This handles authentication, and networking
const provider = new Eulith.Provider({
  network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
  refreshToken: config.refreshToken
});

async function helloWorld() {
  printBanner();

  const ew3 = new Eulith.Web3({ provider });
  console.log(`Yay! You're connected to the network with chainID: ${await ew3.eth.getChainId()}`);
}

(async () => {
  try {
    await helloWorld();
  } catch (error) {
    console.error('error: ', error);
  }
})();