const config = require('./config/index')();
const logger = require('koa-logger');
const compress = require('koa-compress');
const koa = require('koa');
const mount = require('koa-mount');
const fileServer = require('./fileServer');
const webApp = require('./webApp');
const sh = require('./models');
const Pug = require('koa-pug');


const app = koa()
  .use(logger())
  .use(compress())
  .use(mount('/public', fileServer()))
  .use(mount('/', webApp));

app.sh = sh;
app.keys = config.value('server.keys');


for (const model of sh.models()) {
  const modelName = model.charAt(0).toUpperCase() + model.slice(1);
  Object.defineProperty(app, modelName, {
    get(){
      return sh.model(model)
    }
  });
}

const pug = new Pug({
  app: app,
  viewPath: './views'
});

app.listen(config.value('server.port'), function (server) {
  console.log(' \uD83D\uDE80\uD83D\uDE80\uD83D\uDE80    super blog running on port %s     \uD83D\uDE80\uD83D\uDE80\uD83D\uDE80', config.value('server.port'));
});