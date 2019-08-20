const {flags} = require('@oclif/command')
const open = require('open')
const axios = require('axios')
const express = require('express')
let portfinder = require("portfinder");

const {randomBytes} = require('crypto')

const Command =  require('../command-base')
const WordupAPI =  require('../lib/api')
const PUBLIC_API_KEY = 'AIzaSyDePu-M5kQ5X0SBcX2rkBmUODkHrXw0deI'

const OAUTH_WORDUP_AUTH_URL = 'http://localhost:3000/user/oauth/flow'
const OAUTH_WORDUP_TOKEN_URL = 'https://wordup-c9001.firebaseapp.com/api/authflow/'

portfinder.basePort = 9010;

class AuthCommand extends Command {
  async run() {
    const {flags} = this.parse(AuthCommand)
    const project = this.wordupProject

    if (flags.test) {
      const api = new WordupAPI(this.config.configDir)
      const user = await api.getUser()
      this.log(user)
      this.exit(0)
    }


    /*const wordupOauth = new OAuth(this.config.configDir)
    const isAuth = await wordupOauth.isAuthenticated()
    if (!isAuth) {
      wordupOauth.authFlow()
    } else if (flags.logout) {
      wordupOauth.logout()
    } else {
      this.log('Wordup ist already connected. If you want to authenticate with a different account. Use --logout')
    }*/

    if(!this.isAuthenticated()){
      await this.authFlow()
    } else if(flags.logout){
      this.wordupConfig.set('token', null)
      this.log('Successfully logged out')
    } else {
      this.log('Wordup ist already connected. If you want to authenticate with a different account. Use --logout')
    }

  }

  async authFlow() {

    const app = express()
    const state = await randomBytes(24).toString('hex')

    this.port = await portfinder.getPortPromise()

    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*"); //2do: only from wordup domain
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      next();
    });

    app.get('/',  (req, res) => {
      res.redirect(OAUTH_WORDUP_AUTH_URL+'?state='+state+'&client_id=cli&redirect_uri=http://localhost:'+this.port)
    })

    app.get('/status',  (req, res) => {
      res.sendStatus(204)
    })

    app.get('/oauthtoken', (req, res) => {
      if (!req.query.code) {
        return res.sendStatus(403)
      }

      axios.post(OAUTH_WORDUP_TOKEN_URL, {
        grant_type: 'authorization_code',
        code: req.query.code,
        state: state
      }).then(ares => {
        if (ares.status === 200) {
          return ares.data.jwt_token;          
        } else {
          res.json({status:'error'})
        }
      }).then(async token => {
        await this.finishAuthFlow(token)
        res.json({status:'verified'})

        this.log('Successfully authenticated')
        process.exit()
      }).catch(error => {
        res.json({status:'error', message:error.message})
      })

    })

    app.listen(this.port, () => {
      this.log('Please go to your webbrowser on http://localhost:'+this.port+' to fullfill the authentication!')
      this.log('Waiting for authentication...')
    })

    // Open OAuth flow url
    open('http://localhost:'+this.port+'/', {wait: false})
  }

  async finishAuthFlow(token){
    let result = null;

    try {
      result = await axios.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key='+PUBLIC_API_KEY,{
        token:token,
        returnSecureToken:true
      })
    }catch(error){
      this.log(error.message)
    }
    
    if(result.status === 200){
      let token = result.data
      const expiresAt = Math.floor(Date.now() / 1000) + parseInt(token.expiresIn,10)
      this.wordupConfig.set('token', {idToken:token.idToken, refreshToken:token.refreshToken, expiresAt:expiresAt})
    }

  }



}

AuthCommand.description = `Authenticate the CLI with wordup
...
This feature is currently not active
`

AuthCommand.flags = {
  test: flags.boolean({char: 't', description: 'Test API connection'}),
  logout: flags.boolean({char: 'l', description: 'Logout of your account'}),
}

AuthCommand.hidden = true

module.exports = AuthCommand
