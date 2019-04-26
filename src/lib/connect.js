const axios = require('axios')
const crypto = require('crypto')

module.exports = {

  isValidConnection: function (sourceUrl, privateKey) {
    if (!privateKey) {
      return false
    }

    const route = '/wordup/v1/setup/'
    const expires =  Math.floor(Date.now() / 1000) + 5

    const signature = crypto.createHmac('sha256', privateKey).update(route + expires).digest('base64')

    const apiUrl = sourceUrl + '?rest_route=' + route + '&signature=' + encodeURIComponent(signature) + '&expires=' + expires

    return new Promise(resolve => {
      axios.get(apiUrl).then(function (response) {
        resolve(response.data)
      }).catch(function (error) {
        if (error.response.status === 401) {
          console.log('Error: Authentication failed')
        } else if (error.response.status === 404) {
          console.log('Could not find API endpoint. Have you installed wordup-connect plugin on the source domain?')
        } else {
          //Unknown error
        }
        resolve(false)
      })
    })
  },
}
