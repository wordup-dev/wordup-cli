const shell = require('shelljs')

class Backup {

    constructor(project) {
        this.project = project
        this.backupFile = null
        project.prepareDockerComposeUp()
    }

    async createSql(customPath) {

        const sqlPath = (customPath ? customPath + '/' : '') + 'sql_dump.sql'

        return new Promise((resolve, reject) => {
            shell.exec('docker-compose --project-directory ' + this.project.getProjectPath() + ' exec -u www-data -T wordpress wp db export /wordup/dist/'+sqlPath,{silent:false}, (code, stdout, stderr) => {
                if(code !== 0){
                    reject('Unable to export SQL dump');
                }

                resolve('SQL dump successfully created');

            })
        })

    }

    async getWPVersion(){
        
        return new Promise((resolve, reject) => {
            shell.exec('docker-compose --project-directory ' + this.project.getProjectPath() + ' exec -u www-data -T wordpress wp core version', {silent:true}, (code, stdout, stderr) => {
                if(code !== 0){
                    reject('Could not find WordPress version number')
                }
                resolve(stdout.trim())
            })
        })
    }

    async createInstallation(saveToCache, showLogs) {
        let addEnv = ''
        if(saveToCache === true){
            this.backupFile = 'backup-'+Math.floor(Date.now() / 1000)+'.tar.gz'
            addEnv = ' -e WORDUP_BACKUP_PATH=/wordup/config/cache/'+this.backupFile
        }
        
        return new Promise((resolve, reject) => {
            shell.exec('docker-compose --project-directory ' + this.project.getProjectPath() +' exec '+ addEnv +' -u www-data -T wordpress bash /wordup/config/cache/wordup.sh backup', {silent:!showLogs}, (code, stdout, stderr) => {
                if(code !== 0){
                    reject('Could not copy the installation files')
                }

                resolve('Installation archive successfully created')
            })
        })

    }

}

module.exports = Backup
