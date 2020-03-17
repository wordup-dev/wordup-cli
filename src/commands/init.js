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
      this.log('')
      this.log('Use '+ chalk.bgBlue('wordup install')+' in your project folder, to start your docker development server')
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
After you have initialized a new project, you can start the docker development server with 'wordup install'
`
InitCommand.flags = {
  autoinstall: flags.boolean({description: 'DEPRECATED: Automatically install wordup project after init', default: false, allowNo: true, hidden:true }),
  name: flags.string({description: 'A name for the new project', env: 'WORDUP_INIT_NAME',}),
  type: flags.string({description: 'What type of WordPress project',options: ['plugins', 'themes', 'installation'], env: 'WORDUP_INIT_TYPE'})
}

module.exports = InitCommand
