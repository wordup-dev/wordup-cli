const Command =  require('../command-base')
const shell = require('shelljs')
const chalk = require('chalk')
const utils =  require('../lib/utils')

class WpcliCommand extends Command {
  async run() {
    const {argv} = this.parse(WpcliCommand)

    if (!this.wordupProject.isExecWordupProject()) {
      this.exit(5)
    }

    if(!this.wordupProject.isWordupProjectRunning()){
      this.log('No local WordPress server found, please use '+chalk.bgBlue('wordup local:install') +' or '+chalk.bgBlue('wordup local:start') )
      this.exit(4)
    }

    this.wordupProject.prepareDockerComposeUp()
    
    let escapedArgs = []
    argv.forEach(arg => {
      if(utils.isValidUrl(arg)){
        escapedArgs.push('"'+arg+'"')
      }else{
        escapedArgs.push(arg)
      }
    })

    const wpCliCmd = escapedArgs.join(' ')

    this.log('Run command: wp ' + wpCliCmd)
    shell.exec('docker-compose --project-directory ' + this.wordupProject.getProjectPath() + ' exec -u www-data -T wordpress wp ' + wpCliCmd)

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
