const fs = require('fs-extra')
const path = require('path')
const shell = require('shelljs')
const chalk = require('chalk')
const crypto = require('crypto')
const dotProp = require('dot-prop')
const YAML = require('yaml')

const Config  = require('./config')

const wordupPackageRequiredItems = ['slug', 'projectName','type']
const wordupInstallationConfigItems = ['title', 'users']


class Project {
  constructor(oclifConfig, log, error) {
    //Set projectpath
    if(process.env.WORDUP_PROJECT_PATH){
      this.projectPath = process.env.WORDUP_PROJECT_PATH
    }else{
      this.projectPath = process.cwd()
    }

    //The configstore internal settings
    this._wordupConfigstore = new Config(oclifConfig.configDir)

    //The project specific configstore values
    this.config = {}

    //The oclif config
    this.oclifConfig = oclifConfig

    this.projectId = crypto.createHash('sha1').update(this.projectPath).digest('hex')

    // The .wordup/config.yml representation as a yaml document and as an json object
    // Internally this config is named wPkg
    this.dotWordupYml = {}
    this.dotWordupJson = {}

    this.log = log
    this.error = error
  }

  setUp() {
    let composerFiles = path.join(this.wordupDockerPath(), '/docker-compose.yml')

    //Legacy support for projects which don't have .wordup/config.yml
    this.updateWordupStructure()

    if (fs.existsSync(this.getProjectPath('.wordup','config.yml'))) {

      try {
        this.dotWordupYml = YAML.parseDocument(fs.readFileSync(this.getProjectPath('.wordup','config.yml'), 'utf8'))
        this.dotWordupJson = this.dotWordupYml.toJSON()
      } catch (err) {
        this.error('Could not parse wordup config: '+err, {exit:1})
      }

      // Create the slug as a name. Because it could be also a path
      const slug = this.wPkg('slug')
      if(slug){
        if (slug.lastIndexOf('/') !== -1) {
          dotProp.set(this.dotWordupJson, 'slugName', slug.substring(0, slug.lastIndexOf('/')))
        } else {
          dotProp.set(this.dotWordupJson, 'slugName', slug)
        }
      }

      // Get config based on the current path
      this.config = this._wordupConfigstore.get('projects.' + this.projectId)

      //Set docker-compose files
      if (fs.existsSync(this.getProjectPath('docker-compose.yml'))) {
        // If there is a local docker-compose.yml file, extend it
        const seperator = (this.oclifConfig.platform === 'win32') ? ';' : ':'
        composerFiles += seperator + this.getProjectPath('docker-compose.yml') 
      }
    }

    //Set env which are the same for each project
    shell.env.COMPOSE_FILE = composerFiles
    shell.env.WORDUP_DOCKERFILE_PATH = this.wordupDockerPath()

    // This is necessary to prevent file permission issues on LINUX with docker
    // Not working if uid exists in container. This is stil an issue
    // Kudos: https://jtreminio.com/blog/running-docker-containers-as-current-host-user/
    if(this.oclifConfig.platform === 'linux'){
      if (process.getuid) shell.env.WORDUP_UID = process.getuid()
      //GroupId is currently not used in dockerfiles
      if (process.getgid) shell.env.WORDUP_GID = process.getgid()
    }
    
  }

  //Get a custom wordup setting from config
  wPkg(key, defaultValue) {
    if (key) {
      return dotProp.get( this.dotWordupJson, key, defaultValue)
    }
    return this.dotWordupJson
  }

  setWordupPkg(key, value) {
    dotProp.set(this.dotWordupJson, key, value)

    const newValue = dotProp.get(this.dotWordupJson, key)
    const ymlLevels = key.split('.')
    if(ymlLevels.length > 1){
      this.dotWordupYml.setIn(ymlLevels, YAML.createNode(newValue))
    }else{
      this.dotWordupYml.set(key, YAML.createNode(newValue))
    }

    try {
      fs.writeFileSync(this.getProjectPath('.wordup','config.yml'), this.dotWordupYml.toString())
    } catch (err) {
      this.error(err, {exit:1})
    }

  }

  wordupDockerPath() {
    return path.join(__dirname, '../../docker')
  }

  createProjectConf(data) {
    if (!data.path) {
      throw new Error('Please provide a path')
    }
    const pathHash = crypto.createHash('sha1').update(data.path).digest('hex')
    this._wordupConfigstore.set('projects.' + pathHash, data)
    return pathHash
  }

