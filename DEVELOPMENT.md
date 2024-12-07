## Development notes

AWS SDK > 3.700 and also some earlier versions introduced a bug for Electron based app.

Install an older version released before Oct 2024, or patch the code for @smithy/node-http-handler to correctly bind the context in the `timing` variable.
See []()
