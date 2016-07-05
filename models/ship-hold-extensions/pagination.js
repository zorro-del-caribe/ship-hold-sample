/**
 * create a decorator around the select builder to add the "page" method
 * @param sh
 * @returns {*}
 */
module.exports = function (sh) {
  const models = sh.models();
  const proto = Object.getPrototypeOf(sh.model(models[0]));
  const select = proto.select;
  Object.assign(proto, {
    select(){
      const builder = select.call(this, ...arguments);
      return Object.assign(builder, {
        page(pageNumber = 1, pageSize = 15){
          return this.limit(pageSize, (pageNumber - 1) * pageSize);
        }
      });
    }
  });
  Object.assign(sh.adapters, {
    countAndRun(params = {}){
      const fromNodes = [...this.fromNodes];
      const countBuilder = sh.select(sh.aggregate.count('*'));
      const subQuery = fromNodes[0].value;
      if (subQuery.run) {
        countBuilder
          .from(...[...subQuery.fromNodes].map(n=>n.value));
        if (subQuery.whereNodes.length) {
          countBuilder.whereNodes.add(subQuery.whereNodes);
        }
      } else {
        countBuilder
          .from(...[...fromNodes].map(n=>n.value));
        if (this.whereNodes.length) {
          countBuilder.whereNodes.add(this.whereNodes);
        }
      }
      return Promise.all([countBuilder.run(params), this.run(params)])
        .then(function (results) {
          return {
            count: results[0][0].count,
            rows: results[1]
          }
        });
    }
  });
  return sh;
};