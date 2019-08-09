const {flags} = require('@oclif/command')

const Command =  require('../command-base')

const Archiver = require('../lib/archive')

class DeployCommand extends Command {
  async run() {
    const {flags} = this.parse(DeployCommand)
    const name = flags.name || 'world'

    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    }

    const arch  = new Archiver(project.getProjectPath())
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
  name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = DeployCommand
