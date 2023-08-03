import * as Eulith from "../../src";

const WAIT_INTERVAL_MS = 500;
const MAX_WAIT_COUNT = 60;  // 500ms * 60 = 30 sec timeout

export async function waitForAce(ew3: Eulith.Web3, authAddress: string) {
  let count = 0;
  while (count < MAX_WAIT_COUNT) {
    try {
      await ew3.eulithPingAce(authAddress);
      return;
    } catch {
      // continue
    }

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(WAIT_INTERVAL_MS);
    count++;
  }

  throw new Error("timed out waiting for ACE connection");
}