  setProjectConf(name, value) {
    this._wordupConfigstore.set('projects.' + this.projectId + '.' + name, value)
  }

  resetProjectConf(existingId) {
    if (existingId) {
      this._wordupConfigstore.remove('projects.' + existingId)
    }

    const default_wordup_conf = {
      name: this.wPkg('projectName'),
      slugName: this.wPkg('slugName'),
      path: this.getProjectPath(),
      installedOnPort: (this.config ? this.config.installedOnPort : false),
      listeningOnPort: (this.config ? this.config.listeningOnPort : false),
      scaffoldOnInstall: (this.config ? this.config.scaffoldOnInstall : false),
      created: (this.config ? this.config.created : Math.floor(Date.now() / 1000))
    }
    this._wordupConfigstore.set('projects.' + this.projectId, default_wordup_conf)
    this.config = default_wordup_conf
  }

  isExecWordupProject(blockFunction) {

    // wordup config is always required
    if (!fs.existsSync(this.getProjectPath('.wordup','config.yml'))) {
      //Legacy support
      this.log('No wordup config found. Create a new project or go to an existing wordup project folder.')
      return false
    }

    const wordupPackage = this.wPkg()
    const notFound = wordupPackageRequiredItems.filter(key => {
      return !wordupPackage.hasOwnProperty(key);
    })

    if(notFound.length > 0){
      this.error('Your wordup config is not correctly setup. Missing values: '+notFound.join(', '),{exit:5})
      return false
    }

    //Some functions cannot execute if the project is of type installation
    const blockedInstallationFunctions = ['snippet'];
    if(blockFunction && blockedInstallationFunctions.indexOf(blockFunction) >= 0){
      this.error('This function is not available in a project of type: installation',{exit:5})
      return false
    }

    // If no config: use this project 
    if (!this.config || !this.config.path) {
      this.resetProjectConf()
    }

    //Check changed slug
    if(this.wPkg('slugName') !== this.config.slugName){
      this._wordupConfigstore.remove('projects.' + this.projectId)
      this.error('You have changed the slug in your wordup config, please reinstall this project: '+chalk.bgBlue('wordup stop --project='+this.config.slugName+' --delete')+' and '+chalk.bgBlue('wordup install'),{exit:6})
      return false
    }    


    // Just notify if there is a custom docker-compose.yml
    if (fs.existsSync(this.getProjectPath('docker-compose.yml'))) {
      this.log('Running with extended docker-compose file')
    }
    return true
  }

  isInstalled() {
    return this.config && (this.config.installedOnPort !== false)
  }

  isWordupProjectRunning(showMsg=false) {
    let runningProjectNames = [];

    //Because of windows bug, --format {{.Label "wordup.dev.project"}} can not be used
    const runningProjectsStr = shell.exec('docker ps --filter "label=wordup.dev.project" --format="{{.Labels}}"', {silent: true}).stdout.trim()
    const runningProjects = runningProjectsStr.split('\n')
    if (runningProjectsStr && runningProjects.length > 0) {
      runningProjects.forEach((container)=> {
        const labels = container.split(',')
        const projectName = labels.find((el) => el.startsWith('wordup.dev.project'))
        if(projectName){
          runningProjectNames.push(projectName.replace('wordup.dev.project=',''))
        }
      })
    }

    if (runningProjectNames.length > 0) {
      this.log('')
      this.log('--- Currently running wordup projects:', runningProjectNames.toString(', ')+' ---')
      this.log('')
      if (runningProjectNames.indexOf(this.wPkg('slugName')) >= 0) {
          if(showMsg){
            this.log('The project ('+this.wPkg('slugName')+') is already running. You can stop it with: '+chalk.bgBlue('wordup stop'))
          }
          return true
      }
      

      // console.log(chalk.bgBlue('docker rm -f $(docker ps -q -a --filter "label=wordup.dev")'));
      // console.log(chalk.bgBlue('docker volume rm -f '+docker+'_db_data '+docker+'_wp_data'));
      // console.log(chalk.bgBlue('docker network rm '+docker+'_default'));

    }
    return false
  }

