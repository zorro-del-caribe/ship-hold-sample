const config = require('./config/index')();
const router = require('koa-router')();
const koa = require('koa');
const csrf = require('koa-csrf');
const body = require('koa-bodyparser');
const session = require('koa-generic-session');
const bcrypt = require('bcrypt');

const authRequired = function * (next) {
  if (!this.user) {
    this.throw(401, 'You must be authenticated to edi the post');
  }
  yield *next;
};

const adminRequired = function * (next) {
  if (!this.user.role || this.user.role.title !== 'admin') {
    this.throw(403, 'Only admin user can perform the following operation');
  }
  yield *next;
};

router.get('/', function * () {
  const {query}=this;
  const {Posts, Tags, Users, Comments, Posts_tags:PostsTags} = this.app;
  const pageNumber = Number.isNaN(Number.parseInt(query.page)) === false ? Number.parseInt(query.page) : 1;
  const size = 10;
  const postsBuilder = Posts
    .select()
    .page(pageNumber, size)
    .orderBy('publishedAt', 'desc');

  if (query.author) {
    postsBuilder
      .where('authorId', '$author')
      .noop();
  }

  if (query.search) {
    query.search = '%' + decodeURIComponent(query.search) + '%';
    postsBuilder
      .where('title', 'ilike', '$search')
      .or('content', 'ilike', '$search')
      .noop();
  }

  if (query.tag) {
    const searchQuery = PostsTags
      .select()
      .page(pageNumber, size)
      .where('tagId', '$tag')
      .include(
        Posts.select()
          .orderBy('publishedAt', 'desc')
          .include(
            Comments.select('id'),
            Users.select('id', 'username'),
            Tags.select('id', 'label')
          ))
      .countAndRun(query);

    const tagQuery = Tags
      .select()
      .where('id', '$tag')
      .run(query);

    const page = yield searchQuery;
    const tagInfo = yield tagQuery;

    this.render('index', {
      user: this.user,
      tag: tagInfo[0],
      posts: page.rows.map(p=>p.post),
      pageSize: size,
      pageNumber,
      count: page.count
    });
  } else {

    const page = yield postsBuilder
      .include(Users.select('id', 'username'), Comments.select('id'), Tags.select('id', 'label'))
      .countAndRun(query);

    this.render('index', {user: this.user, posts: page.rows, pageSize: size, pageNumber, count: page.count});
  }
});

router.get('/posts/:postId', csrf(), function * () {
  const {postId} = this.params;
  const {Posts, Tags, Comments, Users} = this.app;
  const [post] = yield Posts
    .select()
    .where('id', '$postId')
    .include(
      Tags.select('id', 'label'),
      Users.select('id', 'username'),
      Comments.select()
        .include(Users.select('id', 'username'))
    )
    .orderBy('"comments.publishedAt"', 'desc')
    .run({postId});
  if (!post) {
    this.throw(404);
  }
  this.render('post', {post, user: this.user, _csrf: this.csrf});
});

router.get('/posts/:postId/edit', csrf(), authRequired, function * () {
  const {Posts, Tags, Users} =this.app;
  const {postId} = this.params;
  const [post] = yield Posts
    .select()
    .where('id', '$postId')
    .include(
      Tags.select('id', 'label'),
      Users.select('id', 'username')
    )
    .run({postId});

  if (!post) {
    this.throw(404);
  }

  if (post.author.id !== this.user.id) {
    this.throw(403, 'Only the author of the post can edit it');
  }

  this.render('editPost', {user: this.user, post, _csrf: this.csrf});
});

router.get('/new/post', csrf(), authRequired, adminRequired, function * () {
  this.render('editPost', {user: this.user, post: {}, _csrf: this.csrf});
});

router.post('/posts', csrf(), authRequired, adminRequired, function * () {
  const {Posts, Tags, Posts_tags:PostsTags}=this.app;
  const now = new Date();
  const post = Object.assign({}, this.request.body, {authorId: this.user.id, publishedAt: now, lastModifiedAt: now});
  const newPost = Posts.new(post);
  const validationResult = newPost.validate();

  if (validationResult.isValid !== true) {
    this.throw(422, validationResult.errors);
  }

  yield newPost.create();

  /// todo add transaction support and utility methods on instances for n to m (post.setTags([...])
  const newTags = this.request.body.tags ? this.request.body.tags.split(',').map(ts=> {
    return {label: ts.trim().toLowerCase()};
  }) : [];

  if (newTags.length) {
    const existing = yield Tags
      .select()
      .where('label', 'in', newTags.map(t=>t.label))
      .run();

    const tagsToCreate = newTags.filter(ta=>existing.find(ex=>ex.label === ta.label) === undefined);
    let createdTags = [];
    if (tagsToCreate.length) {
      const createResult = yield Promise.all(tagsToCreate.map(nt=>Tags.insert(nt).run()));
      createdTags = createResult.map(cr=>cr[0]);
    }


    yield Promise.all(createdTags.concat(existing).map(t=>PostsTags.insert({
      tagId: t.id,
      postId: newPost.id
    }).run()));
  }

  this.status = 201;
  this.redirect('/posts/' + newPost.id);
});

