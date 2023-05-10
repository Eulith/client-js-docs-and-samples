import * as Eulith from "eulith-web3js";

import config from "./common-configuration";

const provider = new Eulith.Provider({
    network: Eulith.Networks.Predefined.mainnet.with({ eulithURL: config.serverURL }),
    refreshToken: config.refreshToken
});

// DO NOT use a plain text private key in production. Use KMS instead.
const acct = new Eulith.Signing.LocalSigner({ privateKey: config.Wallet1 });

/*
 *  Select a specific Uniswap pool, and do a simple swap on it
 *
 *       CODE BASED ON https://docs.eulith.com/v/srG7S9J4U0bx5OMNR41S/client-libraries/python/uniswap-stuff
 */
async function performDirectUNISWAPSwap() {
    console.log(`Starting performDirectUNISWAPSwap`);
    const fundingContract = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });
    const targetTokenContract = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.WETH });

    // Since we need to 'approve' the transaction, we need access to the agentContractAddress
    const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authoriziedSigner: acct });

    const beforeFundingAcctBalance = await fundingContract.balanceOf(acct.address);
    const beforeTargetBalance = await targetTokenContract.balanceOf(agentContractAddress);
    console.log(
        `  Before swap: FundingAcctBalance=${beforeFundingAcctBalance.asDisplayString}, and TargetBalance=${beforeTargetBalance.asDisplayString}`
    );

    const sellAmount = 10; // @todo use token object

    /*
     *  Get the UNISWAP pool which contains both these two contracts.
     *
     *      \todo explain the logic behind the argument 'fee'
     *
     *  token contracts arg to getSwapPool logically set of contracts LEN 1 or 2 (maybe future generalize so len can be otherwise?).
     *  IF can do set well in TS, set would be good fit here.
     */
    const swapPool = await Eulith.Uniswap.getSwapPool({
        request: {
            tokenContracts: [fundingContract, targetTokenContract], // this list must always contain two distinct erc20 token contracts
            fee: Eulith.Uniswap.PoolFee.ThirtyBips
        },
        provider
    });

    /*
     *  Get a quote from the pool for the price/cost of converting sellAmount USDC to WETH.
     *  Note that this returns MORE than just a quote, but also quote.swapRequest which may be
     *  used (immediately, before the prices change materially) to perform the swap.
     *
     *  @todo @Kristian - if I OMIT the payTransferFrom - I understand why this doesn't work, but it doesn't FAIL (no exception) - just no money xfer
     *  whereas omitting the APPROVE does generate the expected transaction failure
     */
    const quote = await swapPool.getQuote({
        sellToken: fundingContract,
        sellAmount: sellAmount,
        payTransferFrom: acct.address
    });

    console.log(
        `  UNISWAP quote: {price: ${quote.price} ${await fundingContract.symbol}, fee: ${
            quote.feeAmt.asDisplayString
        }, details: {sellAmount: ${quote.swapRequest.sellAmount} ${fundingContract.symbol}, fillOrKill: ${
            quote.swapRequest.fillOrKill
        }, ...}}`
    );
    await fundingContract
        .approve(agentContractAddress, fundingContract.asTokenValue(sellAmount * 1.2), { from: acct.address })
        .signAndSendAndWait(acct, provider);

    // UNISWAP transactions require a Eulith.AtomicTx, to make sure all the money is tranfered appropriately
    // back and forth in a safe way (UNISWAP requires a complicated back and forth the proxy handles for us).
    const atomicTx = new Eulith.AtomicTx.Transaction({ provider, signer: acct });

    const swapAtomicTx: Eulith.AtomicTx.NestedTransaction = await Eulith.Uniswap.startSwap({
        request: quote.swapRequest,
        parentTx: atomicTx
    });
    await swapAtomicTx.commit(); // NOTE: critical to await here, before commiting the parent transaction!

    // Commit, sign, and complete the operation - this will only return if/when the entire operation succeeeds (and throws on any part failing)
    await atomicTx.commitAndSendAndWait({
        extraTXParams2Merge: { gas: 1000000 }, // override gas here
        timeoutMS: 10 * 1000
    });

    console.log(
        `  After swap: fundingContract balance: ${
            (await fundingContract.balanceOf(acct.address)).asDisplayString
        }, and targetTokenContract toolkit balance: ${
            (await targetTokenContract.balanceOf(agentContractAddress)).asDisplayString
        }`
    );

    console.log(`Successfully completed performDirectUNISWAPSwap`);
}

/*
 *  Simple example of converting from one 'currency' to another (USDC to WETH).
 *
 *  Aside: these aren't exactly currencies, but currency is a familar notion to most, and it provides
 *  a solid analogy.
 *
 *  Also - this example 'leaves' money on the toolkit contract. You would never want to really do that,
 *  but as the first step in some larger process. You will want o transfer funds back out of that contract
 *  by the end of any real usage.
 *
 *      Historical Note: This example is based on test_start_uniswap_v3_swap - from https://github.com/Eulith/call/blob/master/client/js/library-web3js/tests/v_current.test.ts#L603
 */
