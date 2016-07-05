module.exports = function (sh) {
  return {
    table: 'passwords',
    columns: {
      id: 'integer',
      salt: 'string',
      hash: 'string',
      userId: 'integer'
    },
    relations: {
      user: sh.belongsTo('users', 'userId')
    }
  };
};