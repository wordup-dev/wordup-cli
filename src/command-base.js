
const {Command, flags} = require('@oclif/command')
const chalk = require('chalk')
const shell = require('shelljs')
const axios = require('axios')
const Config  = require('./lib/config')
const Project  = require('./lib/project')

const PUBLIC_API_KEY = 'AIzaSyDePu-M5kQ5X0SBcX2rkBmUODkHrXw0deI'

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
    }, function(result) {
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

  async getUserAuthToken(){
    const config = this.wordupConfig
    const tokenData = config.get('token', null)

    return new Promise(resolve => {
      if (!tokenData) {
        resolve(false)
      }

      const timeNow = Math.floor(Date.now() / 1000)

      if ((timeNow + 15) >= tokenData.expiresAt) {
        console.log('refresh')
        axios.post('https://securetoken.googleapis.com/v1/token?key='+PUBLIC_API_KEY, {
          grant_type: 'refresh_token',
          refresh_token: tokenData.refreshToken
        }).then(ares => {
          console.log(`refresh statusCode: ${ares.status}`)
          const newTokenData = ares.data
          const newToken = {
            idToken:newTokenData.id_token,
            refreshToken:newTokenData.refresh_token,
            expiresAt:Math.floor(Date.now() / 1000) + parseInt(newTokenData.expires_in,10)
          }
          config.set('token', newToken)
          resolve(newToken)
        }).catch(error => {
          if (error.response) {
            console.log('Unable to refresh token:', error.response.data)
          }
        })
      } else {
        resolve(tokenData)
      }

    })
  }




}

Base.flags = {
  logs: flags.boolean({description: 'Shows all stdout logs of this process'}),
}

module.exports = Base

