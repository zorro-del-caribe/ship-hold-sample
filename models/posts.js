module.exports = function (sh) {
  return {
    table: 'posts',
    columns: {
      id: 'integer',
      title: 'string',
      publishedAt: 'timestamp',
      lastModifiedAt: 'timestamp',
      content: 'string',
      authorId: 'integer'
    },
    relations: {
      author: sh.belongsTo('users', 'authorId'),
      comments: sh.hasMany('comments'),
      tags: sh.belongsToMany('tags', 'posts_tags', 'postId')
    }
  };
};