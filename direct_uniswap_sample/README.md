# Basic sample of Eulith client access Uniswap from javascript

## Uniswap

[Uniswap FAQ](https://uniswap.org/faq) is an Ethereum protocol for providing liquidity and trading ERC20 tokens.

Eulith provides tools to allow simple integration with that protocol, seemlessly allowing access to that liquidity from without Eulith based applications.

- Native Python bindings to the IUniswapV3Pool contract
- Easy high level interoperability of token values and contracts with the pool
- Easy (and yet flexible) quoting support, to get you the best price on your swaps.

### Scripts

#### `npm run start`

Starts the app in production by first building the project with `npm run build`, and then executing the compiled JavaScript at `build/index.js`.

#### `npm run build`

Builds the app at `build`, cleaning the folder first.
