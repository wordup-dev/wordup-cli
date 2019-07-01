const {flags} = require('@oclif/command')
const Command =  require('../command-base')
const chalk = require('chalk')

const {createEnv} = require('yeoman-environment')

class InitCommand extends Command {
  async run() {
    const {flags} = this.parse(InitCommand)

    this.promptInit(flags).then((folder) => {
      this.log('---')
      this.log('')
      this.log('Successfully init new wordup project ('+folder+')')
      this.log('Just open your project folder and start developing :-)')
      if(flags.autoinstall){
        this.log('')
        this.log(chalk.bgBlue('wordup install')+' was executed automatically as a postinstall script in your package.json')
      }
    }).catch((err) => {
      this.error(err)
    })
  }

  async promptInit(flags) {
    let envOptions = {}
    if(process.env.WORDUP_INIT_PATH){
      envOptions.cwd = process.env.WORDUP_INIT_PATH
    }
    const env = createEnv([], envOptions)

    //Init Options
    let initOptions = {
      project: this.wordupProject,
      autoinstall:flags.autoinstall,
      projectName: flags.name,
      projectType: flags.type
    }


    env.register(require.resolve('../generators/init'), 'wordup:init')
    return new Promise((resolve, reject) => {
      env.run('wordup:init', initOptions, (err, results) => {
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
After you have initialized a new project, 'wordup install' will be called automatically, as a postinstall script in your package.json. 
You can stop this behavior with --no-autoinstall
`
InitCommand.flags = {
  autoinstall: flags.boolean({description: 'Automatically install wordup project after init', default: true, allowNo: true}),
  name: flags.string({description: 'A name for the new project', env: 'WORDUP_INIT_NAME',}),
  type: flags.string({description: 'What type of WordPress project',options: ['plugins', 'themes'], env: 'WORDUP_INIT_TYPE'})
}

module.exports = InitCommand