router.post('/posts/:postId', csrf(), authRequired, function * () {
  const {Posts, Tags, Posts_tags:PostsTags} = this.app;
  const {postId}=this.params;

  const [post] = yield Posts
    .select()
    .where('id', '$postId')
    .include(Tags)
    .run({postId});

  if (!post) {
    this.throw(404, 'could not find the post');
  }

  if (post.authorId !== this.user.id) {
    this.throw(403, 'Only the author of the post can edit it');
  }


  post.lastModifiedAt = new Date();

  /// todo add transaction support and utility methods on instances for n to m (post.setTags([...])
  const newTags = this.request.body.tags ? this.request.body.tags.split(',').map(ts=> {
    return {label: ts.trim().toLowerCase()};
  }) : [];

  const tagsToRemove = post.tags.filter(t=>newTags.find(nt=>nt.label === t.label) === undefined);
  const tagsToAdd = newTags.filter(nt=>post.tags.find(t=>t.label === nt.label) === undefined);

  let removeQ;
  let addQ;
  if (tagsToRemove.length) {
    removeQ = PostsTags
      .delete()
      .where('tagId', 'in', tagsToRemove.map(tr=>tr.id))
      .and('postId', post.id)
      .run();
  }

  if (tagsToAdd.length) {
    const existing = yield Tags
      .select()
      .where('label', 'in', tagsToAdd.map(t=>t.label))
      .run();

    const newTags = tagsToAdd.filter(ta=>existing.find(ex=>ex.label === ta.label) === undefined);
    let createdTags = [];
    if (newTags.length) {
      const createResult = yield Promise.all(newTags.map(nt=>Tags.insert(nt).run()));
      createdTags = createResult.map(cr=>cr[0]);
    }


    addQ = Promise.all(createdTags.concat(existing).map(t=>PostsTags.insert({
      tagId: t.id,
      postId: post.id
    }).run()));
  }

  if (removeQ) {
    yield removeQ;
  }
  if (addQ) {
    yield addQ;
  }

  ////

  const validation = post.validate(this.request.body);

  if (validation.isValid !== true) {
    this.throw(422, validation.errors);
  }

  yield post.save(this.request.body);

  this.redirect(`/posts/${post.id}`);
});

router.delete('/posts/:postId', authRequired, function * () {
  const {Posts} = this.app;

  const [post] = yield Posts
    .select()
    .where('id', '$postId')
    .run(this.params);

  if (!post) {
    this.throw(404, 'Could not find the post');
  }

  if (post.authorId !== this.user.id) {
    this.throw(403, 'You don\'t have the right to delete this post');
  }

  yield post.delete();

  this.status = 204;
});

router.get('/login', csrf(), function * () {
  this.render('login', {_csrf: this.csrf});
});

router.post('/login', csrf(), function * () {
  const {username, password} = this.request.body;
  const {Users, Passwords, Roles} = this.app;

  const user = yield Users
    .select('id', 'email', 'username')
    .where('email', '$username')
    .or('username', '$username')
    .include(Roles, Passwords.select('id', 'hash'))
    .run({username});

  if (!user.length) {
    this.throw(401, 'The email/username is not known');
  }

  const success = bcrypt.compareSync(password, user[0].password.hash);

  if (!success) {
    this.throw(401, 'Invalid password');
  }

  this.session.user = user[0];

  this.redirect('/');
});

router.delete('/comments/:commentId', authRequired, adminRequired, function * () {
  const {Comments, Posts} = this.app;
  const {commentId}= this.params;

  const [comment] = yield Comments
    .select('id')
    .where('id', '$commentId')
    .include(Posts.select('id', 'authorId'))
    .run({commentId});

  if (!comment) {
    this.throw(404, 'Could not find the comment');
  }

  if (comment.post.authorId !== this.user.id) {
    this.throw(403, 'Only the author of the related post can delete comments');
  }

  yield comment.delete();
  this.status = 204;
});

router.get('/logout', function * () {
  this.session = null;
  this.redirect('/');
});

router.get('/tags', function * () {
  const {query}=this;
  const {Tags} = this.app;
  this.body = yield Tags
    .select()
    .page(1, 5)
    .where('label', 'ilike', '$query')
    .run({query: `%${query.search}%`});
});

router.post('/posts/:postId/comments', csrf(), function * () {
  const {Comments, Roles, Users} =this.app;
  const {username, message:content, email} = this.request.body;
  const {postId}=this.params;
  const now = new Date();

  let [user] = yield Users
    .select('id', 'email')
    .where('email', '$email')
    .run({email});

  if (!user) {
    const [visitor] = yield Roles
      .select()
      .where('title', 'visitor')
      .run();

    user = yield Users
      .new({username, email, roleId: visitor.id})
      .create();
  }

  yield Comments.new({
      publishedAt: now,
      postId,
      authorId: user.id,
      content
    })
    .create();

  this.redirect(['/posts/' + postId + '#comments']);
});


const webApp = koa()
  .use(session())
  .use(body())
  .use(function * me (next) {
    this.user = this.session.user;
    yield *next;
  })
  .use(router.routes());

webApp.secret = config.value('server.secret');


module.exports = webApp;