  assignNewPort(defaultPort) {
    const projects = this._wordupConfigstore.get('projects') || []

    let ports = []

    Object.keys(projects).forEach(key => {
      if(projects[key].listeningOnPort) {
        ports.push(parseInt(projects[key].listeningOnPort,10))
      }
    })

    if(ports.length > 0){
      ports.sort((a, b) => a - b)
      let newPort = undefined;
      let testPort = parseInt(defaultPort,10)
      do {
        const closePort = ports.find(function(port) {
          return port === testPort || testPort < (port + 10)
        });
        if(!closePort){
          newPort = testPort
        }else{
          testPort = testPort + 10
        }
      } while (!newPort)
      return String(newPort)
    }
    
    return String(defaultPort)
  }

  getWordupPkgB64() {
    const wordupjson = JSON.stringify(this.wPkg())
    return Buffer.from(wordupjson).toString('base64')
  }

  getWordupPkgInstall(){
    const installation = dotProp.get(this.dotWordupJson, 'wpInstall')

    if (typeof installation === 'string'){
      const regex = /^(archive|wordup-connect):(.*)/g
      let matches = regex.exec(installation)
      if(matches && matches[0]){
        return {
          'type':matches[1],
          'config':matches[2]
        }
      }
      
      this.error('Your wordup installation config is not correctly setup. You have provided a string, which is not matching the criterias.', {exit:1})
    
    }else if(typeof installation === 'object'){

      if(Object.keys(installation).length === 0){
        return false
      }

      const notFound = wordupInstallationConfigItems.filter(key => {
        if(key === 'users'){
          return !installation.hasOwnProperty(key) || installation[key].length === 0 
        }
        return !installation.hasOwnProperty(key);
      })

      if(notFound.length > 0){
        this.error('Your wordup installation config is not correctly setup. Missing values: '+notFound.join(', '),{exit:1})
      }

      return {
        'type':'new',
        'config':installation
      }
    }
    return false
  }


  prepareDockerComposeUp(port){

    shell.env.COMPOSE_PROJECT_NAME = this.wPkg('slugName')
    shell.env.WORDUP_PROJECT = this.wPkg('slugName')
    shell.env.WORDUP_PORT = port
    shell.env.WORDUP_MAIL_PORT = parseInt(port,10) + 1

    shell.env.WORDUP_SRC_FOLDER = this.wPkg('srcFolder', 'src')
    shell.env.WORDUP_DIST_FOLDER = this.wPkg('distFolder','dist')

    //This is a hack to prevent file permission issues in bind mount volumes in docker-compose 
    const srcFolder = this.getProjectPath(shell.env.WORDUP_SRC_FOLDER)
    const distFolder = this.getProjectPath(shell.env.WORDUP_DIST_FOLDER)
    if (!fs.existsSync(srcFolder)) fs.mkdirSync(srcFolder)
    if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder)

  }

  getProjectPath(...addPath){
    if(addPath){
      return path.join(this.projectPath,...addPath)
    }
    return this.projectPath
  }

  updateWordupStructure(){
    const wordupFolder = this.getProjectPath('.wordup')

    if (fs.existsSync(this.getProjectPath('package.json')) && !fs.existsSync(wordupFolder)) {

      const pjson = fs.readJsonSync(this.getProjectPath('package.json'))
      if(pjson.hasOwnProperty('wordup')){

          fs.mkdirSync(wordupFolder)
          
          const newConfig = Object.assign({},pjson.wordup)
          if(newConfig.hasOwnProperty('wpInstall')){
            newConfig.wpInstall.language = 'en_US'

            if(newConfig.wpInstall.hasOwnProperty('adminUser')){
              newConfig.wpInstall.users = [{
                'name': newConfig.wpInstall.adminUser,
                'email': newConfig.wpInstall.adminEmail,
                'password': newConfig.wpInstall.adminPassword,
                'role':'administrator'
              }]

              delete newConfig.wpInstall.adminUser
              delete newConfig.wpInstall.adminEmail
              delete newConfig.wpInstall.adminPassword
            }
          }

          try {

            const doc = new YAML.Document()
            doc.commentBefore = ' This is the new wordup config. All wordup specific config from package.json moved here.'
            doc.contents = newConfig

            fs.writeFileSync(this.getProjectPath('.wordup','config.yml'), doc.toString())

          } catch (err) {
            this.error(err, {exit:1})
          }

          this.log('INFO: The wordup config has been moved to .wordup/config.yml in your project folder.')
          this.log('')
      }
    }

  }

}

module.exports = Project
