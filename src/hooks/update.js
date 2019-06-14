const updateNotifier = require('update-notifier')

module.exports = async function (options) {
    const argv = options.argv || []

    const pkg = options.config.pjson
    const notifier = updateNotifier({pkg:pkg})

    if(argv.indexOf("--json") === -1){
        //is-installed-globally could be used for npx installed packages
        notifier.notify({isGlobal:true})
    }
}