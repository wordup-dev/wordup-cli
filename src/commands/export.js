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

    if(!this.wordupProject.isWordupRunning('', true)){
      this.log('Your project is not running, please use ' + chalk.bgBlue('wordup install') + ' or '+chalk.bgBlue('wordup start') )
      this.exit(4)
    }

    shell.env.COMPOSE_PROJECT_NAME = this.wordupProject.wPkg('slugName')
    shell.env.WORDUP_PROJECT = this.wordupProject.wPkg('slugName')

    shell.exec('docker-compose --project-directory ' + process.cwd() + ' run --rm wordpress-cli wordup export ' + this.wordupProject.getWordupPkgB64() + ' --type=' + exportType, function (code, stdout, stderr) {
      if (exportType === 'installation') {
        const crypto = require('crypto')

        fs.createReadStream('./dist/installation.tar.gz')
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
