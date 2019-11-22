const {flags} = require('@oclif/command')
const Command =  require('../command-base')
const shell = require('shelljs')
const open = require('open')
const chalk = require('chalk')
const utils =  require('../lib/utils')

class StartCommand extends Command {
  async run() {
    const {flags} = this.parse(StartCommand)

    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    }

    if (project.isWordupProjectRunning(true)) {
      this.exit(5)
    }

    if (!project.isInstalled()) {
      this.log('This project installation is not set up. Please run first: ' + chalk.bgBlue('wordup install'))
      this.exit(4)
    }

    project.prepareDockerComposeUp()

    await this.customLogs('Start wordup', (resolve, reject, showLogs) => {
      shell.exec('docker-compose --project-directory ' + project.getProjectPath() + ' up -d', {silent: !showLogs}, function (code, _stdout, _stderr) {
        if (code === 0) {
          resolve({done: '✔', code: code})
        } else {
          reject({done: 'There was an error while starting the docker containers.', code: code})
        }
      })
    })

    // ----- Check if server is accessible ----
    const port = project.config.installedOnPort
    const siteUrl = 'http://localhost:' + port

    await this.customLogs('Waiting for the containers to initialize', (resolve, reject, showLogs) => {
      project.checkLiveliness(siteUrl).then(res => resolve(res)).catch(e => reject(e))
    })

    this.log('')
    this.log('"'+project.wPkg('projectName') + '" successfully started.')

    project.setProjectConf('listeningOnPort', port)

    //Print the urls and credentials
    utils.printDevServerInfos(this.log, port, project)
    await open(siteUrl, {wait: false})
    
  }
}

StartCommand.aliases = ['run']

StartCommand.description = `Start the WordPress development server
...
You can run only this command if your development stack is installed.
`

StartCommand.flags = {
  ...Command.flags,
}

module.exports = StartCommand
