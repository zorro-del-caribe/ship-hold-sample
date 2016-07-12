module.exports = function (sh) {
  return {
    table: 'posts',
    columns: {
      id: 'integer',
      title: {type: 'string', required: true, minLength: 3},
      publishedAt: {type: ['string', 'object']},
      lastModifiedAt: {type: ['string', 'object']},
      content: {type: 'string', required: true},
      authorId: 'integer'
    },
    relations: {
      author: sh.belongsTo('users', 'authorId'),
      comments: sh.hasMany('comments'),
      tags: sh.belongsToMany('tags', 'posts_tags', 'postId')
    }
  };
};