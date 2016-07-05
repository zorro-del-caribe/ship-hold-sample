const koa = require('koa');
const fileServer = require('koa-static');
module.exports = function () {
  return koa()
    .use(fileServer('./public'));
};