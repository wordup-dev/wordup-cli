const fs = require('fs-extra')
const path = require('path')
const shell = require('shelljs')
const chalk = require('chalk')
const crypto = require('crypto')
const dotProp = require('dot-prop')
const YAML = require('yaml')
const tcpPortUsed = require('tcp-port-used')

const Config  = require('./config')
const {wordupConformPath} =  require('./utils')

const wordupPackageRequiredItems = ['slug', 'projectName','type']
const wordupInstallationConfigItems = ['title', 'users']

class Project {
  constructor(oclifConfig, log, error) {
    //Set projectpath
    if(process.env.WORDUP_PROJECT_PATH){
      this.projectPath = wordupConformPath(process.env.WORDUP_PROJECT_PATH)
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

  wordupDockerPath(...addPath) {
    if(addPath){
      return path.join(__dirname, '../../docker', ...addPath);
    }
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
    if(blockFunction && this.wPkg('type') === 'installation' && blockedInstallationFunctions.indexOf(blockFunction) >= 0){
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
      this.error('You have changed the slug in your wordup config, please reinstall this project: '+chalk.bgBlue('wordup local:stop --project='+this.config.slugName+' --delete')+' and '+chalk.bgBlue('wordup local:install'),{exit:6})
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
            this.log('The project ('+this.wPkg('slugName')+') is already running. You can stop it with: '+chalk.bgBlue('wordup local:stop'))
          }
          return true
      }
      

      // console.log(chalk.bgBlue('docker rm -f $(docker ps -q -a --filter "label=wordup.dev")'));
      // console.log(chalk.bgBlue('docker volume rm -f '+docker+'_db_data '+docker+'_wp_data'));
      // console.log(chalk.bgBlue('docker network rm '+docker+'_default'));

    }
    return false
  }

  async assignNewPort(defaultPort) {
    const projects = this._wordupConfigstore.get('projects') || []

    let ports = []

    Object.keys(projects).forEach(key => {
      if(projects[key].listeningOnPort) {
        ports.push(parseInt(projects[key].listeningOnPort,10))
      }
    })

    const getNewPort = async (startPort) => {
      let newPort = undefined;
      if(ports.length > 0){
        ports.sort((a, b) => a - b)
        let testPort = parseInt(startPort,10)
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
      }else{
        newPort = parseInt(startPort, 10)
      }

      const inUse = await tcpPortUsed.check(parseInt(newPort,10))
      if(inUse){
          return await getNewPort(newPort+10)
      }else{
        return String(newPort)
      }
    }

    return await getNewPort(defaultPort)
      
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


  prepareDockerComposeUp(port, build){

    // Check if docker-compose is installed
    if (!shell.which('docker-compose')) {
      this.log('This CLI requires ' + chalk.bgBlue('docker-compose') + '. Please download: https://www.docker.com/get-started')
      this.log('If you dont want to signup for downloading Docker Desktop')
      this.log('You can download Docker Desktop directly here: ')
      if (this.oclifConfig.platform === 'win32') {
        this.log('https://docs.docker.com/docker-for-windows/release-notes/')
      } else {
        this.log('https://docs.docker.com/docker-for-mac/release-notes/')
      }
      process.exit()
    }


    // This is necessary to prevent file permission issues on LINUX with docker
    // Not working if uid exists in container. This is stil an issue
    // Kudos: https://jtreminio.com/blog/running-docker-containers-as-current-host-user/
    if(this.oclifConfig.platform === 'linux'){
      // If the current user is not root
      if (process.getuid && process.getuid() !== 33){
        this.log('')
        this.log('INFO: You are running this command on linux with a different host uid than we use in the containers:')
        this.log('Some wordup functions could not be working correctly.')
        this.log('Try to run wordup local:install with the --build command.')
        this.log('')
      }
    }

    shell.env.COMPOSE_PROJECT_NAME = this.wPkg('slugName')

    //This is a hack to prevent file permission issues in bind mount volumes in docker-compose 
    const srcFolder = this.getProjectPath(this.wPkg('srcFolder', 'src'))
    const distFolder = this.getProjectPath(this.wPkg('distFolder','dist'))
    if (!fs.existsSync(srcFolder)) fs.mkdirSync(srcFolder)
    if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder)

    //2do: optional 
    //fs.chmodSync(srcFolder,  parseInt('0777', 8))
    //fs.chmodSync(distFolder,  parseInt('0777', 8))

    //Set project specific docker-compose file
    const seperator = (this.oclifConfig.platform === 'win32') ? ';' : ':'
    let composerFiles = this.getProjectConfigPath('docker-compose.yml')

    if (!fs.existsSync(composerFiles) || port || build){
      this.createComposeFile(port, build)
    }

    //Set custom docker-compose file
    if (fs.existsSync(this.getProjectPath('docker-compose.yml'))) {
      // If there is a local docker-compose.yml file, extend it
      composerFiles += seperator + this.getProjectPath('docker-compose.yml') 
    }

    shell.env.COMPOSE_FILE = composerFiles

  }


