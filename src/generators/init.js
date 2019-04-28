const Generator = require('yeoman-generator')
const path = require('path')
const slugify = require('slugify')
const fs = require('fs')


class WordupInitGenerator extends Generator {
  async prompting() {
    this.answers = await this.prompt([{
      type: 'input',
      name: 'projectName',
      message: "What's the name of your new project",
      validate: function (val) {
        if (!val.match(/^([a-z]|\_)/i)) {
          return 'Please start with a letter'
        }

        if (fs.existsSync(slugify(val, {lower: true}))) {
          return 'The folder in your current directory already exists, please choose a different name'
        }
        return true
      },
      filter: function(val) {
        return val.trim()
      }
    },
    {
      type: 'list',
      name: 'projectType',
      message: 'What do you want do develop',
      choices: [{name:'A WordPress plugin', value: 'plugins'},{name:'A WordPress theme', value: 'themes'}],
    },
    {
      type: 'confirm',
      name: 'scaffold',
      message: 'Scaffold src with the official WordPress boilerplate code',
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

    //Writing package.json
    const {engines, name, version} = require('../../package.json')

    let pjson = {
      name: projectNameSlug,
      version: '0.1.0',
      private:true,
      engines: engines,
      scripts: {
        start:'npx wordup start || true',
        build:'npx wordup export',
        postinstall:'npx wordup install || true'
      },
      wordup: {...this.wordupPackage}
    }

    const entryPoint = process.env._ || ''
    if(entryPoint.endsWith('npx')){
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
    this.npmInstall();
  }
}

module.exports = WordupInitGenerator
