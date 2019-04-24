const fs = require('fs-extra')
const path = require('path')
const shell = require('shelljs')
const chalk = require('chalk')
const crypto = require('crypto')
const dotProp = require('dot-prop')

const Config  = require('./config')

const wordupPackageRequiredItems = ['slug', 'projectName','type']
const wordupInstallationConfigItems = ['title', 'adminUser','adminPassword', 'adminEmail']


class Project {
  constructor(configDir, log, error) {
    this._wordupConfig = new Config(configDir)
    this.projectId = crypto.createHash('sha1').update(process.cwd()).digest('hex')
    this.config = {}
    this.pjson = {}
    this.log = log
    this.error = error
  }

  setUp() {
    let composerFiles = path.join(this.wordupDockerPath(), '/docker-compose.yml')

    if (fs.existsSync('./package.json')) {
      try {
        this.pjson = fs.readJsonSync('./package.json')
      } catch (err) {
        this.error('Could not parse package.json', {exit:1})
      }

      // Create the slug as a name. Because it could be also a path
      const slug = this.wPkg('slug')
      if(slug){
        if (slug.lastIndexOf('/') !== -1) {
          dotProp.set(this.pjson, 'wordup.slugName', slug.substring(0, slug.lastIndexOf('/')))
        } else {
          dotProp.set(this.pjson, 'wordup.slugName', slug)
        }
      }

      // Get config based on the current path
      this.config = this._wordupConfig.get('projects.' + this.projectId)

      //Set docker-compose files
      if (fs.existsSync('./docker-compose.yml')) {
        // If there is a local docker-compose.yml file, extend it
        const seperator = (this.config.platform === 'win32') ? ';' : ':'
        composerFiles += seperator + path.join(process.cwd(), '/docker-compose.yml')
      }
    }

    shell.env.COMPOSE_FILE = composerFiles
    shell.env.WORDUP_DOCKERFILE_PATH = this.wordupDockerPath()
  }

  //Get a custom wordup setting from package.json
  wPkg(key) {
    if (key) {
      return dotProp.get( this.pjson, 'wordup.'+key)
    }
    return dotProp.get( this.pjson, 'wordup',{})
  }

  setWordupPkg(key, value) {
    dotProp.set(this.pjson, 'wordup.'+key, value)

    let pjsonCopy = JSON.parse(JSON.stringify(this.pjson))
    dotProp.delete(pjsonCopy, 'wordup.slugName')

    try {
      fs.writeJsonSync('./package.json', pjsonCopy, {spaces: 4})
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
    this._wordupConfig.set('projects.' + pathHash, data)
    return pathHash
  }

  setProjectConf(name, value) {
    this._wordupConfig.set('projects.' + this.projectId + '.' + name, value)
  }

  resetProjectConf(existingId) {
    if (existingId) {
      this._wordupConfig.remove('projects.' + existingId)
    }

    const default_wordup_conf = {
      name: this.wPkg('projectName'),
      slugName: this.wPkg('slugName'),
      path: process.cwd(),
      installedOnPort: (this.config ? this.config.installedOnPort : false),
      listeningOnPort: (this.config ? this.config.listeningOnPort : false),
      created: (this.config ? this.config.created : Math.floor(Date.now() / 1000))
    }
    this._wordupConfig.set('projects.' + this.projectId, default_wordup_conf)
    this.config = default_wordup_conf
  }

  isExecWordupProject() {
    // package.json is always required
    if (!fs.existsSync('./package.json')) {
      this.log('No package.json. Create a new project or go to an existing wordup project folder.')
      return false
    }

    const wordupPackage = this.wPkg()
    const notFound = wordupPackageRequiredItems.filter(key => {
      return !wordupPackage.hasOwnProperty(key);
    })

    if(notFound.length > 0){
      this.error('Your wordup package.json is not correctly setup. Missing values: '+notFound.join(', '),{exit:5})
      return false
    }

    // If no config: use this project 
    if (!this.config || !this.config.path) {
      this.resetProjectConf()
    }

    //Check changed slug
    if(this.wPkg('slugName') !== this.config.slugName){
      this._wordupConfig.remove('projects.' + this.projectId)
      this.error('You have changed the slug in package.json, please reinstall this project: '+chalk.bgBlue('wordup stop --project='+this.config.slugName+' --delete')+' and '+chalk.bgBlue('wordup install'),{exit:6})
      return false
    }    


    // Just notify if there is a custom docker-compose.yml
    if (fs.existsSync('./docker-compose.yml')) {
      this.log('Running with extended docker-compose file')
    }
    return true
  }

  isInstalled() {
    return this.config && (this.config.installedOnPort !== false)
  }

  setDockerCompose() {
    // If there is no docker-compose.yml use default one
    if (!fs.existsSync('./docker-compose.yml')) {
      shell.env.COMPOSE_FILE = path.join(this.wordupDockerPath(), '/docker-compose.yml')
    } else {
      delete shell.env.COMPOSE_FILE
    }
    shell.env.WORDUP_DOCKERFILE_PATH = this.wordupDockerPath()
  }

  isWordupRunning(msg,checkOwn=false) {
    const runningProjectsStr = shell.exec('docker ps --filter "label=wordup.dev.project" --format \'{{.Label "wordup.dev.project"}}\'', {silent: true}).stdout.trim()
    const runningProjects = runningProjectsStr.split('\n')
    if (runningProjectsStr && runningProjects.length > 0) {

      if (runningProjects.indexOf(this.wPkg('slugName')) >= 0) {
          if(!checkOwn){
            this.log('This project is already running')
          }
          return true
      }else if(checkOwn){
          return false
      }

      this.log('Some wordup projects are already running:', runningProjects.toString(',  '))
      this.log('You could stop it by running: ')
      this.log('')

      runningProjects.forEach(item => {
        this.log(chalk.bgBlue('wordup stop --project=' + item))
      })

      if (msg) {
        this.log('')
        this.log(msg)
      }

      // console.log(chalk.bgBlue('docker rm -f $(docker ps -q -a --filter "label=wordup.dev")'));
      // console.log(chalk.bgBlue('docker volume rm -f '+docker+'_db_data '+docker+'_wp_data'));
      // console.log(chalk.bgBlue('docker network rm '+docker+'_default'));

      return true
    }
    return false
  }

  getWordupPkgB64() {
    const wordupjson = JSON.stringify(this.wPkg())
    return Buffer.from(wordupjson).toString('base64')
  }

  getWordupPkgInstall(){
    const installation = dotProp.get(this.pjson, 'wordup.wpInstall')

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

      const notFound = wordupInstallationConfigItems.filter(key => {
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
}

module.exports = Project
