import * as Eulith from "../../src/index";
import Safe from "@safe-global/safe-core-sdk";
import { EthAdapter } from "@safe-global/safe-core-sdk-types";
import { Web3Adapter } from "@safe-global/protocol-kit";
import { expect } from "@jest/globals";

export async function setupArmor(
    provider: Eulith.Provider,
    acct: Eulith.Signing.LocalSigner
): Promise<Eulith.OnChainAgents.IArmorAgent> {
    const agent = await Eulith.OnChainAgents.createArmorAgent({
        provider,
        authorizedAddress: acct.address,
        setupSigner: acct
    });

    const ownerKeys = [
        "0x59d060b1d6ae7c494a2c911c200429e02bfb4714d948c684261b696ed7077833",
        "0xa39004547e27a0314969c82662733328fd7ce36b373460687a205a69fbb8b699",
        "0xd81ea7876bd225b70410448225e4121fbeacb2bbc13b49c00396b622e9fb06a1",
        "0xcf9ac1ec7666006d91173960ede131cc01f1a11eccdfa1ab593385da04878721",
        "0x2f2073f613ff2651f2114e26e8cca6e49a73b719dd728c6915eeb0c20534c32e",
        "0x1e780eaf6fed0ce7aca07418d97df74d5a004e394851b127b8c701b725e8400d"
    ];

    const ownerAddresses = [];
    for (const ownerKey of ownerKeys) {
        const signer = new Eulith.Signing.LocalSigner({ privateKey: ownerKey });
        ownerAddresses.push(signer.address);
        await agent.authorizeForOwner({ provider, authorizingOwner: signer });
    }

    const threshold = 5;
    await agent.enableArmor({
        provider,
        signerForThisTx: acct,
        forSafe: { newSafe: { owners: ownerAddresses, approvalThreshold: threshold } }
    });

    const ethAdapter: EthAdapter = new Web3Adapter({
        web3: new Eulith.Web3({ provider, signer: acct }),
        signerAddress: acct.address
    });

    const safe: Safe = await Safe.create({ ethAdapter, safeAddress: agent.safeAddress });
    expect(await safe.isModuleEnabled(agent.contractAddress)).toBeTruthy();
    expect(await safe.getOwners()).toHaveLength(ownerAddresses.length);
    expect(await safe.getThreshold()).toBe(threshold);
    return agent;
}
