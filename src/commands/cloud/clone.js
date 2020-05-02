const {flags} = require('@oclif/command')
const fs = require('fs-extra')
const axios = require('axios')
const {cli} = require('cli-ux')

const Command =  require('../../command-base')
const WordupAPI =  require('../../lib/api')
const Backup =  require('../../lib/backup')

const MAX_UPLOAD_SIZE_IN_BYTES = (1024*1024*250) //250MB

class CloneCommand extends Command {
  async run() {
    const {flags} = this.parse(CloneCommand)
    const server = flags.server || null

    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    } 

    if(!project.isWordupProjectRunning()){
      this.log('Your project is not running, please use '+chalk.bgBlue('wordup local:install') +' or '+chalk.bgBlue('wordup local:start') )
      this.exit(4)
    }

    //Check if user is authenticated
    this.userToken = this.getUserAuthToken()
    if(!this.userToken){
      this.log('Please authenticate first with: wordup cloud:auth')
      this.exit(2)
    }
    this.api = new WordupAPI(this.wordupConfig)

    // Prepare backup class
    const backup = new Backup(project)

    let wpVersion = null
    try {      
      wpVersion = await backup.getWPVersion()
    }catch(e){
      this.error(e)
    }

    //Get upload url
    let apiResp =  null;
    try {
      apiResp = await this.api.setupWPNode(server, wpVersion)
    }catch(e){      
      this.error(e.message)
    }

    const uploadUrl = apiResp.data.upload_url

    // Create installtion files
    cli.action.start('Create WordPress backup from project')
    try {      
      await backup.createInstallation(true, true)
      cli.action.stop()

    }catch(e){
      cli.action.stop('Error')
      this.error(e)

    }

    const backupPath = project.getProjectCachePath(backup.backupFile)

    // Upload the backup
    this.uploadArchive(backupPath, uploadUrl, wpVersion).then(res => {
      this.log('')
      this.log('The WordPress installation will be created now, this can take up to 5 minutes. Please check the status under https://console.wordup.dev')
    }).finally(() => {
      fs.remove(backupPath)
    })

  }



  async uploadArchive(archivePath, uploadUrl, wpVersion){

    const data = fs.createReadStream(archivePath)
    const stat = fs.statSync(archivePath)

    //Check for max file size
    if(stat.size > MAX_UPLOAD_SIZE_IN_BYTES){
      this.error('Your project size reached the limit of '+MAX_UPLOAD_SIZE_IN_BYTES/1024/1024+'MB')
    }

    const options = {
        maxContentLength:Infinity,
        maxBodyLength:Infinity,
        headers: {
            'Content-Type': "application/gzip",
            'Content-Length': stat.size,
            'x-goog-content-length-range':'0,'+MAX_UPLOAD_SIZE_IN_BYTES,
            'x-goog-meta-wpversion':wpVersion
        }
    }

    cli.action.start('Upload WordPress backup')

    return axios.put(uploadUrl, data, options).then(res => {
        cli.action.stop() 

        if(res.status === 200){
            return true
        }
    }).catch(error => {
      cli.action.stop('Error')

      if(!error.response){
        return this.error(error.message)
      }else{
        return this.error('Unknown error')
      }

    })

  }



}

CloneCommand.description = `Clone current running WordPress installation to a new node in your wordup account
...
This command will automatically backup and upload your running WordPress installation to wordup.

After cloning the project, your data will be deleted from our servers. 
`

CloneCommand.flags = {
  //server: flags.string({char: 's', required:false, description: 'Name of the server/vm or cluster'}),
}

module.exports = CloneCommand
