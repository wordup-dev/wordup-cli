const axios = require('axios')
const OAuth = require('./oauth')

class WordupAPI {
  constructor(configDir) {
    this.api = axios.create({
      baseURL: 'http://localhost:8042',
    })

    this.api.interceptors.request.use(async function (config) {
      const oauthConnect = new OAuth(configDir)
      const token = await oauthConnect.getToken()

      if (token) {
        config.headers = {Authorization: 'Bearer ' + token.access_token}
      }
      return config
    }, function (error) {
      return Promise.reject(error)
    })

    this.api.interceptors.response.use(function (response) {
      return response
    }, function (error) {
      // If status is UNAUTHORIZED
      if (error.response && error.response.status === 401) {
        console.log("Your authentication credentials are incorrect or not valid anymore. Use 'wordup auth'")
      } else {
        console.log('Unknown problem with our servers:', error.code)
      }
      return Promise.reject(error)
    })
  }

  async getUser() {
    const res = await this.api.get('/auth').catch(function (error) {})
    return res.data
  }

  async projects() {
    this.api.get('/projects').then(function (response) {
      // handle success
      console.log(response.data)
    }).catch(function (error) {})

    // Change

    /* api.patch('/projects/5/', {'created_at':'2018-03-15T19:43:42.568201Z'}).then(function (response) {
            // handle success
            console.log(response.data);
        }).catch(function (error) {}); */
  }
}

module.exports = WordupAPI
