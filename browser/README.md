# Basic sample of Eulith client for web browser

To make much use of this sample, you will need a server that is confiured to allow
your client to connect via CORS.

And you will need a URL for that server, and a refreshToken to use.

NOTE - the html UI will prompt for these things - no need to build them into the code/configuration.

### Scripts

#### `npm run start`

Starts the app in production by first building the project with `npm run build`, and then executing the compiled JavaScript at `build/index.js`.

#### `npm run build`

build-dev to build dev version, or build-prod to build for production

#### `npm run format`

Format your code.

## Running build and seeing security erorr loading script

Depending on your browser settings, you may not be able run html / JS directly from the filesystem

In that case, this maybe helpful

~~~
cd dist
npx http-server .
~~~

Then use the published link from http-server output to browse this web-app.


## If your RPC server is generating CORS erorrs (doesn't include your particular GUI)

You can run your client through a cors-enabling reverse proxy

[https://www.npmjs.com/package/local-cors-proxy](https://www.npmjs.com/package/local-cors-proxy)
~~~
    npx lcp --proxyUrl http://localhost:7777
~~~