/* eslint-disable @typescript-eslint/no-var-requires */

module.exports = {
    registerCoreHelpers: (handlebars) => {
        require('./each')(handlebars)
        require('./if')(handlebars)
        require('./with')(handlebars)
    }
}
