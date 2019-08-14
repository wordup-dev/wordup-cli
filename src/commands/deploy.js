const {flags} = require('@oclif/command')

const Command =  require('../command-base')

const Archiver = require('../lib/archive')

class DeployCommand extends Command {
  async run() {
    const {flags} = this.parse(DeployCommand)
    
    const projectToken = flags.token || null

    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    } 

    //If no project token is provided, just 
    let userToken = null;
    if(!projectToken){
      userToken = await this.getUserAuthToken()
      if(!userToken){
        this.log('Please authenticate first with: ')
        this.exit(2)
      }
    }

    const arch  = new Archiver(project, userToken, projectToken)
    const result = await arch.createArchive()
    console.log('---')
    console.log(result);
    arch.cleanup();
    
  }
}

DeployCommand.description = `Describe the command here
...
Extra documentation goes here
`

DeployCommand.flags = {
  token: flags.string({description: 'A provided project token', env: 'WORDUP_PROJECT_AUTH_TOKEN',}),
}

module.exports = DeployCommand
