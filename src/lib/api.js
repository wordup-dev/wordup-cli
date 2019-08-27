const axios = require('axios')

class WordupAPI {
  constructor(userToken) {

    if(!userToken){
      throw new Error('No user token provided. Please authenticate')
    }

    this.userToken = userToken

    this.api = axios.create({
      baseURL: 'https://wordup-c9001.firebaseapp.com/api',
    })

    this.api.interceptors.request.use(function (config) {
      config.headers = {Authorization: 'token ' + userToken.userId+'_'+userToken.accessToken}
      return config
    }, function (error) {
      return Promise.reject(error)
    })

    this.api.interceptors.response.use(function (response) {
      return response
    }, function (error) {
      // Optional: Check error message
      return Promise.reject(error)
    })
  }

  userProfile(){
    return this.api.get('/user/profile')
  } 

  projectAccessToken(projectId){
    return this.api.post('/user/accessToken/'+projectId, {})
  } 
  
}

module.exports = WordupAPI
