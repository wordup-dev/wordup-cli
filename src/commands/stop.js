const {flags} = require('@oclif/command')
const Command =  require('../command-base')

const shell = require('shelljs')
const path = require('path')
const fs = require('fs-extra')

class StopCommand extends Command {
  async run() {
    const {flags} = this.parse(StopCommand)
    const deleteAll = flags.delete
    let projectName = flags.project || false
    let projectId = this.wordupProject.projectId

    const wordupConfig = this.wordupConfig
    const configdir = this.config.configDir

    if(flags.force){
      // Use the template 
      shell.env.COMPOSE_FILE = this.wordupProject.wordupDockerPath('docker-compose.dev.yml')
    }else if (projectName) {
      // Different project -> find project id
      projectId = false
      const projects = wordupConfig.get('projects')

      // Check if compose file exists
      const composeFile = path.join(configdir, projectName, 'docker-compose.yml' )
      if(fs.existsSync(composeFile)){
        shell.env.COMPOSE_FILE = path.join(configdir, projectName, 'docker-compose.yml' )
        Object.keys(projects).forEach(key => {
          if (projects[key].slugName === projectName) {
            projectId = key
          }
        })
      }else{
        this.error('Could not find a running wordup project with this name', {exit: 6})
      }

    } else if (this.wordupProject.wPkg('slugName')) {
      projectName = this.wordupProject.wPkg('slugName')
      shell.env.COMPOSE_FILE = this.wordupProject.getProjectConfigPath('docker-compose.yml')
      if(!fs.existsSync(shell.env.COMPOSE_FILE)){
        this.error('It seems that this project is not running (No docker config found)')
      }
    } else {
      this.error('Could not find a running wordup project', {exit: 6})
    }

    shell.env.COMPOSE_PROJECT_NAME = projectName

    await this.customLogs('Stop '+(deleteAll ? '& delete ' : '')+'local servers', (resolve, reject, showLogs) => {
      shell.exec('docker-compose down' + (deleteAll ? ' -v --remove-orphans' : ''), {silent: !showLogs}, function (code, _stdout, _stderr) {
        if (code === 0 && wordupConfig.get('projects.' + projectId)) {
          wordupConfig.set('projects.' + projectId + '.listeningOnPort', false)
          if (deleteAll) {
            wordupConfig.set('projects.' + projectId + '.installedOnPort', false)
            wordupConfig.remove('projects.' + projectId + '.proxy')

            // Delete project config
            if(projectName){
              fs.removeSync(path.join(configdir, projectName))
            }
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
  force: flags.boolean({ description: 'Force delete'}),
  delete: flags.boolean({char: 'd', description: 'Deletes all attached volumes/data (WARNING: Your content in your WordPress installation will be deleted)'}),
}

module.exports = StopCommand
