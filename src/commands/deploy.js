const {flags} = require('@oclif/command')
const fs = require("fs")
const path = require("path")
const axios = require('axios')

const fglob = require('fast-glob')
const tar = require("tar")
const tmp = require("tmp")
const ignore = require('ignore')

const Command =  require('../command-base')

class DeployCommand extends Command {
  async run() {
    const {flags} = this.parse(DeployCommand)
    
    const projectToken = flags.token || null
    this.semverIncrement = flags.increment

    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    } 

    //If no project token is provided, just 
    this.userToken = null;
    if(!projectToken){
      this.userToken = await this.getUserAuthToken()
      if(!this.userToken){
        this.log('Please authenticate first with: wordup auth')
        this.exit(2)
      }
    }

    //Set 
    this.projectId = project.wPkg('projectId') || process.env.WORDUP_PROJECT_ID
    this.connectToken = projectToken || (project.config.connectToken ? project.config.connectToken : null)

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

    const gitignoreFile = path.join(sourceDirectory, '.gitignore');

    if(fs.existsSync(gitignoreFile)) {
      ig.add(fs.readFileSync(gitignoreFile).toString());
    }
    ig.add(['/node_modules']);

    const files = await fglob('**', {
        dot: true,
        cwd: sourceDirectory,
    });

    return ig.filter(files);
  }

  async getConnectToken(){

    //First check if we have a wordup projectId
    if(!this.projectId){
        this.error('Please provide a valid wordup project ID in your config.yml')
        return false
    }

    if(!this.connectToken){
        try {
            const newToken = await this.newConnectToken()
            this.connectToken = newToken.token_raw
            this.wordupProject.setProjectConf('connectToken',this.connectToken)
        }catch(error){
            this.error('No project specific connect token found')
        }
    }
  }

  async newConnectToken(){

    return new Promise((resolve, reject) => {

        let projectId = this.projectId

        if(!projectId || !this.userToken){
            return reject()
        }
        axios.post('http://localhost:3000/api/user/connectToken/'+projectId, {}, {
            headers:{
                'Authorization': "Bearer " + this.userToken.idToken
            }
        }).then((response) => {
            resolve(response.data);
        }).catch(error => reject())
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

    await this.getConnectToken()

    if(!this.connectToken){
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
            'Authorization': "Bearer " + this.projectId+'_'+this.connectToken
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
            this.wordupProject.setProjectConf('connectToken',null)
            this.error('Unable to connect with your provided project ID and/or project token. Please try again.')
        }else{
            this.error(error.message)
        }
    });

  }


}

DeployCommand.description = `Describe the command here
...
Extra documentation goes here
`

DeployCommand.flags = {
  increment: flags.string({description: 'Increment a version by the specified level', default: 'minor',options: ['major', 'minor', 'patch']} ),
  token: flags.string({description: 'A provided project token', env: 'WORDUP_PROJECT_AUTH_TOKEN'}),
}

module.exports = DeployCommand
