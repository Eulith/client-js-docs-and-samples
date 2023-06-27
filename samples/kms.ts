import {KMSClient, KMSClientConfig} from "@aws-sdk/client-kms";

import * as Eulith from "eulith-web3js";

import config from "./commonConfiguration";
import {printBanner} from "./banner";

const awsKMSKeyID = process.env.EULITH_TEST_KMS_AWS_KMS_KEYID ?? "<kms_key_id>";

const kmsClientConfig: KMSClientConfig = {
  region: process.env.EULITH_TEST_KMS_AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.EULITH_TEST_KMS_AWS_ACCESS_KEY ?? "<access_key_id>", // '', // credentials for your IAM user with KMS access
    secretAccessKey: process.env.EULITH_TEST_KMS_AWS_SECRET_ACCESS_KEY ?? "<access_secret>" // '', // credentials for your IAM user with KMS access
  }
};

const main = async () => {
  const client = new KMSClient(kmsClientConfig);
  console.log(`AWS-KMS KeyID: ${awsKMSKeyID}`);

  const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });

  const provider = new Eulith.Provider({
    network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
    refreshToken: config.refreshToken
  });

  const kmsSigner = await Eulith.KMSSigner.mk(client, awsKMSKeyID);
  const kmsWallet = new Eulith.Signing.SigningService({ provider, cryptographicSigner: kmsSigner });

  console.log(`AWS-KMS Public key: ${kmsSigner.publicKey}`); // informational, no need to call
  console.log(`Ethereum Address: ${kmsWallet.address}`); // ''

  const ew3 = new Eulith.Web3({ provider });

  // Send some ETH to the KMS wallet
  let txReceiptHash = await provider.signAndSendTransaction(
    {
      from: acct.address,
      to: kmsWallet.address,
      value: 1213141500000000
    },
    acct
  );
  await ew3.eth.getTransactionReceipt(txReceiptHash);

  // Send the ETH back to from the KMS wallet
  txReceiptHash = await provider.signAndSendTransaction(
    {
      from: kmsWallet.address,
      to: acct.address,
      value: 12131415
    },
    kmsWallet
  );
  const txReceipt = await ew3.eth.getTransactionReceipt(txReceiptHash);

  console.log(`Tx hash signed by KMS wallet: ${txReceipt.transactionHash}`);
};

(async () => {
  try {
    printBanner();

    await main();
  } catch (error) {
    console.error('error: ', error);
  }
})();