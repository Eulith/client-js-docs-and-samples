# CHANGELOG

Summary of recent changes (in reverse chronological order);
Changes from sub-projects like eulith-web3js-core, and eulith-web3js-kms, and eulith-web3js-pino
are lumped here.

This changlog also contains changes to samples, even thought they are published
in [https://github.com/Eulith/clients-samples-web3js](https://github.com/Eulith/clients-samples-web3js)

## 0.3.1-beta.2

- Documentation improvements
- New location/handling of CHANGELOG.md
- new Eulith.ToolkitContract class
  - deprecate Eulith.Web3.ensureToolkitContract: use use Eulith.ToolkitContract.proxyAddress instead
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
