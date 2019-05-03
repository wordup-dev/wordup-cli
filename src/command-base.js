
const {Command, flags} = require('@oclif/command')
const chalk = require('chalk')
const shell = require('shelljs')
const Config  = require('./lib/config')
const Project  = require('./lib/project')

class Base extends Command {
  async init(err) {
    // do some initialization
    const {flags} = this.parse(this.constructor)
    this.flags = flags

    if (!shell.which('docker-compose')) {
      this.log('This CLI requires ' + chalk.bgBlue('docker-compose') + '. Please download: https://www.docker.com/get-started')
      this.log('If you dont want to signup for downloading Docker Desktop')
      this.log('You can download Docker Desktop directly here: ')
      if (this.config.platform === 'win32') {
        this.log('https://docs.docker.com/docker-for-windows/release-notes/')
      } else {
        this.log('https://docs.docker.com/docker-for-mac/release-notes/')
      }
      this.exit(1)
    }
    this.debug = flags.logs || false
    this.wordupConfig = new Config(this.config.configDir)
    this.wordupProject = new Project(this.config, this.log, this.error)
    this.wordupProject.setUp()
  }

  async customLogs(text, cb) {
    const {cli} = require('cli-ux')

    const showLogs = this.debug
    const log = this.log

    if (!showLogs) {
      cli.action.start(text)
    } else {
      log(text)
    }

    return new Promise(async (resolve, reject) => {
      await cb(resolve, reject, showLogs)
    }).then(result => {
      if (!showLogs) {
        cli.action.stop(result.done)
      } else {
        log('---')
      }
      return result.code
    })
  }
}

Base.flags = {
  logs: flags.boolean({description: 'Shows all stdout logs of this process'}),
}

module.exports = Base

