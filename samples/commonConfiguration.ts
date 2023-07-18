const serverURL: string = process.env.EULITH_URL ?? "http://127.0.0.1:7777";
const refreshToken: string =
    process.env.EULITH_REFRESH_TOKEN ??
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ." +
        "eyJzdWIiOiJsaWJ0ZXN0IiwiZXhwIjoxODQ0Njc0NDA3MzcwOTU1MTYxNSwic291cmNlX2hhc2giOiIqIiwic2NvcGUiOiJBUElSZW" +
        "ZyZXNoIn0.G87Tv9LwLH8SRgjlVKIAPk1pdavVS0xwz3fuB7lxP0Et-pPM7ojQkjC1zlC7zWYUdh9p3GvwX_ROfgSPJsw-Qhw";

const Wallet1: string =
    process.env.EULITH_TEST_WALLET1 ?? "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7";
const Wallet2: string =
    process.env.EULITH_TEST_WALLET2 ?? "0xddeff2733e6142c873df7bede7db29055471ebeae7090ef618996a51daa4cd8c";

export default {
    serverURL,
    refreshToken,
    Wallet1,
    Wallet2
};
