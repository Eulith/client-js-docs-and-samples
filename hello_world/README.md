# Eulith web3js client access - hello world

Hello world, from scratch.
### Features

- Trivial to integrate into your existing web3js - based application. 
- Not opinionated
- Typescript typings
- Minimal dependencies

### Getting started

~~~
mkdir hello; cd hello
npm init -y
npm install typescript --save-dev
npx tsc --init
npm i eulith-web3js
cp {below-index.ts} index.ts
npx tsc && node index.js
~~~

#### Reference Files

- index.ts

~~~
import Web3 from 'web3';
import * as Eulith from 'eulith-web3js';

export const serverURL: string = process.env.EULITH_URL ?? "https://eth-main.eulithrpc.com/";
export const refreshToken: string = process.env.EULITH_REFRESH_TOKEN ?? "<<SEE https://docs.eulith.com/v/srG7S9J4U0bx5OMNR41S/authentication/authentication>>";

async function helloWorld() {
  const web3 = new Web3(new Eulith.Provider({ serverURL: serverURL, refreshToken: refreshToken }));
  console.log(`chainID = ${await web3.eth.getChainId()}`);
}

helloWorld();
~~~