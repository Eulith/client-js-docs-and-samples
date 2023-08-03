import { expect, it } from "@jest/globals";
import * as axios from "axios";

import * as Eulith from "../../src";

import commonConfig from "../commonConfiguration";

const provider = commonConfig.provider;

// All these tests require running devrpc

it("testUseRefreshTokenAsUrlParam", async () => {
    // The default provider here is using refresh token auth in the URL
    const ew3 = new Eulith.Web3({ provider });
    expect(await ew3.eth.getChainId()).toBe(1);
});

it("testUseUserToken", async () => {
    const a = axios.default.create({});

    // These credentials come from devrpc
    const r = await a.post("/v0/user/token", {
        sub: "libtest",
        password: "test"
    }, {
        headers: { "Content-Type": "application/json" },
        baseURL: commonConfig.serverURL
    });

    const userToken = r.data.token;

    const userTokenProvider = new Eulith.Provider({
        network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: commonConfig.serverURL }),
        auth: Eulith.Auth.fromUserToken(userToken),
    });

    const ew3 = new Eulith.Web3({ provider: userTokenProvider });
    expect(await ew3.eth.getChainId()).toBe(1);
});
