const open = require('open')
const axios = require('axios')
const express = require('express')

const Config = require('./config')

const CLIENT_ID = 'E85PAIqIFf2Do4ACHp8vbQRpjgCDr6s8rzs4i7SM'

const RANDOM_STATE = 'random'

const OAUTH_WORDUP_AUTH_URL = 'http://localhost:8042/o/authorize/?client_id=' + CLIENT_ID + '&state=' + RANDOM_STATE + '&response_type=code'
const OAUTH_WORDUP_TOKEN_URL = 'http://localhost:8042/o/token/'
const OAUTH_WORDUP_REVOKE_TOKEN_URL = 'http://localhost:8042/o/revoke_token/'

class OAuth {
  constructor(configDir) {
    this._wordupConfig = new Config(configDir)
  }

  authFlow() {
    const config = this._wordupConfig

    const app = express()

    app.get('/', function (req, res) {
      res.redirect(OAUTH_WORDUP_AUTH_URL)
    })

    app.get('/oauthtoken', function (req, res) {
      if (req.query.code) {
        axios.post(OAUTH_WORDUP_TOKEN_URL, {
          grant_type: 'authorization_code',
          code: req.query.code,
          state: req.query.state,
          client_id: CLIENT_ID,
        }).then(ares => {
          if (ares.status === 200) {
            const newTokenData = ares.data

            config.set('token', newTokenData)
            config.set('token.expires_at', Math.floor(Date.now() / 1000) + newTokenData.expires_in)

            res.redirect('/verified')
          } else {
            res.send('Error: Please try it again.')
          }
        }).catch(error => {
          res.send('Error: Please try it again.')
        })
      } else {
        res.send('No code provided')
      }
    })

    app.get('/verified', function (req, res) {
      res.send('Successful verified')

      process.exit()
    })

    app.listen(8442, function () {
      console.log('Please go to your webbrowser on http://localhost:8442/ to fullfill the authentication!')
    })

    // Open OAuth flow url
    open('http://localhost:8442/', {wait: false})
  }

  async getToken() {
    const config = this._wordupConfig

    return new Promise(resolve => {
      if (!this.isAuthenticated()) {
        resolve(false)
      }

      const timeNow = Math.floor(Date.now() / 1000)

      const tokenData = config.get('token')

      if ((timeNow + 15) >= tokenData.expires_at) {
        console.log('refresh')
        axios.post(OAUTH_WORDUP_TOKEN_URL, {
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token,
          state: RANDOM_STATE,
          client_id: CLIENT_ID,
        }).then(ares => {
          console.log(`refresh statusCode: ${ares.status}`)
          const newTokenData = ares.data
          console.log(newTokenData)
          config.set('token', newTokenData)
          config.set('token.expires_at', Math.floor(Date.now() / 1000) + newTokenData.expires_in)

          resolve(config.get('token'))
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

  logout() {
    const config = this._wordupConfig
    const tokenData = config.get('token')

    if (tokenData) {
      axios.post(OAUTH_WORDUP_REVOKE_TOKEN_URL, {
        token: tokenData.refresh_token,
        client_id: CLIENT_ID,
        token_type_hint: 'refresh_token',
      }).then(ares => {
        const tokenData = ares.data
        config.set('token', false)
        console.log('Successfully logged out')
      }).catch(error => {
        if (error.response) {
          console.log('Unable to refresh token:', error.response.data)
        }
      })
    }
  }

  isAuthenticated() {
    const tokenData = this._wordupConfig.get('token')
    if (tokenData) {
      return true
    }
    return false
  }
}

module.exports = OAuth

