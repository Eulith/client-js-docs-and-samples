import { KMSClientConfig } from "@aws-sdk/client-kms";

const serverURL: string =
    process.env.EULITH_URL ?? "https://eth-main.eulithrpc.com/";
const refreshToken: string =
    process.env.EULITH_REFRESH_TOKEN ??
    "<<SEE https://docs.eulith.com/v/srG7S9J4U0bx5OMNR41S/authentication/authentication>>";
const Wallet1: string =
    process.env.EULITH_TEST_WALLET1 ??
    "<<NEED ACCT ID IN HEX - APX 40 HEX CHARS>>";

const awsKMSKeyID =
    process.env.EULITH_TEST_KMS_AWS_KMS_KEYID ??
    "<<TBD - DESCRIBE WHERE TO GET THIS # FROM>>";
const kmsClientConfig: KMSClientConfig = {
    region: process.env.EULITH_TEST_KMS_AWS_REGION ?? "us-east-1",
    credentials: {
        accessKeyId:
            process.env.EULITH_TEST_KMS_AWS_ACCESS_KEYID ?? "<access_key_id>", // '', // credentials for your IAM user with KMS access
        secretAccessKey:
            process.env.EULITH_TEST_KMS_AWS_SECRET_ACCESS_KEY ??
            "<access_secret>", // '', // credentials for your IAM user with KMS access
    },
};

export default {
    serverURL,
    refreshToken,
    Wallet1,
    awsKMSKeyID,
    kmsClientConfig,
};
