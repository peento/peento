/**
 * Debug
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var debug = require('debug');

module.exports = function (name) {
  return debug('peento:' + name);
};
