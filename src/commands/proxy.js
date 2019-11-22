const {flags} = require('@oclif/command')
const shell = require('shelljs')
const chalk = require('chalk')
const url = require('url')
const fs = require('fs-extra')

const Command =  require('../command-base')
const utils =  require('../lib/utils')

const caddyFile = (wordupPort, hostname, host, email) => `
${hostname} {
  log stdout
  tls ${email}
    
  proxy / http://localhost:${wordupPort} {
    transparent
    header_upstream Host "${host}"
  }
}
`;

class ProxyCommand extends Command {
  async run() {
    const {flags} = this.parse(ProxyCommand)
    const proxyUrl = flags.url || null

    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    }

    if(!project.isWordupProjectRunning()){
      this.log('Your project is not running, please use '+chalk.bgBlue('wordup install') +' or '+chalk.bgBlue('wordup start') )
      this.exit(4)
    }

    if(!utils.isValidUrl(proxyUrl)){
      this.error('The --proxy flag needs to be a valid url')
    }

    //check if caddy exists 
    if(!shell.which('caddy')){
      //this.error('Caddy [https://caddyserver.com] needs to be installed on your system')
    }

    const parsedProxy = url.parse(proxyUrl)

    //Set caddyfile
    const caddyfileConf = project.getProjectConfigPath('Caddyfile')
    fs.writeFileSync(caddyfileConf, caddyFile(project.config.listeningOnPort, parsedProxy.hostname, parsedProxy.host, flags.email))
    
    if(flags.service){

      if(shell.exec('caddy -service install -agree -conf '+caddyfileConf+' -name '+project.wPkg('slugName')).code !== 0){
        this.error('Could not install caddy service')
      }

      if(shell.exec('caddy -service start -name '+project.wPkg('slugName')).code !== 0){
        this.error('Could not start caddy service')
      }

      //Only the service command will keep caddy in the background, so we can save the state
      project.setProjectConf('proxy', 'running')
      this.log('Caddy proxy is running')

    }else if(shell.exec('caddy -agree -conf '+caddyfileConf).code !== 0){
      this.error('Could not start caddy')
    }

  }
}

ProxyCommand.description = `Creates a caddy proxy to your wordup installation
...
The proxy command needs caddy installed on the system. Make sure to have the appropriate permissions as a user
`

ProxyCommand.flags = {
  url: flags.string({description: 'The url you would like to proxy to the wordup installation',required: true}),
  email: flags.string({description: 'The email for letsencrypt tls',required: true}),
  service: flags.boolean({description: 'Run caddy proxy as service'})
}

ProxyCommand.hidden = true

module.exports = ProxyCommand
