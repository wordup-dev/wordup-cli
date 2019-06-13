const {flags} = require('@oclif/command')

const shell = require('shelljs')
const open = require('open')
const fs = require('fs')
const chalk = require('chalk')

const Command =  require('../command-base')
const utils =  require('../lib/utils')

const InstallationPrompt =  require('../prompts/installation')

class InstallCommand extends Command {
  async run() {
    const {flags} = this.parse(InstallCommand)
    const forceInstall = flags.force
    const project = this.wordupProject
    if (!project.isExecWordupProject()) {
      this.exit(1)
    }

    if (project.isWordupProjectRunning(true)) {
      this.exit(5)
    }

    // Check if project is already installed
    if (project.isInstalled()) {
      this.log('The development server and volumes are already installed. To delete this installation use: '+chalk.bgBlue('wordup stop --delete'))
      this.exit(4)
    }

    //If no custom port passed: assign a new port
    if(flags.port === '8000' && !project.wPkg('port')){
      flags.port = project.assignNewPort(flags.port)
    }

    // Get the installation config from package.json
    let wpInstall  = project.getWordupPkgInstall()

    let wordupArchive = flags.archive ||  undefined
    let wordupConnect = flags.connect ||  undefined

    const installPrompts = new InstallationPrompt(project)
    if (flags.prompt || (!wordupArchive && !wordupConnect && !wpInstall)) {
      await installPrompts.init()
      this.log('')
      //Get config again
      wpInstall = project.getWordupPkgInstall()
    }

    //Parse the finale installtion config, after prompting
    if(!wordupArchive && wpInstall.type === 'archive'){
      wordupArchive = wpInstall.config
    }else if(!wordupConnect && wpInstall.type === 'wordup-connect'){
      wordupConnect = wpInstall.config
    }else if(!wordupArchive && !wordupConnect && wpInstall.type === 'new'){
      if(wpInstall.config.siteUrl && !flags.siteurl) flags.siteurl = wpInstall.config.siteUrl
    }

    //check if there is a port number in package.json. Use it if no custom port is specified
    if(project.wPkg('port') && (flags.port === '8000')) flags.port = project.wPkg('port')

    let installParams = ''
    let addVolumes = ''

    if (wordupArchive) {
      if (utils.isValidUrl(wordupArchive)) {
        this.log('Download wordup archive from ' + wordupArchive)
        installParams += ' --wordup-archive=' + wordupArchive
      } else {
        
        this.log('Installing archive from path: '+wordupArchive)

        if (!fs.existsSync(wordupArchive)) {
          this.error('Unable to read local archive file', {exit: 1})
        }
        const path = require('path')

        addVolumes = ' -v ' + path.resolve(wordupArchive) + ':/source/' + path.basename(wordupArchive)
        installParams += ' --wordup-archive=' + path.basename(wordupArchive)
      }
    } else if (wordupConnect) {
      let privateKey = (flags['private-key'] || installPrompts.privateKey)
      if (!privateKey) {
        await installPrompts.askWordupConnect(wordupConnect)
        privateKey = installPrompts.privateKey
      }

      const connect = require('../lib/connect')
      const sourceDataResp = await connect.isValidConnection(wordupConnect, privateKey)
      if (sourceDataResp.status === 'ok') {
        this.log('Successfully called wordup-connect API on ' + wordupConnect)
        this.log('Info: Based on your backup size, the installation can take quite a while.')
        installParams += ' --wordup-connect=' + wordupConnect + ' --private-key=' + privateKey
      } else if (sourceDataResp.status === 'error') {
        this.error('Could not process updraftplus backup', {exit: 1})
      } else {
        this.error('Could not connect with WordPress website (have you installed the wordup plugin on your server?).', {exit: 1})
      }
    }

    // Check if scaffold src files
    const projectConf = project.config || false
    if (projectConf && projectConf.scaffoldOnInstall !== false) {
      installParams += ' --scaffold'+(projectConf.scaffoldOnInstall !== true ? '='+projectConf.scaffoldOnInstall : '')
    }

    //Set wp url. Only url OR port is allowed
    if(flags.siteurl){
      installParams += ' --siteurl='+flags.siteurl
    }

    //Set install params
    project.prepareDockerComposeUp(flags.port)

    //Install docker servers
    const bootCode = await this.customLogs('Installing wordup project and connected docker containers (can take some minutes)', (resolve, reject, showLogs) => {
      shell.exec('docker-compose --project-directory ' + project.getProjectPath() + ' up -d --build',{silent: !showLogs}, function (code, _stdout, _stderr) {
        if (code === 0) {
          resolve({done: '✔', code:code})
        } else {
          resolve({done: 'There was an error. Perhaps the port is already taken.', code:code})
        }
      })
    })

    //Set up the wordpress installation 
    if(bootCode === 0){

      await this.customLogs('Waiting 10s for the server to boot', (resolve, reject, showLogs) => {
        setTimeout(() => {
          resolve({done: '✔', code:0})
        },10000)
      })
      
      const installCode = await this.customLogs('Setting-up WordPress based on your package.json settings', (resolve, reject, showLogs) => {
        shell.exec('docker-compose --project-directory ' + project.getProjectPath() + ' run --rm ' + addVolumes + ' wordpress-cli wordup install ' + project.getWordupPkgB64() + installParams, {silent: !showLogs}, function (code, _stdout, _stderr) {
          resolve({done: '✔', code:code})
        })
      })

      if(installCode === 0){
        if(flags.siteurl) project.setProjectConf('customSiteUrl', flags.siteurl)

        project.setProjectConf('installedOnPort', flags.port)
        project.setProjectConf('listeningOnPort', flags.port)
        project.setProjectConf('scaffoldOnInstall', false)
        
        this.log('"'+project.wPkg('projectName') + '" successfully installed.')
        this.log('')
        this.log('WordPress listening at http://localhost:' + flags.port)
        this.log('MailHog (catches WordPress mails) listening at http://localhost:' + shell.env.WORDUP_MAIL_PORT)
        this.log('')

        await open( (flags.siteurl ? flags.siteurl : 'http://localhost:' + flags.port)+'/wp-admin' , {wait: false})
      }else{
        this.error('There was an error with setting-up WordPress', {exit: 1})
      }
    
    }else{
      this.error('There was an error while booting the docker containers.', {exit: 10})
    }

  }
}

InstallCommand.description = `Install and start the WordPress development server
...
If there is no wordup installation config in your package.json, a setup for your installation will be shown.
You can set a custom site url for WordPress, but please be aware that you have to proxy this url to your localhost:port

The web frontend for the catched emails (MailHog) is available on localhost:[WORDPRESS_PORT + 1]

Wordup will assign automatically a different default port, if the default port of 8000 is taken by another wordup project.

Note: Flags in this command overrule the config of your package.json.
`

InstallCommand.flags = {
  ...Command.flags,
  port: flags.string({char: 'p', description: 'Install on a different port', default:'8000'}),
  siteurl: flags.string({description: 'Specify a custom WordPress site url. Use --help for details.'}),
  force: flags.boolean({char: 'f', description: 'Force the installation of the project (deprecated)', hidden:true}),
  prompt: flags.boolean({description: 'If you want to do the setup again', exclusive: ['archive','connect']}),
  archive: flags.string({description: 'Install from a wordup archive.'}),
  connect: flags.string({description: 'Install from a WordPress running website.', exclusive: ['archive']}),
  'private-key': flags.string({description: 'Private key for the wordup-connect plugin', exclusive: ['archive'], dependsOn: ['connect']}),
}

module.exports = InstallCommand
