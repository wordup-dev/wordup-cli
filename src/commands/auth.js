const {flags} = require('@oclif/command')
const portfinder = require("portfinder")

const Command =  require('../command-base')
const WordupAPI =  require('../lib/api')

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

    const api = new WordupAPI(this.wordupConfig)

    if(flags.logout){
      api.oauth.logout()
    }else {
      const userToken = this.getUserAuthToken()

      if(!userToken){
        api.oauth.authFlow()
      } else {
      
        //Get user profile
        try {
          const response = await api.userProfile()
          const data = response.data
          this.log('Already logged in as '+data.email+'. Use the --logout flag if you want to logout.')
        }catch(error){
          this.error(error.message)
        }
      }
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
