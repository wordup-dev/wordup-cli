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
    const {flags, args} = this.parse(ProxyCommand)

    const proxyUrl = flags.url || null

    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    }

    if(args.action === 'start' && !proxyUrl){
      this.error('The --url flag is required')
    }

    if(args.action === 'start' && !project.isWordupProjectRunning()){
      this.log('Your project is not running, please use '+chalk.bgBlue('wordup install') +' or '+chalk.bgBlue('wordup start') )
      this.exit(4)
    }

    if(args.action === 'reset' && !flags.service){
      this.error('Only caddy as a --service can be reseted')
    }

    if(proxyUrl && !utils.isValidUrl(proxyUrl)){
      this.error('The --url flag needs to be a valid url')
    }

    // Check if caddy exists 
    if(!shell.which('caddy')){
      this.error('Caddy [https://caddyserver.com] needs to be installed on your system')
    }

    const caddyfile = path.join(this.config.configDir, 'Caddyfile')

    // Execute the reset action
    if(args.action === 'reset'){
      this.resetCaddy(caddyfile, flags.email)
      this.log('Caddy settings reseted')
      this.exit(0)
    }


    const parsedProxy = url.parse(proxyUrl)

    if(flags.service){

      if(fs.existsSync(caddyfile)){
        project.setProjectConf('proxy', proxyUrl)

        // Regenerate the caddyfile based on all running proxies
        this.resetCaddy(caddyfile, flags.email)
        
      }else{
        const newCaddyFileConf = caddyFile(project.config.listeningOnPort, parsedProxy.hostname, parsedProxy.host, flags.email)
        fs.writeFileSync(caddyfile, newCaddyFileConf)
      
        if(shell.exec('caddy -service install -agree -conf '+caddyfile).code !== 0){
          this.error('Could not install caddy service')
        }

        if(shell.exec('caddy -service start').code !== 0){
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

  resetCaddy(caddyfile, email){

    const projects = this.wordupConfig.get('projects') || []
    let content = ''
    Object.keys(projects).forEach(key => {
      if(projects[key].proxy && projects[key].listeningOnPort){
        const parsedProxy = url.parse(projects[key].proxy)

        content += caddyFile(projects[key].listeningOnPort, parsedProxy.hostname, parsedProxy.host, email) + '\n'
      }
    })

    fs.writeFileSync(caddyfile, content)

    if(shell.exec('caddy -service restart').code !== 0){
      this.error('Could not restart caddy service')
    }

  }

}

ProxyCommand.description = `Creates a caddy proxy to your wordup installation
...
The proxy command needs caddy installed on the system. Make sure to have the appropriate permissions as a user
`

ProxyCommand.args = [
  {
    name: 'action',
    required: true,
    description: 'What action do you want to perform',
    default: 'start',
    options: ['start', 'reset'],
  },
]

ProxyCommand.flags = {
  url: flags.string({description: 'The url you would like to proxy to the wordup installation',required: false}),
  email: flags.string({description: 'The email for letsencrypt tls',required: true}),
  service: flags.boolean({description: 'Run caddy proxy as service'})
}

ProxyCommand.hidden = true

module.exports = ProxyCommand
