module.exports = function (sh) {
  return {
    table:'roles',
    columns:{
      id:'integer',
      title:'string'
    },
    relations:{
      users:sh.hasMany('users')
    }
  }
};