import { expect, it } from "@jest/globals";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";
import { runOnePendleSwap } from "../fixture/pendle";

const provider = commonConfig.provider;

const SY_STETH_DEC25_MARKET = "0xC374f7eC85F8C7DE3207a10bB1978bA104bdA3B2";

it("testPendleQuote", async () => {
  const quote = await Eulith.Pendle.quotePt(provider, 10, SY_STETH_DEC25_MARKET);
  expect(quote.priceDenomUnderlying).toBeLessThan(1);
});

it("testPendleSwap", async () => {
  const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
  const ew3 = new Eulith.Web3({ provider, signer: acct });

  const wethToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });
  const stEthToken = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.STETH });

  await runOnePendleSwap(ew3, provider, acct, {
    sellToken: wethToken.address,
    buyToken: Eulith.Pendle.MarketSymbol.PT,
    sellAmount: 0.1,
    slippage: 0.01,
    pendleMarket: SY_STETH_DEC25_MARKET,
    recipient: acct.address,
  });

  await runOnePendleSwap(ew3, provider, acct, {
    sellToken: wethToken.address,
    buyToken: Eulith.Pendle.MarketSymbol.YT,
    sellAmount: 0.1,
    slippage: 0.01,
    pendleMarket: SY_STETH_DEC25_MARKET,
    recipient: acct.address,
  });

  await runOnePendleSwap(ew3, provider, acct, {
    sellToken: Eulith.Pendle.MarketSymbol.PT,
    buyToken: Eulith.Pendle.MarketSymbol.YT,
    sellAmount: 0.01,
    slippage: 0.01,
    pendleMarket: SY_STETH_DEC25_MARKET,
    recipient: acct.address,
  });

  await runOnePendleSwap(ew3, provider, acct, {
    sellToken: Eulith.Pendle.MarketSymbol.YT,
    buyToken: Eulith.Pendle.MarketSymbol.PT,
    sellAmount: 0.01,
    slippage: 0.01,
    pendleMarket: SY_STETH_DEC25_MARKET,
    recipient: acct.address,
  });

  await runOnePendleSwap(ew3, provider, acct, {
    sellToken: Eulith.Pendle.MarketSymbol.PT,
    buyToken: stEthToken.address,
    sellAmount: 0.01,
    slippage: 0.01,
    pendleMarket: SY_STETH_DEC25_MARKET,
    recipient: acct.address,
  });

  await runOnePendleSwap(ew3, provider, acct, {
    sellToken: Eulith.Pendle.MarketSymbol.YT,
    buyToken: stEthToken.address,
    sellAmount: 0.01,
    slippage: 0.01,
    pendleMarket: SY_STETH_DEC25_MARKET,
    recipient: acct.address,
  });
});
