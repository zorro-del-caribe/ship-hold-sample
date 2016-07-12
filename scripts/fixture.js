const sh = require('../models');
const config = require('../config')();
const saltRounds = config.value('server.saltRounds');
const bcrypt = require('bcrypt');
const casual = require('casual');

const secret = config.value('server.secret');

const rootUser = {
  username: '$username',
  email: '$email',
  roleId: '$roleId'
};

const intGen = function * (limit) {
  let i = 0;
  while (i <= limit) {
    yield ++i
  }
};
const Users = sh.model('users');
const Passwords = sh.model('passwords');
const Posts = sh.model('posts');
const Roles = sh.model('roles');
const Comments = sh.model('comments');
const Tags = sh.model('tags');


Promise.all(['admin', 'visitor'].map(role=> Roles.insert({title: role}).run()))
  .then(function createAdmins (roleGroups) {
    return Promise.all([...intGen(5)].map(i=>Users
      .insert(rootUser)
      .run({username: 'admin' + i, roleId: 1, email: `admin${i}@shiphold.com`})
      ))
      .then(function createPasswords (admins) {
        return Promise.all(admins.map(adminResult=> {
          const admin = adminResult[0];
          const salt = bcrypt.genSaltSync(saltRounds);
          const hash = bcrypt.hashSync('admin', salt);
          return Passwords
            .insert({
              salt: '$salt',
              hash: '$hash',
              userId: '$id'
            })
            .run({
              salt,
              hash,
              id: admin.id
            });
        }));
      })
      .then(function createVisitors () {
        return Promise.all([...intGen(2000)].map(()=> {
          const user = {
            email: casual.email,
            username: casual.username,
            roleId: 2
          };
          return Users.insert(user).run();
        }));
      })
      .then(function createPosts () {
        return Promise.all([...intGen(200)]
          .map(i=> {
            const date = new Date(casual.unix_time * 1000);
            return {
              authorId: casual.integer(from = 1, to = 5),
              title: casual.title,
              content: casual.text,
              publishedAt: date,
              lastModifiedAt: date
            };
          })
          .map(p=>Posts.insert(p).run()));
      })
      .then(function createComments () {
        return Promise.all([...intGen(4000)].map(function () {
          const publishedAt = new Date(casual.unix_time * 1000);
          const authorId = casual.integer(from = 1, to = 2005);
          const content = casual.sentences(2);
          const postId = casual.integer(from = 1, to = 200);
          const comment = {publishedAt, authorId, content, postId};
          return Comments.insert(comment).run();
        }));
      })
      .then(function createTags () {
        return Promise.all([...intGen(200)]
          .map(int=> {
            return Tags
              .insert({label: (casual.word)+int, description: casual.sentence})
              .run();
          })
        );
      })
      .then(function addTagsToPosts () {
        return Promise.all([...intGen(200)].map(i=> {
          const tagsIds = [casual.integer(from = 1, to = 200), casual.integer(from = 1, to = 200), casual.integer(from = 1, to = 200)];
          const uniqueIds = [];
          for (const id of tagsIds) {
            if (uniqueIds.indexOf(id) === -1) {
              uniqueIds.push(id);
            }
          }
          return Promise.all(uniqueIds.map(id=>sh.model('posts_tags').insert({
              postId: i,
              tagId: id
            })
            .run()
            .catch(()=>console.log(i, id))));
        }));
      })
      .then(function () {
        sh.stop();
      });
  });







