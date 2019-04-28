const {flags} = require('@oclif/command')
const Command =  require('../command-base')
const chalk = require('chalk')

const {createEnv} = require('yeoman-environment')

class InitCommand extends Command {
  async run() {
    const {flags} = this.parse(InitCommand)

    this.promptInit().then((folder) => {
      this.log('---')
      this.log('')
      this.log('Successfully init new wordup project ('+folder+')')
      this.log('Just cd to your project folder and start developing ;)')
      this.log('')
      this.log(chalk.bgBlue('wordup install')+' was executed automatically as a postinstall script in your package.json')
    }).catch((err) => {
      this.error(err)
    })
  }

  async promptInit() {
    const env = createEnv()
    env.register(require.resolve('../generators/init'), 'wordup:init')
    return new Promise((resolve, reject) => {
      env.run('wordup:init', {project: this.wordupProject}, (err, results) => {
        if (err) {
          reject(err)
        } else {
          const folder = env.cwd;
          resolve(folder)
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
