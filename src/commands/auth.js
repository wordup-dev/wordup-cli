const {flags} = require('@oclif/command')
const Command =  require('../command-base')
const OAuth =  require('../lib/oauth')
const WordupAPI =  require('../lib/api')

class AuthCommand extends Command {
  async run() {
    const {flags} = this.parse(AuthCommand)

    this.log('This action will be released in a feature release.')
    this.exit(0)

    if (flags.test) {
      const api = new WordupAPI(this.config.configDir)
      const user = await api.getUser()
      this.log(user)
      this.exit(0)
    }

    const wordupOauth = new OAuth(this.config.configDir)
    const isAuth = await wordupOauth.isAuthenticated()
    if (!isAuth) {
      wordupOauth.authFlow()
    } else if (flags.logout) {
      wordupOauth.logout()
    } else {
      this.log('Wordup ist already connected. If you want to authenticate with a different account. Use --logout')
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
