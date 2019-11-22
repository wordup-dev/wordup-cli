
const {Command, flags} = require('@oclif/command')
const Config  = require('./lib/config')
const Project  = require('./lib/project')

class Base extends Command {
  async init(err) {
    // do some initialization
    const {flags} = this.parse(this.constructor)
    this.flags = flags

    this.debug = flags.logs || false
    this.wordupConfig = new Config(this.config.configDir)
    this.wordupProject = new Project(this.config, this.log, this.error)
    this.wordupProject.setUp()
  }

  async customLogs(text, cb) {
    const {cli} = require('cli-ux')

    const showLogs = this.debug
    const log = this.log
    const error = this.error

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
    },(result) => {
      cli.action.stop('-')
      error(result.done,{exit:result.code})
    })
  }


  isAuthenticated() {
    const tokenData = this.wordupConfig.get('token', null)
    if (tokenData) {
      return true
    }
    return false
  }

  getUserAuthToken(){
    const config = this.wordupConfig
    return config.get('token', null)
  }


}

Base.flags = {
  logs: flags.boolean({description: 'Shows all stdout logs of this process'}),
}

module.exports = Base

