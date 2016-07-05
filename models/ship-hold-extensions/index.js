const fs = require('fs');
module.exports = function (shiphold) {
  const extensions = fs.readdirSync('./models/ship-hold-extensions')
    .filter(f=>f !== 'index.js');
  extensions.forEach(file=> {
    const extensionFunc = require('./' + file);
    extensionFunc(shiphold);
  });
  return shiphold;
};