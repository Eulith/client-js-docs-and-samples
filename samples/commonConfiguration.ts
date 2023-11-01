const serverURL: string = process.env.EULITH_URL ?? "http://127.0.0.1:7777";

const token: string = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJzdWIiOiJsaWJ0ZXN0IiwiZXhwIjoxNzI2Nzg2OTcwLCJzZWVkIjoiYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWEiLCJwcml2aWxlZ2VzIjp7InByaXZpbGVnZXMiOlsiQWRtaW4iLCJBcm1vcldhbGxldCJdfX0.lHqmdsn0TDenOZ1PBW4FOh4b2MemHNuOyP88P6DxA5MYjpgeewR6U45db84LBv4WOoCG5MBpiSzVazllJaHTZRw";

const Wallet1: string = "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7";
const Wallet2: string = "0xddeff2733e6142c873df7bede7db29055471ebeae7090ef618996a51daa4cd8c";

export default {
    serverURL,
    token,
    Wallet1,
    Wallet2
};
