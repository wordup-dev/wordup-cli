const open = require('open')
const axios = require('axios')
const express = require('express')

const CLIENT_ID = 'qC4eDwvJEx0nICGCRIbh2HRiH6FStmuGzFmruEmt'
const RANDOM_STATE = ''

class OAuth {
  constructor(wordupConfig) {
    this._wordupConfigstore = wordupConfig

    this.OAUTH_WORDUP_AUTH_URL = wordupConfig.get('app_url') + '/account/oauth/flow/'
    this.OAUTH_WORDUP_TOKEN_URL = wordupConfig.get('api_url') +  '/o/token/'
    this.OAUTH_WORDUP_REVOKE_TOKEN_URL = wordupConfig.get('api_url') + '/o/revoke_token/'

  }

  authFlow() {
    const config = this._wordupConfigstore

    const redirectUri = 'http://localhost:8442/oauthtoken'
    const app = express()

    app.get('/',  (req, res) => {
      const params = '?client_id='+CLIENT_ID+'&state=something&redirect_uri='+encodeURIComponent(redirectUri)
      res.redirect(this.OAUTH_WORDUP_AUTH_URL+params)
    })

    app.get('/oauthtoken',  (req, res) => {
      if (req.query.code) {
        axios.post(this.OAUTH_WORDUP_TOKEN_URL, {
          grant_type: 'authorization_code',
          code: req.query.code,
          state: req.query.state,
          client_id: CLIENT_ID,
          redirect_uri:redirectUri
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
          console.log(error);

          res.send('Error: Please try it again.')
        })
      } else {
        res.send('No code provided')
      }
    })

    app.get('/verified', (req, res) => {
      res.send('Successful verified')

      process.exit()
    })

    app.listen(8442,  () => {
      console.log('Please go to your webbrowser on http://localhost:8442/ to fullfill the authentication!')
    })

    // Open OAuth flow url
    open('http://localhost:8442/', {wait: false})
  }

  async getToken() {
    const config = this._wordupConfigstore

    return new Promise(resolve => {
      if (!this.isAuthenticated()) {
        resolve(false)
      }

      const timeNow = Math.floor(Date.now() / 1000)

      const tokenData = config.get('token')

      if ((timeNow + 15) >= tokenData.expires_at) {
        console.log('refresh')
        axios.post(this.OAUTH_WORDUP_TOKEN_URL, {
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
    const config = this._wordupConfigstore
    const tokenData = config.get('token')

    if (tokenData) {
      axios.post(this.OAUTH_WORDUP_REVOKE_TOKEN_URL, {
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
    const tokenData = this._wordupConfigstore.get('token')
    if (tokenData) {
      return true
    }
    return false
  }
}

module.exports = OAuth

