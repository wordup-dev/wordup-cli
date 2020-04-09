const {flags} = require('@oclif/command')
const fs = require("fs")
const path = require("path")
const axios = require('axios')
const {cli} = require('cli-ux')

const fglob = require('fast-glob')
const tar = require("tar")
const tmp = require("tmp")
const ignore = require('ignore')

const Command =  require('../../command-base')
const WordupAPI =  require('../../lib/api')

const MAX_UPLOAD_SIZE_IN_BYTES = (1024*1024*100) //100MB

class PublishCommand extends Command {
  async run() {
    const {flags} = this.parse(PublishCommand)
    
    const projectToken = flags.token || null
    this.semverIncrement = flags.increment
    this.publishEnv = flags.env

    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    } 

    if(project.wPkg('type') === 'installation'){
      this.error('You can not publish a project of type "installation"')
    }

    //If no project token is provided, just 
    this.userToken = null;
    if(!projectToken){

      this.userToken = this.getUserAuthToken()
      if(!this.userToken){
        this.log('Please authenticate first with: wordup auth')
        this.exit(2)
      }else{
        this.api = new WordupAPI(this.wordupConfig)
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

        this.api.createProjectAccessToken(projectSlug).then((response) => {
            resolve(response.data)
        }).catch(error => {
          if(error.response.status === 403){
            reject(new Error('Access forbidden. Please verify that your account has access to this project.'))
          }else{
            reject(error.message);
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

    //Check for max file size
    if(archiveResult.size > MAX_UPLOAD_SIZE_IN_BYTES){
        this.error('Your project size reached the limit of '+MAX_UPLOAD_SIZE_IN_BYTES/1024/1024+'MB')
    }

    return await this.uploadArchive(archiveResult)
  }

  async uploadArchive(archiveResult){
    const api_url = this.wordupConfig.get('api_url')

    const data = fs.createReadStream(archiveResult.file)

    const options = {
        maxContentLength:Infinity,
        maxBodyLength:Infinity,
        headers: {
            'Content-Type': "application/gzip",
            'Content-Length': archiveResult.size,
            'x-goog-meta-semver': this.semverIncrement,
            'x-goog-meta-buildtype':this.publishEnv,
            'x-goog-content-length-range':'0,'+MAX_UPLOAD_SIZE_IN_BYTES
        }
    }

    cli.action.start('Upload project source data')

    return axios.post(api_url+'/projects/'+this.projectSlug+'/build_url_token/',{semver:this.semverIncrement, build_type:this.publishEnv}, {
        headers:{
            'Authorization': "token " +this.accessToken
        }
    }).then(res => {
        if(res.status === 200){
            //console.log(res.data.upload_url)
            return res.data.upload_url
        }
    }).then(url => axios.put(url, data, options)).then(res => {
        cli.action.stop() 

        if(res.status === 200){
            return true
        }
    }).catch(error => {
        cli.action.stop('Error')

        if(!error.response){
          return this.error(error.message)
        }

        if(error.response.status === 403 || error.response.status === 401){
            this.wordupProject.setProjectConf('accessToken',null)
            this.error('Unable to connect with your provided project ID and/or project token. Please try again.')
        }else if(error.response.status === 400){
          if(error.response.data){
            let message = 'Could not proceed \n\n'
            const errorMsgs = error.response.data
            const fields = Object.keys(errorMsgs)
            fields.forEach(field => {
              message = message + field.toUpperCase() +':\n' + errorMsgs[field].join('\n')
            })
            this.error(message)
          }
        }else if(error.response.status === 429){
          const errorMsgs = error.response.data
          this.error(errorMsgs.detail || 'Rate limiting exceeded')
        }else if(error.response.status === 404){
          this.error('Project "'+this.projectSlug+'" not found on wordup.dev')
        }else{
          this.error('Unknown error')
        }
    });

  }


}

PublishCommand.description = `Publish your WordPress theme or plugin to your private theme/plugin directory on wordup.
...
The private directory on wordup manages your WordPress plugin and theme projects in the cloud.

After publishing the project, all WordPress installations can update your theme/plugin to the new project version.
`

PublishCommand.flags = {
  env:flags.string({description: 'Specify the environment you want to publish to', required:true, options: ['release', 'staging']} ),
  increment: flags.string({description: 'Increment a version by the specified level', default: 'minor',options: ['major', 'minor', 'patch']} ),
  token: flags.string({description: 'A provided project token', env: 'WORDUP_PROJECT_AUTH_TOKEN'}),
}

PublishCommand.hidden = true

module.exports = PublishCommand
