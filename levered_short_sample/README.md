# Basic sample of Eulith client access Flash (loan/swap) from javascript

## What is a flash (loan/swap)?

Put simply, a flash loan/swap gives you access to liquidity at the START of a transaction provided you pay it back at the end. Otherwise, the whole transaction reverts.

Eulith supports flash loans & swaps from Aave and Uniswap. The fee for the loan depends on the provider:
- Uniswap: 0.05%, 0.3% or 1% (depending on which fee the specific pool is using)
- Aave: 0.09%

### Scripts

#### `npm run start`

Starts the app in production by first building the project with `npm run build`, and then executing the compiled JavaScript at `build/index.js`.

#### `npm run build`

Builds the app at `build`, cleaning the folder first.
