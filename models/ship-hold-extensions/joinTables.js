/**
 * dynamically create the join models based on the convention:
 * model1: 'posts', model2: 'tags' -> table: 'posts_tags' (postId, tagId)
 * @param shiphold
 * @returns {*}
 */

module.exports = function (shiphold) {
  var findManyToMany = function (model) {
    return function (rel) {
      const relDef = model.definition.relations[rel];
      return relDef.relation === 'belongsToMany';
    };
  };

  const manyToMany = shiphold.models().filter(m=> {
    const model = shiphold.model(m);
    const relations = Object.keys(model.definition.relations).filter(findManyToMany(model));
    return relations.length > 0;
  });

  for (const modelName of manyToMany) {
    const model = shiphold.model(modelName);
    const relations = Object.keys(model.definition.relations).filter(findManyToMany(model))
      .map(rel=>model.definition.relations[rel]);
    const modelList = shiphold.models();
    const methods = {};
    for (const rel of relations) {
      if (modelList.indexOf(rel.through) === -1) {
        const targetModel = shiphold.model(rel.model);
        shiphold.model(rel.through, function (sh) {
          const table = [rel.model, modelName]
            .sort((a, b)=>a < b ? -1 : 1)
            .join('_');

          const sourceKey = model.name.substr(0, model.name.length - 1) + 'Id';
          const targetKey = targetModel.name.substr(0, targetModel.name.length - 1) + 'Id';

          const columns = {
            id: 'integer',
            [sourceKey]: 'integer',
            [targetKey]: 'integer'
          };
          const relations = {};

          relations[model.name.substr(0, model.name.length - 1)] = sh.belongsTo(model.name, sourceKey);
          relations[targetModel.name.substr(0, targetModel.name.length - 1)] = sh.belongsTo(targetModel.name, targetKey);

          return {
            table,
            columns,
            relations
          };
        });
      }
    }
  }
  return shiphold;
};