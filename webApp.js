const config = require('./config/index')();
const router = require('koa-router')();
const koa = require('koa');
const csrf = require('koa-csrf');
const body = require('koa-bodyparser');
const session = require('koa-generic-session');
const bcrypt = require('bcrypt');

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

router.get('/posts/:postId', function * () {
  const {postId} = this.params;
  const {Posts, Tags, Comments, Users} = this.app;
  const post = yield Posts
    .select()
    .where('id', '$postId')
    .include(
      Tags.select('id', 'label'),
      Users.select('id', 'username'),
      Comments.select()
        .orderBy('publishedAt', 'desc')
        .include(Users.select('id', 'username'))
    )
    .run({postId});
  if (!post.length) {
    this.throw(404);
  }
  this.render('post', {post: post[0]});
});

router.get('/posts/:postId/edit', function * (next) {
  if (!this.user) {
    this.throw(401, 'You must be authenticated to edi the post');
  }
  yield *next;
}, function * () {
  const {Posts, Tags, Users} =this.app;
  const {postId} = this.params;
  const posts = yield Posts
    .select()
    .where('id', '$postId')
    .include(
      Tags.select('id', 'label'),
      Users.select('id', 'username')
    )
    .run({postId});

  const post = posts[0];

  if (!post) {
    this.throw(404);
  }

  if (post.author.id !== this.user.id) {
    this.throw(403, 'Only the author of the post can edit it');
  }

  this.render('editPost', {user: this.user, post});
});

router.get('/login', function * () {
  this.render('login', {_csrf: this.csrf});
});

router.post('/login', function * () {
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

router.get('/logout', function * () {
  this.session = null;
  this.redirect('/');
});


const webApp = koa()
  .use(session())
  .use(body())
  .use(csrf())
  .use(function * me (next) {
    this.user = this.session.user;
    yield *next;
  })
  .use(router.routes());

webApp.secret = config.value('server.secret');


module.exports = webApp;




