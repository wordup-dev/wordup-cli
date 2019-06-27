const url = require('url')
const inquirer = require('inquirer')

const WpApiPrompt = require('./wp-api')

class InstallationPrompt {
  constructor(project) {
    this.project = project || undefined
    this.privateKey = undefined
  }

  async init() {
    const answers = await inquirer.prompt({
      type: 'list',
      name: 'origin',
      message: 'Do you want to install WordPress from scratch (New) or install from a local/remote source',
      choices: [
        {name: 'New', value: 'new'},
        {name: 'Remote/Local wordup archive', value: 'wordup-archive'},
        {name: 'Wordpress hosted website (wordup-connect)', value: 'wordup-connect'},
      ],

    })

    this.origin = answers.origin

    if (answers.origin === 'new') {
      await this.askNew()
    } else if (answers.origin === 'wordup-archive') {
      await this.askWordupArchive()
    } else if (answers.origin === 'wordup-connect') {
      await this.askWordupConnect()
    }
  }

  async askWordupArchive() {
    const questions = [{
      type: 'input',
      name: 'path',
      message: 'Local or remote wordup archive file to build on the project',
      validate: function (val) {
        if (!val) {
          return 'Please provide a path or an url'
        }
        return true
      },
    }]

    const answers = await inquirer.prompt(questions)
    const wpInstall = 'archive:'+answers.path
    if(this.project){
      this.project.setWordupPkg('wpInstall',wpInstall)
    }else{
      return wpInstall
    }
  }

  async askWordupConnect(defaultUrl = undefined) {
    const questions = [{
      type: 'input',
      name: 'url',
      message: 'Public URL of your WordPress hosted website (with wordup-connect installed)',
      validate: function (value) {
        const parsedUrl = url.parse(value)
        if (parsedUrl.protocol !== 'https:') {
          return 'Please enter a valid secure domain (https://)'
        }
        if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
          return 'You cannot use localhost as a source domain'
        }
        return true
      },
      when: function () {
        return !defaultUrl
      },
    }, {
      type: 'input',
      name: 'privateKey',
      message: function (answers) {
        const website = answers.url || defaultUrl
        return 'Secret key (Visit wordup settings on ' + website + ', to get key)'
      },
      transformer: function (val) {
        let transformed = val
        if (val.length > 1) {
          const lastDigit = val.substr(-1)
          transformed = lastDigit.padStart(val.length, '*')
        }
        return transformed
      },
      validate: function (val) {
        if (!val) {
          return 'Please provide a key'
        }
        return true
      },
    }]

    const answers = await inquirer.prompt(questions)

    this.privateKey = answers.privateKey

    if(answers.url){
      const wpInstall = 'wordup-connect:'+answers.url
      if(this.project){
        this.project.setWordupPkg('wpInstall',wpInstall)
      }else{
        return wpInstall
      }
    }

  }

  async askNew(projectName = '') {

    if(this.project){
      projectName = this.project.wPkg('projectName')
    }

    const questions = [{
      type: 'input',
      name: 'title',
      message: 'Title of the WordPress installation',
      default: projectName,
    },
    {
      type: 'input',
      name: 'admin',
      message: 'Admin user',
      default: 'admin',
    },
    {
      type: 'input',
      name: 'password',
      message: 'Admin password (Just for development purposes)',
      default: 123456,
    },
    {
      type: 'input',
      name: 'email',
      message: 'Admin email',
      validate: function (val) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          return 'Please provide at least a dummy E-Mail like test@example.com'
        }
        return true
      },
    }]

    const answers = await inquirer.prompt(questions)

    const plugins = new WpApiPrompt('plugins')
    await plugins.ask()

    const themes = new WpApiPrompt('themes')
    await themes.ask()

    const wpInstall = {
      title: answers.title,
      language:"en_US",
      users:[{
        name: answers.admin,
        password: answers.password,
        email: answers.email,
        role:"administrator"
      }],
      plugins:plugins.getList(),
      themes:themes.getList()
    }

    if(this.project){
      this.project.setWordupPkg('wpInstall', wpInstall)
    }else{
      return wpInstall
    }
  }
}

module.exports = InstallationPrompt
