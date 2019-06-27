const {flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const fs = require('fs')
const path = require('path')

const Command =  require('../command-base')

// Change to project
class ListCommand extends Command {
  async run() {
    const {flags} = this.parse(ListCommand)

    const projects = this.wordupConfig.get('projects') || []

    // Clear list from non existing projects
    if (flags.clear) {
      Object.keys(projects).forEach(key => {
        const configPath = path.join(projects[key].path, '.wordup','config.yml')

        //Legacy support 
        const oldPackagePath = path.join(projects[key].path, 'package.json')

        if (!fs.existsSync(configPath) || !fs.existsSync(oldPackagePath)) {
          delete projects[key]
        }
      })
      this.wordupConfig.set('projects', projects)
    }

    const data = []
    Object.keys(projects).forEach(function (key) {
      const projectData = projects[key]
      projectData.id = key
      data.push(projectData)
    })


    //If json return
    if(flags.json){
      this.log(JSON.stringify(data))
    }else{

      cli.table(data, {
        name: {
          header: 'NAME',
          minWidth: 20,
        },
        installed: {
          header: 'INSTALLED',
          get: row => {
            return (row.installedOnPort ? '✔' : '-')
          },
        },
        started: {
          header: 'LISTENING',
          get: row => {
            return (row.listeningOnPort ? 'http://localhost:' + row.listeningOnPort : '-')
          },
        },
        path: {
          header: 'PATH',
          get: row => row.path,
        },
        id: {
          header: 'ID',
          get: row => row.id,
        },
      }, {
        printLine: this.log,
      })
      
    }
  }
}

ListCommand.aliases = ['ls']

ListCommand.description =  `List all executable wordup projects
...
If you see deleted projects in this list, run with --clear flag.
`

ListCommand.flags = {
  clear: flags.boolean({description: 'Clears the project list from non-existing projects'}),
  json: flags.boolean({hidden:true, description: 'Returns a json-formated list'}),
}

module.exports = ListCommand
