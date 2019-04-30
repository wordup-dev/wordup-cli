const {flags} = require('@oclif/command')
const Command =  require('../command-base')
const shell = require('shelljs')
const open = require('open')
const chalk = require('chalk')

class StartCommand extends Command {
  async run() {
    const {flags} = this.parse(StartCommand)
    const forceStart = flags.force

    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    }

    if (!forceStart && project.isWordupRunning('Or use --force to start this project.')) {
      this.exit(5)
    }

    if (!project.isInstalled()) {
      this.log('Your current installation is not set up. Please run first ' + chalk.bgBlue('wordup install'))
      this.exit(4)
    }

    shell.env.COMPOSE_PROJECT_NAME = project.wPkg('slugName')
    shell.env.WORDUP_PROJECT = project.wPkg('slugName')
    shell.env.WORDUP_PORT = project.config.installedOnPort
    if (flags.port) {
      shell.env.WORDUP_PORT = flags.port
    }

    project.permissionFix()

    const startCode = await this.customLogs('Start wordup', (resolve, reject, showLogs) => {
      shell.exec('docker-compose --project-directory ' + process.cwd() + ' up -d', {silent: !showLogs}, function (code, _stdout, _stderr) {
        if (code === 0) {
          resolve({done: '✔', code: code})
        } else {
          resolve({done: 'Error', code: code})
        }
      })
    })

    if(startCode === 0){
      this.log('"'+project.wPkg('projectName') + '" successfully started. Listening at ' + 'http://localhost:' + shell.env.WORDUP_PORT)
      open('http://localhost:' + shell.env.WORDUP_PORT, {wait: false})
      project.setProjectConf('listeningOnPort', shell.env.WORDUP_PORT)
    }else{
      this.error('There was an error while starting the docker containers.', {exit: 1})
    }

  }
}

StartCommand.aliases = ['run']

StartCommand.description = `Start the WordPress development server
...
You can run only this command if your development stack is installed.
`

StartCommand.flags = {
  ...Command.flags,
  port: flags.string({char: 'p', description: 'Overwrite installed port'}),
  force: flags.boolean({char: 'f', description: 'Force the start of the project'}),
}

module.exports = StartCommand
