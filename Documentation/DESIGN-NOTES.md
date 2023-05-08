# General Design and Coding style notes about the Eulith javascript client library

## General

### Assertions/Checks

- The library is generally defensive about its arguments, and validates with the assert library
  much internal state
- guarantees are generally documented either here (if pan-library) or on an API basis

### Library dependencies

Eulith in effect is expecting its customers to incorporate their library code into their own code base.
This means customers accept the risk of security flaws in the eulith code.
This is somewhat obvious.

But less obvious, is the inclusion of (the transitive closure of) the eulith libraries' dependencies as well.

To mitigate this risk, Eulith some precautions:

  - Modularize the Eulith libary so that its core library has minimal dependencies
  - Package integrations with interesting components, which may be of interest to customers into
    separable packages (e.g. KMS support is in its own package, eulith-web3js-kms, to avoid forcing
    those not using it from having to include the AWS client libraries)

To mitigate the inconvenience of this modularization, we provide a single 'integration' library: eulith-web3js.

Our advice is to first use/test with eulith-web3js which contains (all or nearly all) the eulith integrations
combined. But before preparing to go to production, you limit yourself to using eulith-core, and the specific additional
eulith-web3js-XXX libraries needed to accomplish your objectives.

## Minor/Detail Oriented issues

### Addresses

- Ethereum addresses will be reported by APIs as checksummed addresses automatically.
  (see [https://coincodex.com/article/2078/ethereum-address-checksum-explained/](https://coincodex.com/article/2078/ethereum-address-checksum-explained/))

  Having a consistent choices facilitates equality comparisons.

  And this particular choice encourages safety [https://coincodex.com/article/2078/ethereum-address-checksum-explained/](https://coincodex.com/article/2078/ethereum-address-checksum-explained/)
