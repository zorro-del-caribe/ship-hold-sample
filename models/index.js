const fs = require('fs');
const shiphold = require('ship-hold');
const config = require('../config')();
const extensions = require('./ship-hold-extensions');


const sh = shiphold(config.value('db'));
const modelFiles = fs.readdirSync('./models')
  .filter(f=>f !== 'index.js' && f !== 'ship-hold-extensions'); // todo filter file only (no directory)

modelFiles.forEach(file=> {
  const table = file.split('.')[0];
  const modelFunc = require('./' + table);
  if (typeof modelFunc === 'function') {
    sh.model(table, modelFunc);
  }
});

module.exports = extensions(sh);
