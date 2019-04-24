const {flags} = require('@oclif/command')
const Command =  require('../command-base')

const shell = require('shelljs')

class StopCommand extends Command {
  async run() {
    const {flags} = this.parse(StopCommand)
    const deleteAll = flags.delete
    const projectName = flags.project || false
    let projectId = this.wordupProject.projectId

    const config = this.wordupConfig

    if (projectName) {
      shell.env.WORDUP_PROJECT = projectName
      shell.env.COMPOSE_PROJECT_NAME = projectName

      // Different project -> find project id
      projectId = false
      const projects = config.get('projects')
      Object.keys(projects).forEach(key => {
        if (projects[key].slugName === projectName) {
          projectId = key
        }
      })
    } else if (this.wordupProject.wPkg('slugName')) {
      shell.env.WORDUP_PROJECT = this.wordupProject.wPkg('slugName')
      shell.env.COMPOSE_PROJECT_NAME = this.wordupProject.wPkg('slugName')
    } else {
      this.error('Could not find a running wordup project', {exit: 6})
    }

    await this.customLogs('Stop wordup', (resolve, reject, showLogs) => {
      shell.exec('docker-compose down' + (deleteAll ? ' -v' : ''), {silent: !showLogs}, function (code, _stdout, _stderr) {
        if (code === 0 && projectId) {
          config.set('projects.' + projectId + '.listeningOnPort', false)
          if (deleteAll) {
            config.set('projects.' + projectId + '.installedOnPort', false)
          }
        }
        resolve({done: (code === 0 ? '✔' : 'Oops, something went wrong'), code:code})
      })
    })
  }
}

StopCommand.description = `Stop the development server
...
Optionally you can use -d to delete the whole installation, this includes all files in your WordPress installation.
`

StopCommand.flags = {
  ...Command.flags,
  project: flags.string({char: 'p', description: 'A project slug name'}),
  delete: flags.boolean({char: 'd', description: 'Deletes all attached volumes/data (WARNING: Your content in your WordPress installation will be deleted)'}),
}

module.exports = StopCommand
