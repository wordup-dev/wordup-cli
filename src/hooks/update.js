const updateNotifier = require('update-notifier')
const chalk = require('chalk')

module.exports = async function (options) {
    const argv = options.argv || []

    const pkg = options.config.pjson
    const notifier = updateNotifier({pkg:pkg})

    if(argv.indexOf("--json") === -1){

        let message = 'Update available ' +
			chalk.dim('{currentVersion}') +
			chalk.reset(' → ') +
			chalk.green('{latestVersion}') +
			' \nRun ' + chalk.cyan('{updateCommand}') + ' to update';

        if(notifier.update && notifier.update.type === 'major'){
            message = message + 
                    '\n\n CAUTION: This is a major version jump.' +
                    '\n There are no guarantees about backwards compatibility.'
        }

        notifier.notify({
            isGlobal:true,
            message:message
        })
    }
}