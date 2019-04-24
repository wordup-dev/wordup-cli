const {flags} = require('@oclif/command')
const Command =  require('../command-base')
const chalk = require('chalk')

const {createEnv} = require('yeoman-environment')

class InitCommand extends Command {
  async run() {
    const {flags} = this.parse(InitCommand)

    const initResolved = await this.promptInit()
    this.log(initResolved)
  }

  async promptInit() {
    const env = createEnv()
    env.register(require.resolve('../generators/init'), 'wordup:init')

    return new Promise((resolve, reject) => {
      env.run('wordup:init', {project: this.wordupProject}, (err, results) => {
        if (err) {
          reject(err)
        } else {
          resolve('Successfully init project. Please cd to your project folder and run ' + chalk.bgBlue('wordup install') + ' to setup dev server')
        }
      })
    })
  }
}

InitCommand.description = `Create a new wordup project in the current directoy
...
After you initialized a new project, you are able to install your development stack. 
`
InitCommand.flags = {}

module.exports = InitCommand
