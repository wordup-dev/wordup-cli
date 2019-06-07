const Generator = require('yeoman-generator')
const path = require('path')
const slugify = require('slugify')
const fs = require('fs')


class WordupInitGenerator extends Generator {

  wordupProjectPathValid(val) {
    if(!val){
      return false
    }
  
    if (!val.match(/^([a-z]|\_)/i)) {
      return 'Please start with a letter'
    }
  
    const newPath = this.destinationPath(slugify(val, {lower: true}))
    if(fs.existsSync(newPath)){
      return 'The folder in your current directory already exists, please choose a different name'
    }
    return true
  }

  async prompting() {

    if(process.env.WORDUP_INIT_PATH){
      //Create directly a new project without prompting 
      const validPath = this.wordupProjectPathValid(this.options.projectName)
      if (validPath !== true) {
        console.log(validPath)
        process.exit(1)
      }

      this.answers = {
        projectName: this.options.projectName,
        projectType: this.options.projectType,
        scaffold: true
      }
    }else{

      this.answers = await this.prompt([{
        type: 'input',
        name: 'projectName',
        message: "What's the name of your new project",
        validate: (val) => this.wordupProjectPathValid(val),
        default: this.options.projectName || undefined,
        filter: function(val) {
          return val.trim()
        }
      },
      {
        type: 'list',
        name: 'projectType',
        message: 'What do you want do develop',
        default: this.options.projectType || '',
        choices: [{name:'A WordPress plugin', value: 'plugins'},{name:'A WordPress theme', value: 'themes'}],
      },
      {
        type: 'confirm',
        name: 'scaffold',
        message: 'Scaffold project with boilerplate code',
      },
      {
        type: 'list',
        name: 'scaffoldType',
        when: function (answers) {
          return (answers.scaffold === true && answers.projectType === 'themes')
        },
        message: 'Which scaffold project do you want to use',
        choices: [
          {name:'Underscore (WordPress official)', value: 'underscore'},
          {name:'Understrap', value: 'understrap'}
        ],
      },
      {
        type: 'input',
        name: 'homepage',
        message: 'Homepage of your project (optional)',
      },
      {
        type: 'input',
        name: 'repository',
        message: 'Repository URL (optional)',
      },
        /* {
              type: 'confirm',
              name: 'custom_compose',
              message: 'Create a custom docker-compose file for this project',
              default:false
            } */
      ])
    }

  }

  writing() {
    this.sourceRoot(path.join(__dirname, '../../templates'))

    const projectNameSlug = slugify(this.answers.projectName, {lower: true})
    const projectTypeSingular =  this.answers.projectType.slice(0, -1)

    const projectPath = this.destinationPath(projectNameSlug)
    this.destinationRoot(projectPath)

    // Create local config for new project
    const projectId = this.options.project.createProjectConf({
      name: this.answers.projectName,
      slugName: projectNameSlug,
      path: projectPath,
      installedOnPort: false,
      listeningOnPort: false,
      scaffoldOnInstall:  this.answers.scaffoldType ? this.answers.scaffoldType : this.answers.scaffold,
      created:Math.floor(Date.now() / 1000)
    })

    // Writing README
    this.fs.copyTpl(this.templatePath('README.md.ejs'), this.destinationPath('README.md'), {
      name: this.answers.projectName,
      type: projectTypeSingular,
      slug: projectNameSlug,
    })

    // Copy gitignore files
    this.fs.copyTpl(this.templatePath('gitignore.ejs'), this.destinationPath('.gitignore'))

    // Scaffold
    if (this.answers.scaffold) {
      this.fs.copyTpl(this.templatePath('scaffold.ejs'), this.destinationPath('src/.scaffold'))
    } else {
      // Copy super basic skeleton
    }

    // Setting wordup specific package.json settings
    this.wordupPackage = {}
    this.wordupPackage.type = this.answers.projectType
    this.wordupPackage.projectName = this.answers.projectName
    this.wordupPackage.slug = (this.answers.projectType === 'plugins') ? projectNameSlug + '/' + projectNameSlug + '.php' : projectNameSlug

    //This a custom hook, to insert wpInstall parameters at the installation level
    if(process.env.WORDUP_INIT_WP_INSTALL){
      const wpInstall = JSON.parse(Buffer.from(process.env.WORDUP_INIT_WP_INSTALL, 'base64').toString('utf8'))
      if(wpInstall.values){
        this.wordupPackage.wpInstall = wpInstall.values
      }
    }


    //Writing package.json
    const {engines, name, version} = require('../../package.json')

    let pjson = {
      name: projectNameSlug,
      version: '0.1.0',
      private:true,
      engines: engines,
      scripts: {
        start:'wordup start || true',
        build:'wordup export',
        postinstall:'wordup install || true'
      },
      wordup: {...this.wordupPackage}
    }

    //Add wordup-cli if init command was executed by npx itself or a different programm
    const entryPoint = process.env._ || ''
    if(entryPoint.endsWith('npx') || process.env.NPX_CLI_JS){
      pjson.scripts.start = 'npx wordup start || true'
      pjson.scripts.build = 'npx wordup export'
      pjson.scripts.postinstall = 'npx wordup install || true'
      pjson.devDependencies = {
        "wordup-cli": "^"+version
      }
    }

    if(this.answers.repository){
      pjson.repository = this.answers.repository
    }

    if(this.answers.homepage){
      pjson.homepage = this.answers.homepage
    }

    this.fs.writeJSON(this.destinationPath('package.json'), pjson, {spaces: 4})

    // Create docker-compose file
    if (this.answers.custom_compose) {
      // 2do
    }
  }

  install() {
    if(this.options.autoinstall){
      this.npmInstall();
    }
  }
}

module.exports = WordupInitGenerator
