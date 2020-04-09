const Generator = require('yeoman-generator')
const path = require('path')
const slugify = require('slugify')
const fs = require('fs')
const YAML = require('yaml')
const axios = require('axios')

const InstallationPrompt =  require('../prompts/installation')

const {wordupConformPath} =  require('../lib/utils')

class WordupInitGenerator extends Generator {

  wordupProjectPathValid(val) {
    if(!val){
      return false
    }
  
    if (!val.match(/^([a-z])/i)) {
      return 'Please start with a letter'
    }
  
    const newPath = this.destinationPath(slugify(val, {lower: true, remove: /[*+~%\<>/;.(){}?,'"!:@#^|]/g}))
    if(fs.existsSync(newPath)){
      return 'The folder in your current directory already exists, please choose a different name'
    }
    return true
  }

  async prompting() {

    //Create directly a new project without prompting 
    if(process.env.WORDUP_INIT_PATH){
      const validPath = this.wordupProjectPathValid(this.options.projectName)
      if (validPath !== true) {
        console.log(validPath)
        process.exit(1)
      }

      this.answers = {
        projectName: this.options.projectName,
        projectType: this.options.projectType,
        scaffold: true,
        wpInstall:false
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
        message: 'What kind of project do you want to develop',
        default: this.options.projectType || '',
        choices: [
          {name:'A WordPress plugin', value: 'plugins'},
          {name:'A WordPress theme', value: 'themes'},
          {name:'I just need a WordPress installation', value: 'installation'}
        ],
      },
      {
        type: 'confirm',
        name: 'scaffold',
        message: 'Scaffold project with boilerplate code',
        when: function (answers) {
          return answers.projectType !== 'installation'
        }
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

    //Insert wpInstall parameters directly, without prompting 
    if(process.env.WORDUP_INIT_WP_INSTALL){
      const wpInstall = JSON.parse(Buffer.from(process.env.WORDUP_INIT_WP_INSTALL, 'base64').toString('utf8'))
      if(wpInstall.values){

        //Legacy rewrite. This should be done directly in vscode-ext
        if(wpInstall.values.hasOwnProperty('adminUser')){
          wpInstall.values.users = [{
            name: wpInstall.values.adminUser,
            password: wpInstall.values.adminPassword,
            email: wpInstall.values.adminEmail,
            role:"administrator"
          }]

          delete wpInstall.values.adminUser
          delete wpInstall.values.adminPassword
          delete wpInstall.values.adminEmail
        }

        this.answers.wpInstall = wpInstall.values
      }
    }else{
      const installPrompts = new InstallationPrompt()
      this.answers.wpInstall = await installPrompts.askNew(this.answers.projectName)
    }

  }

  writing() {
    this.sourceRoot(path.join(__dirname, '../../templates'))

    const projectNameSlug = slugify(this.answers.projectName, {lower: true, remove: /[*+~%\<>/;.(){}?,'"!:@#^|]/g})
    const projectTypeSingular = (this.answers.projectType === 'installation') ? 'installation' : this.answers.projectType.slice(0, -1)


    const projectPath = this.destinationPath(projectNameSlug)
    this.destinationRoot(projectPath)

    // Create local config for new project
    const projectId = this.options.project.createProjectConf({
      name: this.answers.projectName,
      slugName: projectNameSlug,
      path: wordupConformPath(projectPath),
      installedOnPort: false,
      listeningOnPort: false,
      scaffoldOnInstall: this.answers.scaffold,
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
    if (this.answers.scaffold && this.answers.projectType !== 'installation') {
      this.fs.copyTpl(this.templatePath('scaffold.ejs'), this.destinationPath('src/.scaffold'))
    } else {
      // Copy super basic skeleton
    }

    // Setting wordup config
    let dotWordupConfig=  {
      name: YAML.stringify({'projectName':this.answers.projectName}),
      type: YAML.stringify({'type':this.answers.projectType}),
      slug: YAML.stringify({'slug':(this.answers.projectType === 'plugins') ? projectNameSlug + '/' + projectNameSlug + '.php' : projectNameSlug}),
      wpInstall: YAML.stringify({'wpInstall':this.answers.wpInstall})
    }

    // Writing wordup config
    this.fs.copyTpl(this.templatePath('config.yml.ejs'), this.destinationPath('.wordup/config.yml'), dotWordupConfig)

  }

}

module.exports = WordupInitGenerator
