const updateNotifier = require('update-notifier')

module.exports = async function (options) {
    const argv = options.argv || []
    if(argv.indexOf("--json") === -1){
        const pkg = options.config.pjson
        updateNotifier({pkg:pkg}).notify({isGlobal:true})
    }
}