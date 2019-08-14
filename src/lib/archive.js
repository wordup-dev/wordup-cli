const fs = require("fs")
const axios = require('axios')

const fglob = require('fast-glob')
const tar = require("tar")
const tmp = require("tmp")
const ignore = require('ignore')


class Archiver {
    constructor(project, userToken, projectToken, options) {
        this.project = project
        this.sourceDirectory = project.getProjectPath()
        this.projectConf = project.config || {}
        this.projectId = project.wPkg('projectId') || process.env.WORDUP_PROJECT_ID

        this.connectToken = projectToken || this.projectConf.connectToken
        this.userToken = userToken

        this.options = options || {};
        let postfix = ".tar.gz"
        if (this.options.type === "zip") {
            postfix = ".zip"
        }

        this.tempFile = tmp.fileSync({
            prefix: "wordup-archive-",
            postfix,
        })

        console.log(this.tempFile.name)

        if (!this.options.ignore) {
            this.options.ignore = [];
        }

    }

    cleanup(){
        this.tempFile.removeCallback();
    }

    async listFiles(){
        const ig = ignore().add(['/node_modules']);

        const files =  await fglob('**', {
            dot: true,
            cwd: this.sourceDirectory,
        });

        return ig.filter(files);
    }

    async getConnectToken(){

        //First check if we have a wordup projectId
        if(!this.projectId){
            console.log('Please provide a valid wordup project ID in your config.yml')
            return false
        }

        if(!this.connectToken){
            try {
                const newToken = await this.newConnectToken()
                this.connectToken = newToken.token_raw
                this.project.setProjectConf('connectToken',this.connectToken)
            }catch(error){
                console.log('No project specific connect token found')
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
            });
        })
    }

    async createArchive(){
        await this.getConnectToken()

        if(!this.connectToken){
            return
        }

        try {
            fs.statSync(this.sourceDirectory);
        } catch (err) {
            if (err.code === "ENOENT") {
                //Could not read directory
              return null;
            }
            throw err;
        }

        const tempFile = this.tempFile

        const allFiles = await this.listFiles();


        const archiveResult = await tar.c({
            gzip: true,
            file: tempFile.name,
            cwd: this.sourceDirectory,
            follow: true,
            noDirRecurse: true,
            portable: true,
        },allFiles).then(() => {
            const stats = fs.statSync(tempFile.name);
            return {
                file: tempFile.name,
                manifest: allFiles,
                size: stats.size,
                source: this.sourceDirectory,
            };
        });

        return await this.uploadArchive(archiveResult)
    }

    async uploadArchive(archiveResult){

        const data = fs.createReadStream(archiveResult.file)

        const options = {
            headers: {
                'Content-Type': "application/gzip",
                'Content-Length': archiveResult.size
            }
        }
        
        return axios.post('https://wordup-c9001.firebaseapp.com/api/connect/publishUrl',{}, {
            headers:{
                'Authorization': "Bearer " + this.projectId+'_'+this.connectToken
            }
        }).then(res => {
            if(res.status === 200){
                return res.data.upload_url;
            }
        }).then(url => axios.put(url, data, options)).then(res => {
            if(res.status === 200){
                return 'geht';
            }
        }).catch(error => {
            if(error.response.status === 403){
                this.project.setProjectConf('connectToken',null)
                console.log('Unable to connect with your provided project auth token. Please try again.')
            }else{
                console.log(error.message)
            }
        });

    }



}

module.exports = Archiver
