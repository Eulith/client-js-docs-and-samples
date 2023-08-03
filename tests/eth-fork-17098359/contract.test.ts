import { expect, it } from "@jest/globals";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";

const provider = commonConfig.provider;

// All these tests require running devrpc

it("testLocalChainId", async () => {
  const ew3 = new Eulith.Web3({ provider });
  expect(await ew3.eth.getChainId()).toBe(provider.network.chainId);
});

it("testErcLookup", async () => {
  const erc = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });
  expect(erc.options.address).toEqual("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  expect(erc.native.options.address).toEqual("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  expect(erc.address).toEqual(erc.native.options.address);
});

it("testCreateContract", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const agentContractAddress: string = await Eulith.OnChainAgents.contractAddress({
    provider,
    authorizedSigner: acct
  });
  expect(agentContractAddress.startsWith("0x")).toBeTruthy();
});

it("testGetAllContracts", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet2 });
  const agentContractAddress: string = await Eulith.OnChainAgents.contractAddress({
    provider,
    authorizedSigner: acct
  });
  expect(agentContractAddress.startsWith("0x")).toBeTruthy();

  const allContracts = await Eulith.OnChainAgents.getAll(provider);
  // 1 contract deployed above + 1 Armor contract deployed by devrpc + any other contracts deployed by other tests.
  expect(allContracts.length).toBeGreaterThanOrEqual(2);
});

it("testGetContract", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const contractAddress: string = await Eulith.OnChainAgents.contractAddress({
    provider,
    authorizedAddress: acct.address,
    createUncheckedAgentIfNoneExists: false
  });
  expect(contractAddress.startsWith("0x")).toBeTruthy();
});

it("testCreateContractIfNotExists", async () => {
  const ew3 = new Eulith.Web3({ provider });
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const agentContractAddress: string = await Eulith.OnChainAgents.contractAddress({
    provider: ew3,
    authorizedAddress: acct.address
  });
  const contractAddress2: string = await Eulith.OnChainAgents.contractAddress({ provider, authorizedSigner: acct });
  expect(agentContractAddress).toEqual(contractAddress2);
});

it("testSimpleTransfer", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const other = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet2 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });
  const balBefore = BigInt(await ew3.eth.getBalance(await other.address));
  const txParams = {
    from: acct.address,
    to: other.address,
    value: 12345678
  };
  await provider.signAndSendTransaction(txParams, acct);
  const balAfter = BigInt(await ew3.eth.getBalance(other.address));
  expect(balAfter - balBefore).toBe(BigInt("12345678"));
});

it("testReasonableErrorThrownWithUnknownContract", async () => {
  try {
    await Eulith.Tokens.getTokenContract({
      provider,
      symbol: "jabberwocky" as Eulith.Tokens.Symbols // make sure it won't be found
    });
    expect(false).toBe(true); // notreached
  } catch (e) {
    expect(e.message).toEqual("Unrecognized token contract"); // we don't promise exactly this message, but it should be a reasonable message, and this is what we generate now
  }
});

it("testReasonableContractAddressReturnsDecimals", async () => {
  const tokenContract = await Eulith.Contracts.ERC20TokenContract.new({
    provider,
    contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
  });
  expect(tokenContract.decimals).toBe(6);
});

it("testMultiTransfer", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });
  const one = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet3 });
  const two = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet4 });
  const three = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet5 });

  const b1Before: number = Number(await ew3.eth.getBalance(one.address));
  const b2Before: number = Number(await ew3.eth.getBalance(two.address));
  const b3Before: number = Number(await ew3.eth.getBalance(three.address));

  const atomicTransaction = new Eulith.AtomicTx.Transaction({
    provider: ew3,
    signer: acct
  });
  await atomicTransaction.addTransaction({
    from: acct.address,
    to: one.address,
    value: 12131415
  });
  await atomicTransaction.addTransaction({
    from: acct.address,
    to: two.address,
    value: 22131415
  });
  await atomicTransaction.addTransaction({
    from: acct.address,
    to: three.address,
    value: 32131415
  });
  expect(Number(await ew3.eth.getBalance(one.address))).toEqual(b1Before);
  const combinedTransactionAsTxParams = await atomicTransaction.commit();
  await provider.signAndSendTransaction(combinedTransactionAsTxParams, acct);

  expect(Number(await ew3.eth.getBalance(one.address))).toEqual(b1Before + 12131415);
  expect(Number(await ew3.eth.getBalance(two.address))).toEqual(b2Before + 22131415);
  expect(Number(await ew3.eth.getBalance(three.address))).toEqual(b3Before + 32131415);
});
