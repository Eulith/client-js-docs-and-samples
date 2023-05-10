# CHANGELOG

Summary of recent changes (in reverse chronological order);
Changes from sub-projects like eulith-web3js-core, and eulith-web3js-kms, and eulith-web3js-pino
are lumped here.

This changlog also contains changes to samples, even thought they are published
in [https://github.com/Eulith/clients-samples-web3js](https://github.com/Eulith/clients-samples-web3js)


## 0.3.1-beta.13 {2023-05-10}

- Eulith.Networks<br>
  New feature - Network object and Predefined network objects - (Eulith.Provider now takes Network object instead of serverURL).
- Eulith.Signing
  - refactored - Eulith.UnsignedTransaction => Eulith.Signing.UnsignedTransaction
- Eulith.AtomicTx refactor/rename
  - Migrate AtomicTx and SubAtomicTx as Eulith.AtomicTx.Transaction and Eulith.AtomicTx.NestedTransaction

## 0.3.1-beta.12 {2023-05-08}

- OnChainAgents
  - enableArmor support
  - assertions for clarity error checking in createArmorAgent (etc)
- Signing
  - new ITransactionSigningSender, and support in SigningService, so you can now call
    (on signingService) sendTransaction (key to interaction with signTransaciton with WAGMI/METAMASK)
  - BIG restructuring of UnsignedTransaciton signing support to be indirected through signingService. 

## 0.3.1-beta.11 {2023-05-03}

- Some namespace cleanups
- Attempted support auto-create-safe in createArmor (total fail)
- atomic, uniswap, flash, utils.fillTransactionDefaults, etc, cleanups relating to namespaces, Provider|Web3 support, etc
- assertions cleanups (assert method by itself produces terrible messages).
- armorAgent cleanups/signing fixes relating to running from react

## 0.3.1-beta.10 {2023-05-01}

- New On-Chain Agents API
  - Basically quite similar to ToolkitContract, which it replaces (now deprecated).
  - But it subsumes new armor on-chain agents and newly renamed 'unchecked' on-chain agents
- New Signing service API
  - abstraction of various kinds of signing, in a way that neatly allowes 'SigningService' objects
    to support and advertise what they can, given how they were constructed (signing hashes, or personal messages
    or transactions or typedData).
- Some module renaming/refactoring/cleanups - mostly just using Captialized names for the intermediate
  modules as typescript docs do in their examples (not the way web3js does in its implementation).
  - improved and better documented the typescript issues with modules
- Use more of assertions to cleanup error checking in the ts-client code.
- New DEPENDENCY
  - @metamask/eth-sig-util - used for crytographic-signing based signing of typed data 
- Fixed serious bug with Eulith.Signing.ECDSASignature CTOR - which caused signTypedData to occasionally produce
  answers the Eulith call server would reject (left padding).
- New DESIGN-NOTES.md file

## 0.3.1-beta.9 {2023-04-25}

- Safe support
  - draft Toolkit.createArmor, Toolkit.authorizeArmorForOwner APIs (names will change next release)
  - new depdendencies in library-core for safe
- Restructure test scripts and github actions to run some on fork from block 16136224, and some on fork from block 17098359
- Adjusted several samples to start using slightly smarter gas computation, and generally lowered amounts due to issues with
  the blocks we forked from, and how call 'pre-seeds' accounts
- lose doAssertionChecks from signAndSendTransaction code
- improved build / testing scripts
- more workarounds for browser sample webpack version 5 issue
- improved error reporting in Provider for JSONRPC calls (still needs love)

## 0.3.1-beta.6 {2023-04-14}

- Modules
  - Signing
    - Misc cleanups
    - hashMessage to use ethereumjsUtil.hashPersonalMessage
    - test cases to support one queer aspect of web3js hashMessage api
    - canonicalize now takes signer arg, and Eulith.utils.fillTransactionDefaults now REQUIRES a from be specified or it throws - needed for computing nonce
    - Use bigint-buffer to avoid depending on BN, and use it to read Buffer values properly, and document this is what is done by ECDSASignature class (fixes occasional bug when using signTransaction alot)
    - deprecated old ISigner API signTransaction, and switched (I think fully) to using new API (signHash). All tests still pass
  - Major revamp of UnsignedTransation code to support new signing API. Works, but is not fully hooked in replacing previous API
  - KMS - support new signing API
- Samples
  - Improvements to KMS Sample (mostly use of new API to test)
- Library
  - lose workarounds to cryto load code - since fixed module issue(s)
  - Documentation improvements
  - Add dependency on bigint-buffer
  - convert to using assertions library - but not node:assert - the npm assert since mostly compatible and compat with browsers - I hope
- Tests
  - no longer log to console (just to file)
  - Much improved signing tests (for new API)

## 0.3.1-beta.5 {2023-04-06}

- Modules
  - Experiemental use of typescript module mechanism in Uniswap code, to address issues with nested types
    - much cleaner, if it works well in browser/react world
  - UNRELATED - module possible fix - issue if I'm right - was with import vs require, so
    reverted 'workarounds' on axios/crypto to see if they still work
  - cleanup/tsconfig.json file (was trying to work on esmodule issue but may have found it elsewhere)
- Samples
  - cosmetic cleanups
- Test
  - use jest --runInBand because doing tests asynchronously doesn't work with the transaction numbering scheme used by ethereum for nonces
  - lose main/delay function in regtests - not hepling with warnings about not finishing
- ToolkitContract
  - fixed bad names (internal) in procedure
- Uniswap
  - MASSIVE cleanup of namespace/module stuff for Uniswap
- Flash
  - cleanup Flash Fee calculations - feeAmt returns array of tokens, feePct replaces old 'fee' (deprecation)
- Signing
  - Light draft of new signing regtests, and progress trying to use techniques from kms code for basic
    signining refactor, but still alot todo

## 0.3.1-beta.4 {2023-04-05}

- ToolkitContract
  - more thorough renaming of use/comments to use this terminology (toolkitContractAddress vs proxyContractAddress)
- AtomicTx
  - change atomicID bug workaround (crypt/math.random) to lose the period in number
- Tokens
  - new optional address parameter to getTokenContract
  - ERC20 Token contract
    - new symbol accessor
  - ERC20 Token Value
    - new read-only properties
      - symbol
      - asDisplayString
- Uniswap support
  - major cleanups and docs for this module
    - getSwapPool takes tokenContracts array
      - instead of parentTx takes provider
      - now REQUIRES fee parameter (before erroneously optional)
    - Uniswap CTOR deprecated along with getBestPriceQuote instance method, replacing it with static Eulith.Uniswap.getBestPriceQuote method
    - Added experimental Unitswap.PriceQuote instance feeAmt property - ask Kristian/Moh if better - see example use in direct_uniswap sample
- Build System
  - saved package-lock-dist.json and scripted save
  - changed prettier trailingComma to none
  - update to use web3js 1.9.0 (^ in version) 
- Samples
  - General code/comment cleanups
    - leverged short
    - atomic token contract
  - New direct_uniswap_sample
  - Browser sample
    - need one more polyfill

## 0.3.1-beta.3

- Documentation and sample improvements (modest)
- deprecated Eulith.ToolkitContract.proxyAddress, use Eulith.ToolkitContract.address instead
- workaround react/cryto lib issue with AtomicTx (still must root cause analysis/fix)
- internal work preparing for new UnsignedTransaction APIs (no real changes)
- other internal changes, regression test etc

## 0.3.1-beta.2

- Documentation improvements
- New location/handling of CHANGELOG.md
- new Eulith.ToolkitContract class
  - deprecate Eulith.Web3.ensureToolkitContract: use Eulith.ToolkitContract.proxyAddress instead
  - deprecate Eulith.Web3.getProxyAddress and Eulith.Web3.createProxy (migrate to use of ToolkitContract object)
- Eulith.AtomicTx
  - fixed atomictx issue with addTransaction - must wait on toolkit contract creation internally
  -  deprecated Eulith.AtomicTx.ensureContractToolkit and Eulith.Web3.ensureToolkitContract: use use Eulith.ToolkitContract.proxyAddress instead
- Contracts API
  - fixed mistake with return types of 'BigInt' methods on token-values  - use bigint, not BigInt
  - fixed bug constructing ERC20 contract by address (omariBugReportsERC20ContractByAddress)
- internal
  - regression tetsts
     - cleanup regtest test_start_uniswap_v3_swap
  - code cleanups 
    - mostly provider:provider => provider

## 0.3.1-beta.1

- Try using beta channel for pre-release version of eulith-web3js
- Improved docs and this CHANGELOG
- throwOnFailure behavior in waitForTxReceipt
- fixed token-value toFundemental code - must round after float operations
- Internal cleanups (including await usage).
- Eulith.Provider
  - minor tweaks - less aggessive tracelog; 
  - comments, and smarter cache/reuse of api token cloning
- Eulith.contracts.ERC20TokenContract
  - allowance helper method supported
- Eulith.AtomicTx
  - docs 
  - new Eulith.AtomicTx.ensureToolkitContract and optional atomictx::CTOR proxyContractAddress arg
- Samples
  - much improved atomic_token_contract_sample, and bug fixed in levered_short sample
  - typescript inline sources and sourcemap in sample tsconfigs
