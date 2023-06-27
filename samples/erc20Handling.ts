import * as Eulith from "eulith-web3js";

import config from "./commonConfiguration";
import {TransactionReceipt} from "web3-core";
import {printBanner} from "./banner";

const provider = new Eulith.Provider({
  network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
  refreshToken: config.refreshToken
});

function getAddressFromPrivateKey(w: string) {
  return new Eulith.Signing.LocalSigner({ privateKey: w }).address;
}

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });

const recipient = getAddressFromPrivateKey(config.Wallet2);

/*
 *  Simple example of ERC20 transfers (with contract.transfer). Note you could also do this with
 *  transferFrom if the circumstances require.
 */
async function simpleERC20Transfer() {
  printBanner();

  const usdcContract = await Eulith.Tokens.getTokenContract({
    provider,
    symbol: Eulith.Tokens.Symbols.USDC
  });

  const transferAmount = usdcContract.asTokenValue(1.0); // one dollar

  const beforeRecipientBalance = (await usdcContract.balanceOf(recipient)).asFloat;
  console.log(`Before transfer recipient balance: ${beforeRecipientBalance}`);

  const txReceipt: TransactionReceipt = await usdcContract
    .transfer(
      recipient,
      usdcContract.asTokenValue(transferAmount.asFloat),
      { from: acct.address, to: usdcContract.address, gas: 1000000 }
    )
    .signAndSendAndWait(acct, provider);
  console.log(`Transfer tx hash: ${txReceipt.transactionHash}`);

  const afterRecipientBalance = (await usdcContract.balanceOf(recipient)).asFloat;
  console.log(`After transfer recipient balance: ${afterRecipientBalance}`);
}

(async () => {
  try {
    await simpleERC20Transfer();
  } catch (error) {
    console.error('error: ', error);
  }
})();
