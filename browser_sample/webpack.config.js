const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

module.exports = {
    entry: {
        polyfills: "./src/polyfills.ts",
        index: "./src/index.ts",
    },
    devtool: "inline-source-map",
    plugins: [
        new HtmlWebpackPlugin({
            template: "src/index.html",
        }),
        // Work around for Buffer is undefined in etherium-js-tx
        // https://stackoverflow.com/questions/68707553/uncaught-referenceerror-buffer-is-not-defined
        new webpack.ProvidePlugin({
            Buffer: ["buffer", "Buffer"],
        }),
        new webpack.ProvidePlugin({
            process: "process/browser",
        }),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],

        fallback: {
            // Fallbacks required to use web3-js, and therefore Eulith-web3js-core
            path: require.resolve("path-browserify"),
            crypto: require.resolve("crypto-browserify"),
            stream: require.resolve("stream-browserify"),
            // Fallbacks required to use web3-js, and therefore Eulith-web3js
            assert: require.resolve("assert/"),
            buffer: require.resolve("buffer/"),
        },
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
    },
};
