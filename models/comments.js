module.exports = function (sh) {
  return {
    table: 'comments',
    columns: {
      id: 'integer',
      publishedAt: 'timestamp',
      authorId: 'integer',
      postId: 'integer',
      content: 'text'
    },
    relations: {
      author: sh.belongsTo('users', 'authorId'),
      post: sh.belongsTo('posts', 'postId')
    }
  };
};