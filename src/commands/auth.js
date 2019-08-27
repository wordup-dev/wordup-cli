const {flags} = require('@oclif/command')
const open = require('open')
const axios = require('axios')
const express = require('express')
const portfinder = require("portfinder")

const {randomBytes} = require('crypto')

const Command =  require('../command-base')
const WordupAPI =  require('../lib/api')

const OAUTH_WORDUP_AUTH_URL = 'http://localhost:3000/user/oauth/flow'
const OAUTH_WORDUP_GET_TOKEN_URL = 'http://localhost:3000/api/oauthtoken/'

portfinder.basePort = 9010

class AuthCommand extends Command {
  async run() {
    const {flags} = this.parse(AuthCommand)
    const project = this.wordupProject

    /*const wordupOauth = new OAuth(this.config.configDir)
    const isAuth = await wordupOauth.isAuthenticated()
    if (!isAuth) {
      wordupOauth.authFlow()
    } else if (flags.logout) {
      wordupOauth.logout()
    } else {
      this.log('Wordup ist already connected. If you want to authenticate with a different account. Use --logout')
    }*/
    if(flags.logout){
      this.wordupConfig.set('token', null)
      this.log('Successfully logged out')
    }else {
      const userToken = this.getUserAuthToken()

      if(!userToken){
        await this.authFlow()
      } else {
      
        //Get user profile
        const api = new WordupAPI(userToken)
        const response = await api.userProfile()
        if(response.status === 200){
          const data = response.data
          this.log('Already logged in as '+data.email+'. Use the --logout flag if you want to logout.')
        }
      }
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

      axios.post(OAUTH_WORDUP_GET_TOKEN_URL, {
        grant_type: 'authorization_code',
        client_id:req.query.client_id,
        code: req.query.code,
        state: state
      }).then(ares => {
        if (ares.status === 200) {
          return ares.data;          
        } else {
          res.json({status:'error'})
        }
      }).then(async data => {
        this.finishAuthFlow(data)
        res.json({status:'verified'})

        this.log('Successfully authenticated')
        process.exit()
      }).catch(error => {
        res.json({status:'error', message:error.message})
      })

    })

    app.get('/deny',  (req, res) => {
      res.json({status:'denied'})
      this.log('Authentication denied')
      process.exit()
    })

    app.listen(this.port, () => {
      this.log('Please go to your webbrowser on http://localhost:'+this.port+' to fullfill the authentication!')
      this.log('Waiting for authentication...')
    })

    // Open OAuth flow url
    open('http://localhost:'+this.port+'/', {wait: false})
  }

  finishAuthFlow(data){
    const created = Math.floor(Date.now() / 1000)
    this.wordupConfig.set('token', {userId:data.user_id, accessToken:data.access_token,created:created})
  }

  async getUserProfile(){


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
