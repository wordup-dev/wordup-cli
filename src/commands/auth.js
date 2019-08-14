const {flags} = require('@oclif/command')
const open = require('open')
const axios = require('axios')

const Command =  require('../command-base')
const WordupAPI =  require('../lib/api')
const PUBLIC_API_KEY = 'AIzaSyDePu-M5kQ5X0SBcX2rkBmUODkHrXw0deI'

const AUTHFLOW_ENDPOINT = 'http://localhost:3000/api/authflow/'

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
      await this.startAuthFlow()
    } else if(flags.logout){
      this.wordupConfig.set('token', null)
      this.log('Successfully logged out')
    } else {
      this.log('Wordup ist already connected. If you want to authenticate with a different account. Use --logout')
    }

  }

  async startAuthFlow(){

    //Get session key 
    let result = null;
    try {
      result = await axios.post(AUTHFLOW_ENDPOINT,{type:'cli', info: this.userAgent })
    }catch(error){

    }

    if(result.status === 200){
      this.session_id = result.data.session_id;
      this.verify_token = result.data.verify_token;

      await open('http://localhost:3000/user/auth?session='+this.session_id, {wait: false})
    }

    let jwt_token = null;
    try {
      this.log('Waiting ...')
      jwt_token = await this.checkAuthSession()
    }catch(error){
      this.log(error.message)
      return
    }

    await this.finishAuthFlow(jwt_token)
    this.log('Successfully logged in')

  }

  async checkAuthSession(){
    const sessionId = this.session_id
    const verifyToken = this.verify_token

    return new Promise((resolve, reject) => {
        let tries = 0
        const checkAuthFlow = function() {
          setTimeout(function() {
            tries++;

            axios.post(AUTHFLOW_ENDPOINT+'check',{
                session_id:sessionId,
                verify_token:verifyToken
            }).then((res)=>{
                        
              if(res.status === 200){
                const jwt_token = res.data.jwt_token
                if(jwt_token){
                  resolve(jwt_token)
                }else if (tries < 20) {
                  checkAuthFlow()
                }else{
                  reject(new Error('Timeout. Please try again.'))
                }
              }

            }).catch(error => {
              if(error.response.status === 404){
                reject(new Error('Your login attempt was denied.'))
              }else{
                reject(new Error('Unknown error'))
              }
            })
          },1000)
        }
        checkAuthFlow()
    })

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
