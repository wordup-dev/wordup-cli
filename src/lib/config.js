const fs = require('fs-extra')
const path = require('path')
const dotProp = require('dot-prop')

const WORDUP_CONFIG = {
  'api_url':'https://api.wordup.dev',
  'app_url':'https://console.wordup.dev',
}

class Config {
  constructor(configDir) {
    this.configDir = configDir
    this.configFile = path.join(this.configDir, 'config.json')
  }

  getConfig() {
    let jsonConfig = {}
    try {
      jsonConfig = fs.readJsonSync(this.configFile)
    } catch (err) {
      if (err.code === 'ENOENT') {
        if (!fs.existsSync(this.configDir)) {
          fs.mkdirSync(this.configDir)
        }
        fs.writeJsonSync(this.configFile, jsonConfig, {spaces: 4})
      }
    }
    return jsonConfig
  }

  get(key) {
    const envKeys = ['api_url', 'app_url']
    if(envKeys.includes(key)){
      if(process.env.hasOwnProperty('WORDUP_'+key.toUpperCase())){
        return process.env['WORDUP_'+key.toUpperCase()]
      }else{
        return WORDUP_CONFIG[key]
      }
    }

    const config = this.getConfig()
    return dotProp.get(config, key)
  }

  set(key, value) {
    const config = this.getConfig()
    dotProp.set(config, key, value)
    fs.writeJsonSync(this.configFile, config, {spaces: 4})
  }

  remove(key) {
    const config = this.getConfig()
    dotProp.delete(config, key)
    fs.writeJsonSync(this.configFile, config, {spaces: 4})
  }
}

module.exports = Config

