const {flags} = require('@oclif/command')

const shell = require('shelljs')
const open = require('open')
const fs = require('fs-extra')
const chalk = require('chalk')
const tcpPortUsed = require('tcp-port-used')
const tar = require('tar')
const tmp = require('tmp')
const path = require('path')

const Command =  require('../../command-base')
const utils =  require('../../lib/utils')

const InstallationPrompt =  require('../../prompts/installation')

class InstallCommand extends Command {
  async run() {
    const {flags} = this.parse(InstallCommand)
    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    }

    if (project.isWordupProjectRunning(true)) {
      this.exit(5)
    }

    // Check if project is already installed
    if (project.isInstalled()) {
      this.log('The development server and volumes are already installed. To delete this installation use: '+chalk.bgBlue('wordup local:stop --delete'))
      this.exit(4)
    }

    //If no custom port passed: assign a new port
    if(flags.port === '8000' && !project.wPkg('port')){
      flags.port = await project.assignNewPort(flags.port)
    }else{
      //check if there is a port number in config. Use it if no custom port is specified
      if(project.wPkg('port') && (flags.port === '8000')) flags.port = project.wPkg('port')

      const portInUse = await tcpPortUsed.check(parseInt(flags.port,10))
      if(portInUse){
        this.error('The selected port '+flags.port+' is in use')
      }
    }

