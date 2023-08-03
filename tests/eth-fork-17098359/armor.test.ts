import { expect, it } from "@jest/globals";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";

const provider = commonConfig.provider;

// All these tests require running devrpc

it("testCreateArmor", async () => {
    const owner = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
    const accountToBeAuthorizedToUseArmor = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet4 }); // account that will be signing future requests on the armor contract
    try {
        const armorAgent = await Eulith.OnChainAgents.armorAgent({
            provider,
            authorizedAddress: accountToBeAuthorizedToUseArmor.address
        });
        expect(armorAgent.contractAddress.startsWith("0x"));
    } catch (e: any) {
        const armorAgent = await Eulith.OnChainAgents.createArmorAgent({
            provider,
            authorizedAddress: accountToBeAuthorizedToUseArmor.address,
            setupSigner: owner
        });
        expect(armorAgent.contractAddress.startsWith("0x"));
    }
});

it("testAuthorizeArmorForOwnerAndEnable", async () => {
    const ownerAccount = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });

    const accountToBeAuthorizedToUseArmor = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet4 });

    try {
        await Eulith.OnChainAgents.armorAgent({ provider, authorizedAddress: accountToBeAuthorizedToUseArmor.address });
    } catch (e: any) {
        provider.logger?.log(
            Eulith.Logging.LogLevel.INFO,
            `Failed to access existing armorAgent, so creating a new one for test(${e.message})`
        );
        await Eulith.OnChainAgents.createArmorAgent({
            provider,
            authorizedAddress: accountToBeAuthorizedToUseArmor.address,
            setupSigner: ownerAccount
        });
    }

    const agent = await Eulith.OnChainAgents.armorAgent({
        provider,
        authorizedAddress: accountToBeAuthorizedToUseArmor.address
    });

    await agent.authorizeForOwner(provider, ownerAccount);

    await agent.enableArmor(provider, ownerAccount, {
        newSafe: { owners: [ownerAccount.address], approvalThreshold: 1 }
    });
});

it("testClientWhitelists", async () => {
    const owner = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet1 });
    const armorAgent = await Eulith.OnChainAgents.armorAgent({ provider, authorizedSigner: owner });

    const whitelistContents = [
        "0x00a329c0648769a73afac7f9381e08fb43dbea72",
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    ];

    const listId = await Eulith.Whitelists.createDraftClientWhitelist(provider, owner.address, whitelistContents);

    const localSigner1 = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet2 });
    const whitelistSigner1 = Eulith.Signing.SigningService.assure(localSigner1, provider);

    let isPublished = await Eulith.Whitelists.submitDraftClientWhitelistSignature(provider, listId, whitelistSigner1);
    expect(isPublished).toBeFalsy();

    const localSigner2 = new Eulith.Signing.LocalSigner({ privateKey: commonConfig.Wallet5 });
    const whitelistSigner2 = Eulith.Signing.SigningService.assure(localSigner2, provider);

    isPublished = await Eulith.Whitelists.submitDraftClientWhitelistSignature(provider, listId, whitelistSigner2);
    expect(isPublished).toBeTruthy();

    let currentWhitelists = await Eulith.Whitelists.getCurrentClientWhitelist(provider, owner.address);
    expect(currentWhitelists.active).not.toBeNull();
    expect(currentWhitelists.draft).toBeNull();
    expect(currentWhitelists.active.listId).toEqual(listId);
    expect(currentWhitelists.active.sortedAddresses).toEqual(whitelistContents);

    const whitelistContents2 = [
        "0xda100f8ef9e189d11b4ede3390946cdbc44de1bd",
        "0xf66f011b13635d94400ae28729f480fd0bba7d03"
    ];

    const listId2 = await Eulith.Whitelists.createDraftClientWhitelist(provider, owner.address, whitelistContents2);
    expect(listId2).not.toEqual(listId);

    currentWhitelists = await Eulith.Whitelists.getCurrentClientWhitelist(provider, owner.address);
    expect(currentWhitelists.active).not.toBeNull();
    expect(currentWhitelists.active.listId).toEqual(listId);
    expect(currentWhitelists.draft).not.toBeNull();
    expect(currentWhitelists.draft.listId).toEqual(listId2);

    const deleted = await Eulith.Whitelists.deleteDraftClientWhitelist(provider, listId2);
    expect(deleted).toBeTruthy();

    currentWhitelists = await Eulith.Whitelists.getCurrentClientWhitelist(provider, owner.address);
    expect(currentWhitelists.active).not.toBeNull();
    expect(currentWhitelists.draft).toBeNull();
});
