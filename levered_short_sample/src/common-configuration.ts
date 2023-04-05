const serverURL: string = process.env.EULITH_URL ?? "https://eth-main.eulithrpc.com/";
const refreshToken: string =
    process.env.EULITH_REFRESH_TOKEN ??
    "<<SEE https://docs.eulith.com/v/srG7S9J4U0bx5OMNR41S/authentication/authentication>>";
const Wallet1: string = process.env.EULITH_TEST_WALLET1 ?? "<<NEED ACCT ID IN HEX - APX 40 HEX CHARS>>";

export default {
    serverURL,
    refreshToken,
    Wallet1
};
