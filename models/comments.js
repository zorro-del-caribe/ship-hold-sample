module.exports = function (sh) {
  return {
    table: 'comments',
    columns: {
      id: 'integer',
      publishedAt: {type: ['string', 'object']},
      authorId: {type: 'integer', required: true},
      postId: {type: 'integer', required: true},
      content: {type: 'string', required: true}
    },
    relations: {
      author: sh.belongsTo('users', 'authorId'),
      post: sh.belongsTo('posts', 'postId')
    }
  };
};