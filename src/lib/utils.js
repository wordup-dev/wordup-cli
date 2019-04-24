
module.exports = {

  isValidUrl: function (value) {
    var regex = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    return regex.test(value)
  },

}
