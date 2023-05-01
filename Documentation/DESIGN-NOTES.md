# General Design and Coding style notes about the Eulith javascript client library


## General

### Assertions/Checks

- The library is generally defensive about its arguments, and validates with the assert library
  much internal state
- guarantees are generally documented either here (if pan-library) or on an API basis

### Library dependencies
  - EXPLAIN

### Details

## Addresses

- Ethereum addresses will be reported by APIs as checksummed addresses automatically.
  (see [https://coincodex.com/article/2078/ethereum-address-checksum-explained/](https://coincodex.com/article/2078/ethereum-address-checksum-explained/))

  Having a consistent choices facilitates equality comparisons.

  And this particular choice encourages safety [https://coincodex.com/article/2078/ethereum-address-checksum-explained/](https://coincodex.com/article/2078/ethereum-address-checksum-explained/)
