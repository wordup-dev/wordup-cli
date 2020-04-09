const axios = require('axios')
const OAuth = require('./oauth')

class WordupAPI {
  constructor(wordupConfig) {

    this.oauth = new OAuth(wordupConfig)

    this.api = axios.create({
      baseURL: wordupConfig.get('api_url')
    })

    this.api.interceptors.request.use(async (config) => {
      const token = await this.oauth.getToken()

      if (token) {
        config.headers = {Authorization: 'Bearer ' + token.access_token}
      }
      return config
    }, (error) => {
      return Promise.reject(error)
    })

    this.api.interceptors.response.use((response) => {
      return response
    }, (error) => {
      // Optional: Check error message
      let message = 'Unknown error requesting the wordup API. Please try again';
      if(error.response.status === 401){
        message = 'The authentication credentials were not provided or correct. Please reauthenticate.'
      }else if(error.response.status === 400){
        if(error.response.data){
          message = 'Please verify your data \n\n'
          const errorMsgs = error.response.data
          const fields = Object.keys(errorMsgs)
          fields.forEach(field => {
            message = message + field.toUpperCase() +':\n' + errorMsgs[field].join('\n')
          })
        }
      }else if(error.response.status === 429){
        const errorMsgs = error.response.data
        message = errorMsgs.detail || 'Rate limiting exceeded'
      }else if(error.response.status){
        message = 'The request to the wordup API ended with a status code of '+error.response.status
      }

      throw Error(message);
    })
  }

  userProfile(){
    return this.api.get('/user/')
  } 

  createProjectAccessToken(projectId){
    return this.api.post('/project_tokens/', {project:projectId, type:'custom'})
  } 
  
  createProject(project){
    return this.api.post('/projects/', project)
  } 

  setupWPNode(server, wpVersion){
    return this.api.post('/wp_nodes/upload_setup/', {server:null, environment:'test', wp_version:wpVersion, settings:{}})
  } 
  
}

module.exports = WordupAPI
