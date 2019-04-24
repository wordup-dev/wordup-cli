const fs = require('fs-extra')
const path = require('path')
const dotProp = require('dot-prop')

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
        fs.writeJSON(this.configFile, {}, {spaces: 4})
      } else {
        console.error(err)
      }
    }
    return jsonConfig
  }

  get(key) {
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

