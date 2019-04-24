const axios = require('axios')
const inquirer = require('inquirer')

const WP_API_PLUGINS = 'https://api.wordpress.org/plugins/info/1.1/?action=query_plugins&request[search]='
const WP_API_THEMES = 'https://api.wordpress.org/themes/info/1.1/?action=query_themes&request[search]='

class WpApiPrompt {
  constructor(type) {
    if (type === 'plugins') {
      this.url = WP_API_PLUGINS
    } else {
      this.url = WP_API_THEMES
    }
    this.type = type
    this.all = []
  }

  getList() {
    let list = {}
    if (this.all.length > 0) {
      this.all.forEach(function (plugin) {
        list[plugin] = 'latest'
      })
    }
    return list
  }

  async ask() {
    const url = this.url
    const apiType = this.type

    const answers = await inquirer.prompt([{
      type: 'input',
      name: 'search',
      message: 'Search public WordPress ' + apiType + ' (leave blank if you dont want to add ' + apiType + ')',
    }, {
      type: 'rawlist',
      name: 'name',
      message: 'Select from the list',
      pageSize: 10,
      choices: async function (anwers) {
        let res = await axios.get(url + encodeURIComponent(anwers.search))
        const topResults = res.data[apiType].slice(0, 5)
        const choices = topResults.map(item => item.slug)
        choices.push(new inquirer.Separator())
        choices.push('None of the above')
        return choices
      },
      filter: function (val) {
        if (val == 'None of the above') {
          return ''
        }
        return val
      },
      when: function (answers) {
        return answers.search != ''
      },
    }, {
      type: 'confirm',
      name: 'askAgain',
      message: 'Want to enter another item?',
      default: true,
      when: function (answers) {
        return answers.search != ''
      },
    }])

    if (answers.name && answers.name !== '') {
      this.all.push(answers.name)
    }
    if (answers.askAgain) {
      await this.ask()
    }
  }
}

module.exports = WpApiPrompt

