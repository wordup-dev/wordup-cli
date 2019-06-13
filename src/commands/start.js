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

    if (project.isWordupProjectRunning(true)) {
      this.exit(5)
    }

    if (!project.isInstalled()) {
      this.log('This project installation is not set up. Please run first: ' + chalk.bgBlue('wordup install'))
      this.exit(4)
    }

    const port = flags.port ? flags.port : project.assignNewPort(project.config.installedOnPort)
    project.prepareDockerComposeUp(port)

    const startCode = await this.customLogs('Start wordup', (resolve, reject, showLogs) => {
      shell.exec('docker-compose --project-directory ' + project.getProjectPath() + ' up -d', {silent: !showLogs}, function (code, _stdout, _stderr) {
        if (code === 0) {
          resolve({done: '✔', code: code})
        } else {
          resolve({done: 'Error', code: code})
        }
      })
    })

    if(startCode === 0){
      this.log('"'+project.wPkg('projectName') + '" successfully started.')
      this.log('')
      this.log('WordPress listening at http://localhost:' + port)
      this.log('MailHog listening at http://localhost:' + shell.env.WORDUP_MAIL_PORT)
      this.log('')

      const siteUrl = (project.config.customSiteUrl ? project.config.customSiteUrl : 'http://localhost:' + port)
      await open(siteUrl, {wait: false})
      project.setProjectConf('listeningOnPort', port)
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
  force: flags.boolean({char: 'f', description: 'Force the start of the project (deprecated)', hidden:true}),
}

module.exports = StartCommand