    // Get the installation config from config.yml
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
      //if(wpInstall.config.siteUrl && !flags.siteurl) flags.siteurl = wpInstall.config.siteUrl
    }

    if (wordupArchive) {

        this.log('Trying to install archive from: '+wordupArchive)

        try {
          wordupArchive = await this.verifyInstallationArchive(wordupArchive)
        }catch(e){
          this.error(e.message)
        }
    } else if (wordupConnect) {
      
      this.error('This feature is under development and will be released soon')
      /*let privateKey = (flags['private-key'] || installPrompts.privateKey)
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
      }*/
    }

    const siteUrl = 'http://localhost:'+flags.port

    //Check project type specific things
    this.checkProjectType()
    //Set install startup script
    this.createWordupScript(wordupArchive, siteUrl)
    //Prepare docker-compose specific settings
    project.prepareDockerComposeUp(flags.port, flags.build)

    // ------- Install docker containers -----
    if(this.config.platform === 'win32'){
      this.log('INFO: You are using Windows. The installation process lasts up to 10 minutes. Please be patient.')
      this.log()
    }

    await this.customLogs('Installing wordup project and booting docker containers (can take some minutes)', (resolve, reject, showLogs) => {
      shell.exec('docker-compose --project-directory ' + project.getProjectPath() + ' up -d --build',{silent: !showLogs}, function (code, _stdout, _stderr) {
        if (code === 0) {
          resolve({done: '✔', code:code})
        } else {
          reject({done: 'There was an error while booting the docker containers. Perhaps the port is already taken.', code:code})
        }
      })
    })

    // ----- Installing WordPress ----
    await this.customLogs('Installing WordPress based on wordup config', (resolve, reject, showLogs) => {
      project.checkLiveliness(siteUrl).then(res => {
        shell.exec('docker-compose --project-directory ' + project.getProjectPath() + ' exec -T wordpress bash /wordup/config/cache/wordup.sh install',{silent: !showLogs}, function (code, _stdout, _stderr) {
          if (code === 0) {
            resolve({done: '✔', code:code})
          } else {
            reject({done: 'There was an error while installing WordPress', code:code})
          }
        })
      }).catch(e => reject(e))
    })

    this.log('')
    this.log('"'+project.wPkg('projectName') + '" successfully installed.')

    project.setProjectConf('installedOnPort', flags.port)
    project.setProjectConf('listeningOnPort', flags.port)
    project.setProjectConf('scaffoldOnInstall', false)

    //Print the urls and credentials
    utils.printDevServerInfos(this.log, flags.port, project)
    await open( siteUrl+'/wp-admin' , {wait: false})
    
  }

  checkProjectType(){
    if(this.wordupProject.wPkg('type') === 'installation'){
      let srcFiles = []
      try{
        srcFiles = fs.readdirSync(this.wordupProject.getProjectPath(this.wordupProject.wPkg('srcFolder', 'src')))
      }catch(e){}

      if(srcFiles.length > 0){
        this.error('Your source folder is not empty. Projects with type "installation" need an empty source folder in order to be installed correctly.',{exit:1})
      }
    }
  }

  createWordupScript(initFromArchiveJson, siteUrl){
    const projectType = this.wordupProject.wPkg('type')

    
    const plugins = this.wordupProject.wPkg('wpInstall.plugins', {})
    const themes = this.wordupProject.wPkg('wpInstall.themes', {})

    let customScripts = []

    // Create skript for installation archive only
    if(initFromArchiveJson){
      let excludeSrc = ''

      customScripts.push('\tif [ $(sudo -u www-data wp core version) != "'+initFromArchiveJson.wp_version+'" ]; then sudo -u www-data wp core update --force --version='+initFromArchiveJson.wp_version+'; fi')
      
      if(projectType === 'installation'){
        customScripts.push('\trm -rf /var/www/html/wp-content/*')
      }else{
        excludeSrc = '--exclude="backup/wp-content/'+projectType+'/'+this.wordupProject.wPkg('slugName')+'/*"'
      }

      customScripts.push('\ttar -xvf /wordup/dist/'+initFromArchiveJson.path+' backup/wp-content -C /var/www/html/wp-content '+excludeSrc+' --strip=1 --skip-old-files')
      customScripts.push('\ttar -xvf /wordup/dist/'+initFromArchiveJson.path+' backup/sql_dump.sql -C /var/www/html --strip=1 --skip-old-files')
      customScripts.push('\tsudo -u www-data wp db import /var/www/html/sql_dump.sql')
      customScripts.push('\trm /var/www/html/sql_dump.sql')
      customScripts.push('\tchown -R www-data:www-data /var/www/html/wp-content')

      this.createCustomShellScript(customScripts)
      return
    }else{

      // Normal installation
      const users = this.wordupProject.wPkg('wpInstall.users')
      let admin = null
      if(users && typeof users === 'object'){
        admin = users[0]
      }else{
        this.error('Please provide an admin user in your config.yml')
      }
      customScripts.push('\tchown -R www-data:www-data /var/www/html/wp-content')
      customScripts.push('\tsudo -u www-data wp core install --url='+siteUrl+' --title="'+this.wordupProject.wPkg('wpInstall.title', 'Wordup')+'" --admin_user='+admin.name+' --admin_password="'+admin.password+'" --admin_email='+admin.email)
      //customScripts.push('\tsudo -u www-data wp plugin install https://api.wordup.dev/release_dl/wordup-connect/latest/wordup-connect.zip --activate')
    }

    // ----- Set siteurl -----
    customScripts.push('\tsudo -u www-data wp config set WP_HOME "\'http://\'.\\$_SERVER[\'HTTP_HOST\']" --raw')
    customScripts.push('\tsudo -u www-data wp config set WP_SITEURL WP_HOME --raw')


    // ----- Custom language ----
    const lang = this.wordupProject.wPkg('wpInstall.language', 'en_US')
    if(lang !== 'en_US'){
      customScripts.push('\tsudo -u www-data wp language core install '+lang+' --activate')
    }

    // ----- Custom version ----
    const version = this.wordupProject.wPkg('wpInstall.version', null)
    if(version && version !== 'latest'){
      customScripts.push('\tsudo -u www-data wp core update --force --version='+version)
    }

    // ---- Themes & plugins
    Object.keys(plugins).forEach(value => {
      let version = plugins[value] !== 'latest' ? ' --version='+plugins[value] : ''
      customScripts.push('\tsudo -u www-data wp plugin install '+value+version)
    })

    Object.keys(themes).forEach(value => {
      let version = themes[value] !== 'latest' ? ' --version='+themes[value] : ''
      customScripts.push('\tsudo -u www-data wp theme install '+value+version)
    })

    // ------ Roles ------
    const roles = this.wordupProject.wPkg('wpInstall.roles', [])
    roles.forEach(role => {
      let clone_from = role.hasOwnProperty('clone_from') ? ' --clone='+role.clone_from : ''
      customScripts.push('\tsudo -u www-data wp role create '+role.key+' "'+role.name+'"'+clone_from)

      if(role.hasOwnProperty('capabilities') && typeof role.capabilities === 'object'){
        role.capabilities.forEach(cap => {
          customScripts.push('\tsudo -u www-data wp cap add '+role.key+' '+cap+' --quiet')
        })
      }

    });

    // ------ Users ------
    const users = this.wordupProject.wPkg('wpInstall.users', [])
    users.forEach((user, index) => {
      if(index > 0){
          customScripts.push('\tsudo -u www-data wp user create "'+user.name+'" '+user.email+' --role='+user.role+' --user_pass="'+user.password+'" --quiet')
      }
    })

    // ------ Media ------
    const mediaPath = this.wordupProject.getProjectPath('.wordup','media')
    if (fs.existsSync(mediaPath)) {
        customScripts.push('\tsudo -u www-data wp media import /wordup/config/media/* --user=1')
    }

    // ------ Scaffold ---
    const scaffold = this.wordupProject.getProjectPath(this.wordupProject.wPkg('srcFolder', 'src'), '.scaffold')
    if (fs.existsSync(scaffold)) {
      if(projectType === 'plugins'){
        customScripts.push('\tsudo -u www-data wp scaffold plugin '+this.wordupProject.wPkg('slugName'))
      }else if(projectType === 'themes'){
        customScripts.push('\tsudo -u www-data wp scaffold _s '+this.wordupProject.wPkg('slugName'))
      }
      fs.unlinkSync(scaffold)
    }

    //Create custom bash script
    this.createCustomShellScript(customScripts)

  }

  createCustomShellScript(customScripts){
    const customShellScript = this.wordupProject.getProjectCachePath('wordup.sh')

    fs.copySync(this.wordupProject.wordupDockerPath('wordup.sh'), customShellScript)

    const wordupBash = fs.readFileSync(customShellScript, 'utf8')

    const customWordupBash = wordupBash.replace(/###CUSTOM_SCRIPTS###/g, customScripts.join('\n'));
    
    fs.writeFileSync(customShellScript, customWordupBash, 'utf8')

  }

  async verifyInstallationArchive(tarballPath){

    if(utils.isValidUrl(tarballPath)) {
      const url = tarballPath
      tarballPath =  'archive-download-'+Math.floor(Date.now() / 1000)+'.tar.gz'
      try {
        await this.downloadArchive( url, tarballPath )
      }catch(e){
        return Promise.reject(e)
      }
    }

    return new Promise((resolve, reject) => {

      const tarballPathAbs = this.wordupProject.getProjectPath(this.wordupProject.wPkg('distFolder', 'dist'), tarballPath)

      if (!fs.existsSync(tarballPathAbs)) {
        return reject(new Error('Local installation archive not found'))
      }      
      
      const tmpobj = tmp.dirSync({unsafeCleanup:true})
      tar.x({
          file: tarballPathAbs,
          cwd:tmpobj.name,
          strip: 1,
      },['backup/info.json']).then(_=> {
        const jsonInfo = path.join(tmpobj.name, 'info.json')
        try {
          const infos = fs.readJSONSync(jsonInfo)
          infos.path = tarballPath

          this.log('')
          this.log('WP version: '+infos.wp_version)
          this.log('Created by: '+infos.source)
          this.log('Created at: '+infos.created)
          this.log('')

          return resolve(infos)
        }catch(e){
          return reject(new Error('Could not read the installation archive'))
        }
      }).catch(e => reject(e)).finally(() => tmpobj.removeCallback())
    })
  }


  async downloadArchive(url, tarballName) {  
    const axios = require('axios')

    const distPath = this.wordupProject.getProjectPath(this.wordupProject.wPkg('distFolder', 'dist'))
    fs.ensureDirSync(distPath)
    
    const tarballPathAbs = path.join(distPath, tarballName)
    const writer = fs.createWriteStream(tarballPathAbs)
  
    const response = await axios.get(url, {
      responseType: 'stream'
    })
  
    response.data.pipe(writer)
  
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  }

}

InstallCommand.description = `Install and start the WordPress development server
...
If there is no wpInstall config in .wordup/config.yml, a setup for your installation will be shown.

The web frontend for the catched emails (MailHog) is available on localhost:[WORDPRESS_PORT + 1]

Wordup will assign automatically a different default port, if the default port of 8000 is taken by another wordup project.

Note: Flags in this command overrule the wordup config.yml.
`

InstallCommand.aliases = ['install']

InstallCommand.flags = {
  ...Command.flags,
  port: flags.string({char: 'p', description: 'Install on a different port', default:'8000'}),
  prompt: flags.boolean({description: 'If you want to do the setup again', exclusive: ['archive','connect']}),
  archive: flags.string({description: 'Install from a wordup archive (needs to be located in your dist folder).'}),
  build: flags.boolean({description: 'Build the WordPress docker container on your system', default:false}),
  connect: flags.string({description: 'Install from a WordPress running website.', exclusive: ['archive'], hidden:true}),
  'private-key': flags.string({description: 'Private key for the wordup-connect plugin', exclusive: ['archive'], dependsOn: ['connect'], hidden:true}),
}

module.exports = InstallCommand
