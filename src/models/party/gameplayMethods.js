const settingsMethods = require('./gameplay/settingsMethods');
const phaseMethods = require('./gameplay/phaseMethods');
const roundMethods = require('./gameplay/roundMethods');

module.exports = {
  ...settingsMethods,
  ...phaseMethods,
  ...roundMethods,
};