async function simpleCurrencyConversionSampleWithBestPricePreparingToDoMore() {
    console.log(`Starting simpleCurrencyConversionSampleWithBestPricePreparingToDoMore`);

    /*
     *  If you own tokens in one currency, but wish to perform operations in another currency, you need to convert.
     *
     *  The Eulith.ToolkitContract can do this for you, and manage the complicated bookkeeping needed to manage
     *  this transaction on the blockchain.
     *
     *  The currency you start with (in your account) - is the fundingTokenContract.
     *
     *  The token contract (currency) you wish top operate with is your transactionTokenContract.
     */
    const fundingTokenContract = await Eulith.Tokens.getTokenContract({ provider, symbol: Eulith.Tokens.Symbols.USDC });
    const transactionTokenContract = (await Eulith.Tokens.getTokenContract({
        provider,
        symbol: Eulith.Tokens.Symbols.WETH
    })) as Eulith.Contracts.WethTokenContract;

    // @todo cleanup - use fundingTokenContract.asTokenValue, but requires more changes to UNISWAP API
    const sellAmount = 5;

    // Since we need to 'approve' the transaction, we need access to the agentContractAddress
    const agentContractAddress = await Eulith.OnChainAgents.contractAddress({ provider, authoriziedSigner: acct });

    /*
     *  Before we get started, lets see how much of your money is in your account (in the funding currency),
     *  and how much the toolkit has on your behalf (in the transaction currency).
     */
    const fundingContractBalance = await fundingTokenContract.balanceOf(acct.address);
    const proxyBalanceBefore = await transactionTokenContract.balanceOf(agentContractAddress);

    const fudgeForGas = 1000;

    /**
     *  Tell the funding contract that its OK to transfer (given amount) to the agentContractAddress; without this
     *  approval, the atomicTx.commitAndSendAndWait below will be rejected/rolled back.
     *
     *  // The x 1.2 here is so we pre-approve a bit more than we expect to take, so the
     *  // loan request succeeds (gas/fee).
     *
     *  Note that the from: acct.address is needed, to mark the approval coming from the ultimate source of funds - the account 'accnt'
     *
     *  @todo KRISTIAN, should 'from' be added as an argument to our friendly approve helper function, since its ALWAYS required here,
     *        and easy to accidentally omit in this style usage?
     */
    await fundingTokenContract
        .approve(agentContractAddress, fundingTokenContract.asTokenValue(sellAmount + fudgeForGas), {
            from: acct.address
        })
        .signAndSendAndWait(acct, provider);

    /*
     *  Ask the UNISWAP contract how much it will cost to get the tokens we need on our toolkit contract,
     *  and prepare an actual swap request to be added to the transaction.
     *
     *  Uniswap needs to know the sell and buy tokens (@Kristian, @todo but why both, if there are always two, one implies the other?)
     *  and the amount to be swapped (in sell token native units).
     *
     *  The payTransferFrom isn't really used in the 'quoting' part, but in producing the actual swap request which is
     *  also produced as part of the getBestPriceQuote call, and must refer to where the sellToken funds will come from (account).
     *
     *  Timing note - if the price changes materially from when the quote happens, to when the actual transaction happens, the
     *  actual transaction may fail (@todo details here might be interesting)
     */
    const quote = await Eulith.Uniswap.getBestPriceQuote({
        swapQuoteRequest: { sellToken: fundingTokenContract, buyToken: transactionTokenContract, amount: sellAmount },
        payTransferFrom: acct.address,
        provider
    });

    console.log(
        `  fees for this tranaction will be ${quote.feeAmt.asDisplayString}, and the price is ${quote.price} ${fundingTokenContract.symbol} per ${transactionTokenContract.symbol}`
    );

    {
        // UNISWAP transactions require a Eulith.AtomicTx, to make sure all the money is tranfered appropriately
        // back and forth in a safe way (UNISWAP requires a complicated back and forth the proxy handles for us).
        const atomicTx = new Eulith.AtomicTx.Transaction({ provider, signer: acct });

        // Create the actual request to be recorded into the atomicTx transaction
        const swapAtomicTx: Eulith.AtomicTx.NestedTransaction = await Eulith.Uniswap.startSwap({
            request: quote.swapRequest,
            parentTx: atomicTx
        });

        // Commit add this step to the parent atomic tx; note critical to await here, before commiting the parent transaction!
        await swapAtomicTx.commit();

        // Then commit the entire transaction (if this doesn't throw, it worked, commitAndSendAndWait takes extra optional parameters for gas, and timeouts and such )
        await atomicTx.commitAndSendAndWait();
    }

    /*
     *  So the net effect of the whole thing, we to SUBTRACT sellAmount from our 'acct' balance (in the fundingContractBalance currency)
     *  and ADD to the balance of our proxy contract in the transactionTokenContract currency.
     */
    console.log(
        `  After swap: fundingContract DELTA: ${
            (await fundingTokenContract.balanceOf(acct.address)).asFloat - fundingContractBalance.asFloat
        } ${
            fundingTokenContract.symbol
        }, and toolkit contracts's balance DELTA (how much we added) in the transaction: ${
            (await transactionTokenContract.balanceOf(agentContractAddress)).asFloat - proxyBalanceBefore.asFloat
        } ${transactionTokenContract.symbol}`
    );

    console.log(`Sucessfully Completed simpleCurrencyConversionSampleWithBestPricePreparingToDoMore`);
}

const topLevel = async function () {
    await performDirectUNISWAPSwap();
    await simpleCurrencyConversionSampleWithBestPricePreparingToDoMore();
};

topLevel();
