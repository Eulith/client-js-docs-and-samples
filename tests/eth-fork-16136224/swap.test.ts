import { it } from "@jest/globals";
import Web3 from "web3";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";
import { runOneSwap } from "../fixture/swap";

const provider = commonConfig.provider;

it("testSwapRouteThroughZeroEx", async () => {
    const recipient: string = Web3.utils.toChecksumAddress("0x8Ef090678C0B80F6F4aD8B5300Ccd41d22940968");
    const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });

    await runOneSwap({
        provider,
        recipient: recipient,
        routeThrough: Eulith.Swaps.Provider.ZERO_EX,
        signer: acct
    });
});

it("testSwapRouteThroughOneInch", async () => {
    const recipient: string = Web3.utils.toChecksumAddress("0x47256A41027e94d1141Dd06f05DcB3ddE0421551");
    const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });

    await runOneSwap({
        provider,
        recipient: recipient,
        routeThrough: Eulith.Swaps.Provider.ONE_INCH,
        signer: acct
    });
});

it("testSwapNonAtomic", async () => {
    const recipient: string = Web3.utils.toChecksumAddress("0xA03D1c3A6954Be49115605Ce9a0b46cb9d7f3517");
    const acct = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });

    await runOneSwap({
        provider,
        recipient: recipient,
        routeThrough: Eulith.Swaps.Provider.ONE_INCH,
        signer: acct,
        atomic: false
    });
});

it("testSwapThroughAce", async () => {
    const ownerAccount = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
    const recipient: string = Web3.utils.toChecksumAddress("0x707079dc0ca5cc7c162a1c1ba5bb25d969de7488");
    await runOneSwap({
        provider,
        recipient,
        routeThrough: Eulith.Swaps.Provider.ONE_INCH,
        signer: ownerAccount,
        ace: true
    });
});
