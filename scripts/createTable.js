const pg = require('pg');
const config = (require('../config')()).db;
const url = require('url');

const {username, password}=config;

config.slashes = true;
config.protocol = 'postgres';
config.auth = [username, password].join(':');
config.pathname = '/' + config.database;

const connectionString = url.format(config);

pg.connect(connectionString, function (err, client, done) {
  if (err) {
    throw err;
  }

  var dropQ = `DROP TABLE IF EXISTS users, posts, comments, tags, posts_tags, passwords, roles`;
  client.query(dropQ, function (err, result) {
    if (err) {
      throw err;
    }
    var tableQ = `
    CREATE TABLE roles
    (
    id serial PRIMARY KEY,
    title varchar
    );
    CREATE TABLE users
    (
    id serial PRIMARY KEY,
    email varchar(80) UNIQUE,
    username varchar(80),
    "roleId" integer REFERENCES roles
    );
    CREATE TABLE posts
    (
    id serial PRIMARY KEY,
    title varchar(255),
    "publishedAt" timestamp,
    "lastModifiedAt" timestamp,
    content text,
    "authorId" integer REFERENCES users
    );
    CREATE TABLE comments
    (
    id serial PRIMARY KEY,
    "authorId" integer REFERENCES users,
    "postId" integer REFERENCES posts,
    "publishedAt" timestamp,
    content text
    );
    CREATE TABLE tags
    (
    id serial PRIMARY KEY,
    label varchar(100),
    description varchar(255)
    );
    CREATE TABLE posts_tags
    (
    id serial PRIMARY KEY,
    "tagId" integer REFERENCES tags,
    "postId" integer REFERENCES posts,
    UNIQUE("tagId", "postId")
    );
    CREATE TABLE passwords
    (
    id serial PRIMARY KEY,
    salt varchar(255),
    hash varchar(255),
    "userId" integer REFERENCES users
    );
    `;
    client.query(tableQ, function (err, result) {
      if (err) {
        throw err;
      }
      done();
      pg.end();
    })

  });
});


