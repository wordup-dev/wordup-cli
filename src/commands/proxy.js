const {flags} = require('@oclif/command')
const shell = require('shelljs')
const chalk = require('chalk')
const url = require('url')
const fs = require('fs-extra')
const path = require('path')

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
      this.error('Caddy [https://caddyserver.com] needs to be installed on your system')
    }

    const parsedProxy = url.parse(proxyUrl)

    if(flags.service){

      const caddyfile = path.join(this.config.configDir, 'Caddyfile')
      if(fs.existsSync(caddyfile)){
        project.setProjectConf('proxy', proxyUrl)

        // Regenerate the caddyfile based on all running proxies
        const allProxiesConfig =  this.createCaddyFile(flags.email)
        fs.writeFileSync(caddyfile, allProxiesConfig)

        if(shell.exec('caddy -service restart').code !== 0){
          this.error('Could not restart caddy service')
        }

      }else{
        const newCaddyFileConf = caddyFile(project.config.listeningOnPort, parsedProxy.hostname, parsedProxy.host, flags.email)
        fs.writeFileSync(caddyfile, newCaddyFileConf)
      
        if(shell.exec('caddy -service install -agree -conf '+caddyfile).code !== 0){
          this.error('Could not install caddy service')
        }

        if(shell.exec('caddy -service start -name '+project.wPkg('slugName')).code !== 0){
          this.error('Could not start caddy service')
        }

        project.setProjectConf('proxy', proxyUrl)
      }

      this.log('Caddy proxy is running')

    }else{

      //Set caddyfile per project
      const caddyfileConf = project.getProjectConfigPath('Caddyfile')
      fs.writeFileSync(caddyfileConf, caddyFile(project.config.listeningOnPort, parsedProxy.hostname, parsedProxy.host, flags.email))
  
      if(shell.exec('caddy -agree -conf '+caddyfileConf).code !== 0){
        this.error('Could not start caddy')
      }
    }

  }

  createCaddyFile( email){
    const projects = this.wordupConfig.get('projects') || []
    let content = ''
    Object.keys(projects).forEach(key => {
      if(projects[key].proxy && projects[key].listeningOnPort){
        const parsedProxy = url.parse(projects[key].proxy)

        content += caddyFile(projects[key].listeningOnPort, parsedProxy.hostname, parsedProxy.host, email) + '\n'
      }
    })

    return content
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
