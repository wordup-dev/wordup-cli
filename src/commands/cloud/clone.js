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
      this.log('Your project is not running, please use '+chalk.bgBlue('wordup install') +' or '+chalk.bgBlue('wordup start') )
      this.exit(4)
    }

    //Check if user is authenticated
    this.userToken = this.getUserAuthToken()
    if(!this.userToken){
      this.log('Please authenticate first with: wordup cloud:auth')
      this.exit(2)
    }
    this.api = new WordupAPI(this.wordupConfig)

    //Get upload url
    let apiResp =  null;
    try {
      apiResp = await this.api.setupWPNode(server,{})
    }catch(e){      
      this.error(e.message)
    }

    const uploadUrl = apiResp.data.upload_url

    // Create backup
    cli.action.start('Create WordPress backup from project')

    const distPath = project.getProjectPath(project.wPkg('distFolder','dist'))
    const backup = new Backup(project)
    try {
      await backup.createInstallation(distPath, true)
      cli.action.stop()

    }catch(e){
      cli.action.stop('Error')
      this.error(e)

    }

    // Upload the backup
    this.uploadArchive(backup.backupFile, uploadUrl).then(res => {
      this.log('')
      this.log('The WordPress installation will be created now, this can take up to 5 minutes. Please check the status in the app')
    })

  }



  async uploadArchive(archivePath, uploadUrl){

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
            'x-goog-content-length-range':'0,'+MAX_UPLOAD_SIZE_IN_BYTES
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

CloneCommand.description = `Clone current running WordPress installation to a server/cluster of your wordup account
...
Automatically backups and uploads your running WordPress installation to wordup.
After cloning the project, your data will be deleted from our servers. 
Please be aware that you need to setup a VM or cluster in your wordup account.
`

CloneCommand.flags = {
  //server: flags.string({char: 's', required:false, description: 'Name of the server/vm or cluster'}),
}

CloneCommand.hidden = true

module.exports = CloneCommand
