const Command =  require('../command-base')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const archiver = require('archiver')
const ignore = require('ignore')
const fglob = require('fast-glob')
const shell = require('shelljs')

const Backup =  require('../lib/backup')
const utils =  require('../lib/utils')

class ExportCommand extends Command {
  async run() {
    const {args} = this.parse(ExportCommand)
    const exportType = args.type
    const project = this.wordupProject

    if (!project.isExecWordupProject()) {
      this.exit(1)
    }

    if(!project.isWordupProjectRunning()){
      this.log('Your project is not running, please use ' + chalk.bgBlue('wordup install') + ' or '+chalk.bgBlue('wordup start') )
      this.exit(4)
    }

    const distPath = project.getProjectPath(project.wPkg('distFolder','dist'))
    const srcPath = project.getProjectPath(project.wPkg('srcFolder','src'))

    let exportParams = ''
    let result = ''
    
    try {
      if (exportType === 'installation') {
          result = await new Backup(project).createInstallation(distPath)
      }else if(exportType === 'sql'){
          result = await new Backup(project).createSql()
      }else if(exportType === 'src'){
          result = await this.createSrcDist(srcPath, distPath)
      }

      this.log(result)
    }catch(e){
      this.error(e)
    }

  }

  async listFiles(srcPath){

    const ig = ignore()

    const distignoreFile = path.join(srcPath, '.distignore')

    if(fs.existsSync(distignoreFile)) {
      ig.add(fs.readFileSync(distignoreFile).toString())
    }

    const files = await fglob('**', {
        dot: true,
        cwd: srcPath,
    });

    return ig.filter(files)
  }

  async getVersion(){
    const type = this.wordupProject.wPkg('type') === 'plugins' ? 'plugin' : 'theme'
    const slugName = this.wordupProject.wPkg('slugName')

    this.wordupProject.prepareDockerComposeUp()

    return new Promise((resolve, reject) => {

      shell.exec('docker-compose --project-directory ' + this.wordupProject.getProjectPath() + ' exec -T wordpress sudo -u daemon wp '+type+' get '+slugName+' --field=version',{silent:true}, (code, stdout, stderr) => {
        if(code !== 0){
            return reject('Unable to get version of '+type)
        }

        return resolve(stdout.trim())
      })
    })
  }

  async createSrcDist(srcPath, distPath) {
    const slug = this.wordupProject.wPkg('slugName')
    let distFiles = await this.listFiles(srcPath)

    let version = null;
    try {
      version = await this.getVersion()
    }catch(e){
      return Promise.reject(e)
    }

    return new Promise((resolve, reject) => {

        const outputPath = path.join(distPath, slug+'-'+version+'.zip')
        let output = fs.createWriteStream(outputPath)
        let archive = archiver('zip')

        output.on('close',() => {
          resolve('Distributable source archive successfully created ['+outputPath+']: '+utils.formatBytes(archive.pointer()) );
        });

        archive.on('error',(err) =>{
          reject(err)
        })

        archive.pipe(output);

        distFiles.forEach(file => {
          archive.file(path.join(srcPath, file), { name: path.join(slug, file) });
        })
        archive.finalize();
    })

  }

}

ExportCommand.description = `Export your plugin/theme or the whole WordPress installation
...
The exported zip-file of a plugin/theme are ready for distribution.
An exported installation file can be used for setting up a remote WordPress installation or
for backing up your current development stack. 
`

ExportCommand.args = [
  {
    name: 'type',
    required: true,
    description: 'What type do you want to export',
    default: 'src',
    options: ['src', 'installation', 'sql'],
  },
]

module.exports = ExportCommand
