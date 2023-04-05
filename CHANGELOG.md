# CHANGELOG

Summary of recent changes (in reverse chronological order);
Changes from sub-projects like eulith-web3js-core, and eulith-web3js-kms, and eulith-web3js-pino
are lumped here.

This changlog also contains changes to samples, even thought they are published
in [https://github.com/Eulith/clients-samples-web3js](https://github.com/Eulith/clients-samples-web3js)

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
