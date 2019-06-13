const Command =  require('../command-base')
const shell = require('shelljs')
const chalk = require('chalk')

class WpcliCommand extends Command {
  async run() {
    const {argv} = this.parse(WpcliCommand)

    if (!this.wordupProject.isExecWordupProject()) {
      this.exit(5)
    }

    if(!this.wordupProject.isWordupProjectRunning()){
      this.log('Your project is not running, please use '+chalk.bgBlue('wordup install') +' or '+chalk.bgBlue('wordup start') )
      this.exit(4)
    }

    this.wordupProject.prepareDockerComposeUp(this.wordupProject.config.listeningOnPort)

    const wpCliCmd = argv.join(' ')

    this.log('Run command: wp ' + wpCliCmd)
    shell.exec('docker-compose --project-directory ' + this.wordupProject.getProjectPath() + ' run --rm wordpress-cli ' + wpCliCmd)

  }
}

WpcliCommand.description = `Use an official WordPress CLI command on the current running project
...
As an example: wordup wpcli post list
`

WpcliCommand.strict = false
WpcliCommand.args = [
  {
    name: 'command',
    required: true, // make the arg required with `required: true`
    description: 'the wp cli command', // help description
  },
]

module.exports = WpcliCommand
