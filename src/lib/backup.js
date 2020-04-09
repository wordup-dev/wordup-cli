const tmp = require("tmp")
const shell = require('shelljs')
const fs = require('fs-extra')
const path = require('path')
const archiver = require('archiver')

const utils =  require('./utils')

class Backup {

    constructor(project) {
        this.wpVersion = null
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

        if(this.wpVersion){
            return Promise.resolve(this.wpVersion)
        }
        
        return new Promise((resolve, reject) => {
            shell.exec('docker-compose --project-directory ' + this.project.getProjectPath() + ' exec -u www-data -T wordpress wp core version', {silent:true}, (code, stdout, stderr) => {
                if(code !== 0){
                    reject('Could not find WordPress version number')
                }

                this.wpVersion = stdout.trim()
                resolve(this.wpVersion)
            })
        })
    }

    async createInstallation(distPath, saveToTmp) {
        const slug = this.project.wPkg('slugName')
        const tmpobj = tmp.dirSync({dir:distPath, unsafeCleanup:true})
        const tmpobjParsed = path.parse(tmpobj.name)

        this.backupFile = path.join(distPath, slug+'-installation.tar.gz')
        //check if backup should be only saved in an temp folder
        if(saveToTmp === true){

            tmp.setGracefulCleanup()

            const backupTempFile = tmp.fileSync({
                prefix: "wordup-backup-",
                postfix: ".tar.gz"
            })
            this.backupFile = backupTempFile.name
        }
        
        let copyFiles =  new Promise((resolve, reject) => {

            shell.exec('docker-compose --project-directory ' + this.project.getProjectPath() + ' exec -T wordpress cp -r /var/www/html/. /wordup/dist/'+tmpobjParsed.name, {silent:true}, (code, stdout, stderr) => {
                if(code !== 0){
                    reject('Could not copy the installation files')
                }

                //Remove some unnecessary files
                const tmpFiles = ['.initialized', '.user_scripts_initialized']
                tmpFiles.forEach(file => fs.removeSync( path.join(tmpobj.name, file)))
                resolve()
            })
        })

        let createJsonInfo =  new Promise((resolve, reject) => {
            this.getWPVersion().then(version => {
                fs.writeJsonSync(path.join(tmpobj.name, 'info.json'), {
                    source:'wordup-cli',
                    wp_version: version,
                    created:new Date()
                }, {spaces:' '})

                resolve()
            }).catch((e) => reject(e))

        })

        return Promise.all([copyFiles, createJsonInfo, this.createSql(tmpobjParsed.name)]).then(() => {
        
            return new Promise((resolve, reject) => {

                let output = fs.createWriteStream(this.backupFile)
                let archive = archiver('tar', {gzip:true})

                output.on('close',() => {
                    resolve('Installation archive successfully created: '+utils.formatBytes(archive.pointer()));
                });

                archive.on('error',(err) =>{
                    reject(err)
                })

                archive.pipe(output)
                archive.directory(tmpobj.name, 'backup');
                archive.finalize()
            })

        }).finally(() => tmpobj.removeCallback())

    }

}

module.exports = Backup
