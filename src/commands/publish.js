const {flags} = require('@oclif/command')
const fs = require("fs")
const path = require("path")
const axios = require('axios')

const fglob = require('fast-glob')
const tar = require("tar")
const tmp = require("tmp")
const ignore = require('ignore')

const Command =  require('../command-base')
const WordupAPI =  require('../lib/api')

class PublishCommand extends Command {
  async run() {
    const {flags} = this.parse(PublishCommand)
    
    const projectToken = flags.token || null
    this.semverIncrement = flags.increment

    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    } 

    //If no project token is provided, just 
    this.userToken = null;
    if(!projectToken){
      this.userToken = this.getUserAuthToken()
      if(!this.userToken){
        this.log('Please authenticate first with: wordup auth')
        this.exit(2)
      }else{
        this.api = new WordupAPI(this.userToken)
      }
    }

    this.projectSlug = project.wPkg('slugName') || process.env.WORDUP_PROJECT_SLUG
    this.accessToken = projectToken || (project.config.accessToken ? project.config.accessToken : null)

    tmp.setGracefulCleanup()

    const tempFile = tmp.fileSync({
      prefix: "wordup-archive-",
      postfix: ".tar.gz"
    })

    const result = await this.createArchive(tempFile)

    if(result){
      this.log('---')
      this.log('Successfully uploaded project')
    }
  }

  async listFiles(sourceDirectory){

    const ig = ignore()

    const gitignoreFile = path.join(sourceDirectory, '.gitignore')

    if(fs.existsSync(gitignoreFile)) {
      ig.add(fs.readFileSync(gitignoreFile).toString())
    }
    ig.add(['/node_modules']) //never upload node_modules

    const files = await fglob('**', {
        dot: true,
        cwd: sourceDirectory,
    });

    return ig.filter(files);
  }

  async getAccessToken(){

    //First check if we have a wordup projectSlug
    if(!this.projectSlug){
        this.error('Please provide a valid wordup project ID in your config.yml')
        return false
    }

    if(!this.accessToken){
        try {
            const newToken = await this.newAccessToken()
            this.accessToken = newToken.token_raw
            this.wordupProject.setProjectConf('accessToken',this.accessToken)
        }catch(error){
            this.error(error.message)
        }
    }
  }

  async newAccessToken(){

    return new Promise((resolve, reject) => {

        let projectSlug = this.projectSlug

        if(!projectSlug){
            return reject(new Error('No project slug found in your wordup project config'))
        }

        this.api.projectAccessToken(projectSlug).then((response) => {
            resolve(response.data)
        }).catch(error => {
          if(error.response.status === 403){
            reject(new Error('Access forbidden. Please verify if your local project slug corresponds with your remote wordup project.'))
          }
        })
          
    })
  }

  async createArchive(tmpFile){
    const sourceDirectory = this.wordupProject.getProjectPath()

    try {
        fs.statSync(sourceDirectory);
    } catch (err) {
        if (err.code === "ENOENT") {
          this.error('Project directory is not readable')
          return false;
        }
    }

    await this.getAccessToken()

    if(!this.accessToken){
        return false
    }

    //Get all files which are not ignored
    const allFiles = await this.listFiles(sourceDirectory);

    const archiveResult = await tar.c({
        gzip: true,
        file: tmpFile.name,
        cwd: sourceDirectory,
        follow: true,
        noDirRecurse: true,
        portable: true,
    },allFiles).then(() => {
        const stats = fs.statSync(tmpFile.name);
        return {
            file: tmpFile.name,
            manifest: allFiles,
            size: stats.size,
            source: sourceDirectory,
        };
    });

    return await this.uploadArchive(archiveResult)
  }

  async uploadArchive(archiveResult){

    const data = fs.createReadStream(archiveResult.file)

    const options = {
        headers: {
            'Content-Type': "application/gzip",
            'Content-Length': archiveResult.size,
            'x-goog-meta-semver': this.semverIncrement
        }
    }
    return axios.post('https://wordup-c9001.firebaseapp.com/api/connect/publishUrl',{semver:this.semverIncrement}, {
        headers:{
            'Authorization': "Bearer " + this.projectSlug+'_'+this.accessToken
        }
    }).then(res => {
        if(res.status === 200){
            console.log(res.data.upload_url)
            return res.data.upload_url
        }
    }).then(url => axios.put(url, data, options)).then(res => {
        if(res.status === 200){
            return true
        }
    }).catch(error => {
        if(error.response.status === 403){
            this.wordupProject.setProjectConf('accessToken',null)
            this.error('Unable to connect with your provided project ID and/or project token. Please try again.')
        }else{
            this.error(error.message)
        }
    });

  }


}

PublishCommand.description = `Describe the command here
...
Extra documentation goes here
`

PublishCommand.flags = {
  increment: flags.string({description: 'Increment a version by the specified level', default: 'minor',options: ['major', 'minor', 'patch']} ),
  token: flags.string({description: 'A provided project token', env: 'WORDUP_PROJECT_AUTH_TOKEN'}),
}

module.exports = PublishCommand
