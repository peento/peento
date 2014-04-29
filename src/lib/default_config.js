/**
 * Peento Default Config
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var config = module.exports;

config.port = 3000;

config.cookie = {};
config.cookie.secret = 'optional secret string';

config.session = {};
config.session.secret = 'optional secret string';

config.request = {};
config.request.timeout = 30000;

config.model = {};
config.model.limit = 20;
