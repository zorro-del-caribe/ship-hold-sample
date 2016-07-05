const fs = require('fs');
const stampit = require('stampit');
const env = process.env.NODE_ENV || 'development';

const configFiles = fs.readdirSync('./config')
    .filter(file => file !== 'index.js');

const configProps = {};
configFiles.forEach(function (file) {
  const namespace = file.split('.')[0];
  const conf = require('./' + file);
  configProps[namespace] = Object.assign({}, conf.default, conf[env] || {});
});

const configPropsStamp = stampit().props(configProps);
const findPathStamp = stampit()
  .methods({
    value(path) {
      const parts = path.split('.');
      let value = this;
      for (let part of parts) {
        if (value[part] === undefined) {
          return undefined;
        } else {
          value = value[part];
        }
      }
      return value;
    }
  });

module.exports = stampit.compose(configPropsStamp, findPathStamp);