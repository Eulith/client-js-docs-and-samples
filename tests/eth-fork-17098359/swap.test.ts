import { expect, it } from "@jest/globals";
import Web3 from "web3";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";
import { runOneCallToSwap } from "../fixture/swap";

const provider = commonConfig.provider;

// All these tests require running devrpc

it("testCallSwapInvalidSlippageOneInch", async () => {
  const recipient: string = Web3.utils.toChecksumAddress("0x47256A41027e94d1141Dd06f05DcB3ddE0421551");
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  try {
    await runOneCallToSwap({
      provider,
      recipient,
      routeThrough: Eulith.Swaps.Provider.ONE_INCH,
      signer: acct,
      slippageTolerance: 1.5
    });
    expect(true).toBeFalsy();
  } catch (e) {
    expect(true).toBeTruthy();
  }
});

it("testCallSwapInvalidSlippageZeroEx", async () => {
  const recipient: string = Web3.utils.toChecksumAddress("0x47256A41027e94d1141Dd06f05DcB3ddE0421551");
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  try {
    await runOneCallToSwap({
      provider,
      recipient,
      routeThrough: Eulith.Swaps.Provider.ZERO_EX,
      signer: acct,
      slippageTolerance: 1.5
    });
    expect(true).toBeFalsy();
  } catch (e) {
    expect(true).toBeTruthy();
  }
});

it("testCallSwapValidSlippageOneInch", async () => {
  const recipient: string = Web3.utils.toChecksumAddress("0x47256A41027e94d1141Dd06f05DcB3ddE0421551");
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  try {
    await runOneCallToSwap({
      provider,
      recipient,
      routeThrough: Eulith.Swaps.Provider.ONE_INCH,
      signer: acct,
      slippageTolerance: 0.02
    });
    expect(true).toBeTruthy();
  } catch (e) {
    expect(true).toBeFalsy();
  }
});

it("testCallSwapValidSlippageZeroEx", async () => {
  const recipient: string = Web3.utils.toChecksumAddress("0x47256A41027e94d1141Dd06f05DcB3ddE0421551");
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  try {
    await runOneCallToSwap({
      provider,
      recipient,
      routeThrough: Eulith.Swaps.Provider.ZERO_EX,
      signer: acct,
      slippageTolerance: 0.02
    });
    expect(true).toBeTruthy();
  } catch (e) {
    expect(true).toBeFalsy();
  }
});

it("testCallSwapUnexpectedLiquiditySourceFromServerOneInch", async () => {
  const recipient: string = Web3.utils.toChecksumAddress("0x47256A41027e94d1141Dd06f05DcB3ddE0421551");
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  try {
    await runOneCallToSwap({
      provider,
      recipient,
      routeThrough: Eulith.Swaps.Provider.ONE_INCH,
      signer: acct,
      liquiditySource: Eulith.Swaps.LiquiditySource.UNISWAP_V3,
      slippageTolerance: 0.02
    });
    expect(true).toBeFalsy();
  } catch (e) {
    expect(true).toBeTruthy();
  }
});

it("testCallSwapUnexpectedLiquiditySourceFromServerZx", async () => {
  const recipient: string = Web3.utils.toChecksumAddress("0x47256A41027e94d1141Dd06f05DcB3ddE0421551");
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  try {
    await runOneCallToSwap({
      provider,
      recipient,
      routeThrough: Eulith.Swaps.Provider.ZERO_EX,
      signer: acct,
      liquiditySource: Eulith.Swaps.LiquiditySource.UNISWAP_V3,
      slippageTolerance: 0.02
    });
    expect(true).toBeFalsy();
  } catch (e) {
    expect(true).toBeTruthy();
  }
});

it("testCallSwapExpectedLiquiditySourceFromServerOi", async () => {
  const recipient: string = Web3.utils.toChecksumAddress("0x47256A41027e94d1141Dd06f05DcB3ddE0421551");
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  try {
    await runOneCallToSwap({
      provider,
      recipient,
      routeThrough: Eulith.Swaps.Provider.ONE_INCH,
      signer: acct,
      liquiditySource: Eulith.Swaps.LiquiditySource.UNISWAP_V2,
      slippageTolerance: 0.02
    });
    expect(true).toBeTruthy();
  } catch (e) {
    expect(true).toBeFalsy();
  }
});

it("testCallSwapExpectedLiquiditySourceFromServerZx", async () => {
  const recipient: string = Web3.utils.toChecksumAddress("0x47256A41027e94d1141Dd06f05DcB3ddE0421551");
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  try {
    await runOneCallToSwap({
      provider,
      recipient,
      routeThrough: Eulith.Swaps.Provider.ZERO_EX,
      signer: acct,
      liquiditySource: Eulith.Swaps.LiquiditySource.CURVE_V2,
      slippageTolerance: 0.02
    });
    expect(true).toBeTruthy();
  } catch (e) {
    expect(true).toBeFalsy();
  }
});