  createComposeFile(port, build){

    if(!port) port = 8000

    const projectTitle = this.wPkg('slugName')
    const isCloudNode = process.env.WORDUP_CLOUD_NODE || false

    const file = fs.readFileSync( this.wordupDockerPath('docker-compose.dev.yml') , 'utf8')

    let dockerComposeSettings = YAML.parse(file)

    // Check if WP docker container should be build on system
    if(build){
      let buildArgs = {}
      if(this.oclifConfig.platform === 'linux' && process.getuid){
        buildArgs['USER_ID'] = process.getuid()
      }
      dockerComposeSettings.services.wordpress.image = 'wordup-wp:2.0'
      dockerComposeSettings.services.wordpress.build = {
        'context':this.wordupDockerPath(),
        'args': buildArgs
      }
    }

    // Set port
    dockerComposeSettings.services.wordpress.ports = [port+':80']

    // Set volumes
    let wpVolumes = dockerComposeSettings.services.wordpress.volumes
    if(this.wPkg('type') === 'installation'){
      // In cloud node, don't mount volume
      if(!isCloudNode) wpVolumes.push('./'+this.wPkg('srcFolder', 'src')+':/var/www/html/wp-content')
    }else{
      wpVolumes.push('./'+this.wPkg('srcFolder', 'src')+':/var/www/html/wp-content/'+this.wPkg('type')+'/'+this.wPkg('slugName'))
    }

    wpVolumes.push('./'+this.wPkg('distFolder', 'dist')+':/wordup/dist')
    wpVolumes.push('./.wordup:/wordup/config')
    dockerComposeSettings.services.wordpress.volumes = wpVolumes

    //Set labels 
    let labels = dockerComposeSettings.services.wordpress.labels
    labels.push('wordup.dev.project='+projectTitle)
    dockerComposeSettings.services.wordpress.labels = labels

    // Set settings 
    let env = dockerComposeSettings.services.wordpress.environment 
    /*env.push('WORDPRESS_BLOG_NAME='+this.wPkg('wpInstall.title', projectTitle))

    if(isCloudNode){
      env.push('WORDPRESS_SCHEME=https')
    }

    // Users
    const users = this.wPkg('wpInstall.users')
    if(users && typeof users === 'object'){
      const admin = users[0]
      env.push('WORDPRESS_USERNAME='+admin.name)
      env.push('WORDPRESS_PASSWORD='+admin.password)
      env.push('WORDPRESS_EMAIL='+admin.email)
    }else{
      //2do: Default Values
    }*/
    env.push('WORDUP_PROJECT='+projectTitle)
    env.push('WORDUP_PROJECT_TYPE='+this.wPkg('type'))
    env.push('WORDUP_CLOUD_NODE='+ (isCloudNode ? 'yes' : 'no'))
    
    //Set mailhog port
    dockerComposeSettings.services.mail.ports = [ (parseInt(port,10) + 1)+':8025']

    // Custom Table prefix
    const tablePrefix = this.wPkg('wpInstall.tablePrefix')
    if(tablePrefix){
      env.push('WORDPRESS_TABLE_PREFIX='+tablePrefix)
    }

    const projectDockerComposeFile = this.getProjectConfigPath('docker-compose.yml')

    const comment = '#Never change this file directly, use wordup-cli instead.\n\n'
    try {
      fs.writeFileSync(projectDockerComposeFile, comment+YAML.stringify(dockerComposeSettings))
    } catch (err) {
      this.error('Could not create docker-compose file')
    }


  }


  getProjectPath(...addPath){
    if(addPath){
      return path.join(this.projectPath,...addPath)
    }
    return this.projectPath
  }

  getProjectConfigPath(...addPath){
    const projectConfigPath = path.join(this.projectPath, '.wordup', 'docker')
    if (!fs.existsSync(projectConfigPath)) {
      fs.mkdirSync(projectConfigPath)
    }
    
    if(addPath){
      return path.join(projectConfigPath,...addPath)
    }
    return projectConfigPath
  } 

  checkLiveliness(url){
    return new Promise((resolve, reject) => {
      let tries = 0
      const check = () => {
        setTimeout(() => {
          tries++;
          shell.exec('docker-compose --project-directory ' + this.getProjectPath() + ' exec -T wordpress curl -sI http://localhost:80',{silent: true}, function (code, _stdout, _stderr) {
            if(code === 0){
              resolve({done: '✔', code:0})
            }else if (tries < 150) {
              check()
            }else{
              reject({done: 'The WordPress docker container is not running (timeout)', code:1})
            }
          })
        }, 3000);
      }
      check()
    })
  }



}

module.exports = Project
