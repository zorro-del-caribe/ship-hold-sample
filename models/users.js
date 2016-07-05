module.exports = function (sh) {
  return {
    table: 'users',
    columns: {
      id: 'integer',
      email: 'string',
      username: 'string',
      roleId: 'integer'
    },
    relations: {
      comments: sh.hasMany('comments'),
      posts: sh.hasMany('posts'),
      password: sh.hasOne('passwords'),
      role: sh.belongsTo('roles', 'roleId')
    }
  };
};