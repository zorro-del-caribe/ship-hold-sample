const dao = require('ship-hold-dao');
const validator = require('is-my-json-valid');

module.exports = function (sh) {

  dao(sh);

  for (const modelName of sh.models()) {
    const model = sh.model(modelName);
    const instancePrototype = Object.getPrototypeOf(model.new());
    Object.assign(instancePrototype, {
      validate(attr = {}){
        const schema = {
          type: 'object',
          properties: Object.assign({}, model.definition.columns)
        };
        const validate = validator(schema, {verbose: true});
        const result = validate(Object.assign({}, this, attr));
        return {isValid: result, errors: validate.errors};
      }
    });
  }

  return sh;
};