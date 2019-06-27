
module.exports = {

  isValidUrl: function (value) {
    var regex = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    return regex.test(value)
  },

  printDevServerInfos(log, wpPort, mailhogPort, project){
      log('')
      log('╔═════════════════════════════════════════════════╗')
      log('╠═ Server                                        ═╣')
      log('╠═════════════════════════════════════════════════╣')
      log('║ WordPress               : http://localhost:'+wpPort+' ║')
      log('║ MailHog (E-Mail catcher): http://localhost:'+mailhogPort+' ║')
      log('╚═════════════════════════════════════════════════╝')

      const users = project.wPkg('wpInstall.users')
      if(users){
        log('╔═════════════════════════════════════════════════╗')
        log('╠═ WordPress logins                              ═╣')
        log('╠═════════════════════════════════════════════════╣')
        users.forEach((user, index) => {
          if(index > 0){
            log('║                                                 ║')
          }
          log('║ Username: '+user.name+''.padStart(37 - String(user.name).length, ' ')+' ║')
          log('║ Password: '+user.password+''.padStart(37 - String(user.password).length, ' ')+' ║')
        })
        log('╚═════════════════════════════════════════════════╝')
      }
      log('')
  }

}
