module.exports = function (sh) {
  return {
    table: 'tags',
    columns: {
      id: 'integer',
      label: 'string',
      description: 'string'
    },
    relations: {
      posts: sh.belongsToMany('posts', 'posts_tags', 'tagId')
    }
  };
};