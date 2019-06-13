const Command =  require('../command-base')
const shell = require('shelljs')
const fs = require('fs-extra')
const chalk = require('chalk')

class ExportCommand extends Command {
  async run() {
    const {args} = this.parse(ExportCommand)
    const exportType = args.type
    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    }

    if(!project.isWordupProjectRunning()){
      this.log('Your project is not running, please use ' + chalk.bgBlue('wordup install') + ' or '+chalk.bgBlue('wordup start') )
      this.exit(4)
    }

    project.prepareDockerComposeUp(project.config.listeningOnPort)

    let exportParams = ''
    let filename = ''
    if (exportType === 'installation') {
      filename = 'installation-'+Math.floor(Date.now() / 1000)
      exportParams = ' --filename='+filename
    }

    shell.exec('docker-compose --project-directory ' + project.getProjectPath() + ' run --rm wordpress-cli wordup export ' + project.getWordupPkgB64() + ' --type=' + exportType+exportParams, function (code, stdout, stderr) {
      if (exportType === 'installation') {
        const crypto = require('crypto')
        
        fs.createReadStream( project.getProjectPath('dist/'+filename+'.tar.gz'))
        .pipe(crypto.createHash('sha1').setEncoding('hex'))
        .on('finish', function () {
          console.log('Checksum sha1', this.read()) // the hash
        })
      }
    })
  }
}

ExportCommand.description = `Export your plugin/theme or the whole WordPress installation
...
The exported zip-file of a plugin/theme are ready for distribution.
An exported installation file can be used for setting up a remote WordPress installation or
for backing up your current development stack. 
`

ExportCommand.args = [
  {
    name: 'type',
    required: true,
    description: 'What type do you want to export',
    default: 'src',
    options: ['src', 'installation', 'sql'],
  },
]

module.exports = ExportCommand
