const {flags} = require('@oclif/command')
const fs = require('fs-extra')
const axios = require('axios')

const Command =  require('../../command-base')
const WordupAPI =  require('../../lib/api')
const Backup =  require('../../lib/backup')

class CloneCommand extends Command {
  async run() {
    const {flags} = this.parse(CloneCommand)
    const server = flags.server

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
      this.log('Please authenticate first with: wordup auth')
      this.exit(2)
    }
    this.api = new WordupAPI(this.wordupConfig)

    //Get upload url
    let apiResp =  null;
    try {
      apiResp = await this.api.wpNodeSetup(server,{})
    }catch(e){      
      this.error(e.message)
    }

    const uploadUrl = apiResp.data.upload_url

    // Create backup
    const distPath = project.getProjectPath(project.wPkg('distFolder','dist'))
    const backup = new Backup(project)
    try {
      await backup.createInstallation(distPath, true)
    }catch(e){
      this.error(e)
    }

    await this.customLogs('Uploading backup', (resolve, reject, showLogs) => {
      this.uploadArchive(backup.backupFile, uploadUrl).then(res => {
        resolve({done: '✔', code:0})
      }).catch(e => reject({done: 'Error while uploading', code:e.message}))
    })

    this.log('The WordPress installation will be created now, this can take up to 5 minutes. Please check the status in the app')

  }



  async uploadArchive(archivePath, uploadUrl){

    const data = fs.createReadStream(archivePath)
    const stat = fs.statSync(archivePath)

    const options = {
        headers: {
            'Content-Type': "application/gzip",
            'Content-Length': stat.size
        }
    }

    return axios.put(uploadUrl, data, options).then(res => {
        if(res.status === 200){
            return true
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
  server: flags.string({char: 's', required:true, description: 'Name of the server/vm or cluster'}),
}

CloneCommand.hidden = true

module.exports = CloneCommand
