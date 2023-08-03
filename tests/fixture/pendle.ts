import * as Eulith from "../../src/index";
import { expect } from "@jest/globals";

export async function runOnePendleSwap(ew3: Eulith.Web3, provider: Eulith.Provider, signer: Eulith.Signing.ICryptographicSigner | Eulith.Signing.SigningService, request: Eulith.Pendle.SwapRequest) {
  const swapQuote = await Eulith.Pendle.swap(provider, request);
  const buyToken = await Eulith.Tokens.getTokenContract({ provider, address: swapQuote.buyToken });
  const sellToken = await Eulith.Tokens.getTokenContract({ provider, address: swapQuote.sellToken });

  const buyBalanceBefore = await buyToken.balanceOf(request.recipient);
  const approveTxReceipt = await sellToken.approve(swapQuote.approveAddress, sellToken.asTokenValue(1), { from: signer.address, gas: 100000 }).signAndSendAndWait(signer, provider);
  expect(approveTxReceipt.status).toBeTruthy();

  const swapTxHash = await provider.signAndSendTransaction(swapQuote.tx, signer);
  const swapTxReceipt = await Eulith.Utils.waitForTxReceipt({ web3: ew3, txHash: swapTxHash });
  expect(swapTxReceipt.status).toBeTruthy();

  const buyBalanceAfter = await buyToken.balanceOf(request.recipient);
  const diff = buyBalanceAfter.asFloat - buyBalanceBefore.asFloat;
  const error = swapQuote.buyAmount - diff;
  if (error > 0) {
    expect(error).toBeLessThan(swapQuote.buyAmount * request.slippage);
  }
}
