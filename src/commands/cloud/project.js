const {flags} = require('@oclif/command')
const {cli} = require('cli-ux')

const Command =  require('../../command-base')
const WordupAPI =  require('../../lib/api')


class ProjectCommand extends Command {

  async run() {
    const {flags} = this.parse(ProjectCommand)

    const project = this.wordupProject
    if (!project.isExecWordupProject()) {
        this.exit(1)
    } 

    if(project.wPkg('type') === 'installation'){
        this.error('You can not create a project of type "installation"')
    }

    this.userToken = this.getUserAuthToken()
    if(!this.userToken){
      this.log('Please authenticate first with: wordup cloud:auth')
      this.exit(2)
    }

    const api = new WordupAPI(this.wordupConfig)

    const newProject = {
        'id':project.wPkg('slugName'),
        'type':project.wPkg('type'),
        'name':project.wPkg('projectName'),
        'is_private':!flags.public
    }

    this.log('You will publish a new project to wordup with this parameters:')
    this.log('')
    this.log('Type    : '+newProject.type)
    this.log('Name    : '+newProject.name)
    this.log('ID      : '+newProject.id)
    this.log('Private : '+newProject.is_private)
    this.log('')

    await cli.anykey()

    try {
        const response = await api.createProject(newProject)
        this.log('')
        this.log('Successfully created new project on wordup.dev:')
        this.log('')
        await cli.url('Go to wordup.dev', 'https://google.com')
        this.log('')
    }catch(error){
        this.error(error.message)
    }
  }
}

ProjectCommand.description = `Create a new remote project on wordup.dev
...
Use this function to create a remote project on wordup.dev from your local project config.
`

ProjectCommand.flags = {
    public:flags.boolean({description: 'Create a public project', default:false})
}

ProjectCommand.hidden = true

module.exports = ProjectCommand
