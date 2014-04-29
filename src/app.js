/**
 * Peento Application
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var fs = require('fs');
var path = require('path');
var async = require('async');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var morgan = require('morgan');
var serveStatic = require('serve-static');
var timeout = require('connect-timeout');
var rd = require('rd');
var expressLiquid = require('express-liquid');
var createNamespace = require('lei-ns').Namespace;
var MySQLPool = require('lei-mysql');
var MySQLModel = require('lei-mysql-model');
var Pipe = require('lei-pipe');
var errorhandler = require('./middleware/errorhandler');
var assetsMiddleware = require('./middleware/assets');
var utils = require('./lib/utils');
var Plugin = require('./lib/plugin');
var createDebug = require('./lib/debug');
var debug = require('./lib/debug')('app');


module.exports = function (config) {
  return new PeentoApplication(config);
};


function PeentoApplication (config) {
  debug('new');

  // init global namespace
  var ns = this.ns = createNamespace();
  ns('app', this);
  ns('config', config);
  ns('utils', utils);
  ns('debug', createDebug);

  // init express
  var app = this.express = express();
  app.use(morgan());
  app.use(bodyParser());
  app.use(express.query());
  app.use(cookieParser('optional secret string'));
  app.use(session({
    keys: ['optional secret string']
  }));
  app.use('/assets', assetsMiddleware(ns));
  app.use(timeout(30000));

  this._initTpl();
  this._useDefaultPlugin();
}

PeentoApplication.prototype.listen = function (port) {
  debug('listen %s', port);
  this.express.listen(port);
};

PeentoApplication.prototype.start = function () {
  debug('start');
  this._initDb();
  this._initPlugins();
  this._initFilters();
  this.express.use(errorhandler());
  this.listen(this.ns('config.port'));
};

/******************************************************************************/

PeentoApplication.prototype._usePluginFromDir = function (name, dir) {
  var ns = this.ns;
  var plugin = new Plugin(name, ns, dir);
  ns('plugin.' + name, plugin);
  require(plugin.dir)(ns, plugin, plugin.debug);

  if (!Array.isArray(this._plugins)) this._plugins = [];
  this._plugins.push(plugin);
}

PeentoApplication.prototype._useDefaultPlugin = function () {
  this._usePluginFromDir('default', path.resolve(__dirname, 'default'));
};

PeentoApplication.prototype.usePlugin = function (name) {
  var errs = [];
  var m, f;

  // try to load from working path: ./plugin/name
  try {
    f = path.resolve('plugin', name);
    m = require(f);
  } catch (err) {
    errs.push(err);
  }

  // try to load from package
  if (!m) {
    try {
      var n = 'peento-plugin-' + name;
      m = require(n);
      f = path.dirname(require.resolve(n));
    } catch (err) {
      errs.push(err);
    }
  }

  if (typeof m !== 'function') {
    throw new Error('Plugin ' + name + ' not found');
  }

  this._usePluginFromDir(name, f);
};

PeentoApplication.prototype._initPlugins = function () {
  debug('_initPlugins');
  this._plugins.forEach(function (plugin) {
    plugin.init();
  });
};

/******************************************************************************/

PeentoApplication.prototype._initTpl = function () {
  debug('_initTpl');
  var ns = this.ns;
  var app = this.express;

  var baseContext = this.context = expressLiquid.newContext();
  var renderLiquid = this.renderLiquid = expressLiquid({
    context:     baseContext,
    resolveFilename: function (name, settings) {
      var views = ns('view');
      var ext = path.extname(name);
      if (!ext) name += '.liquid';
      if (name[0] === '/') name = name.slice(1);
      var f = views[name];
      if (!f) f = views['view_not_found.liquid'];
      debug('resolve view: [%s] %s', name, f);
      return f;
    }
  });

  app.use(function (req, res, next) {
    res.context = expressLiquid.newContext();
    res._render = res.render;

    res.render = function (tpl) {
      debug('render: %s', tpl);

      res.setLocals('_view_name', tpl);
      res.context.setLocals('_server', {
        query:  req.query,
        body:   req.body,
        params: req.params,
        session: req.session
      });
      res.context.setLocals('_config', ns('config'));

      renderLiquid(tpl, {
        context: res.context,
        cache:   true,
        settings: {}
      }, function (err, html) {
        if (err) return next(err);
        res.header('content-type', 'text/html');
        res.end(html);
      });
    };

    res.setLocals = function (n, v) {
      return res.context.setLocals(n, v);
    };

    next();
  });
};

PeentoApplication.prototype._initFilters = function () {
  debug('_initFilters');
  var ns = this.ns;
  var baseContext = this.context;
  var filters = ns('filter');
  for (var i in filters) {
    if (i.substr(-5) === 'Async') {
      baseContext.setAsyncFilter(i.substr(0, i.length - 5), filters[i]);
    } else {
      baseContext.setFilter(i, filters[i]);
    }
  }
};

PeentoApplication.prototype._initDb = function () {
  debug('_initDb');
  var ns = this.ns;
  var db = new MySQLPool(ns('config.mysql'));
  this.db = db;
  ns('db', db);

  var debugSql = createDebug('db:query');
  db.use('sql', function (sql, next) {
    debugSql(sql);
    next(null, sql);
  });
};

/******************************************************************************/

PeentoApplication.prototype._getCallPipe = function (name) {
  this._callPipes = this._callPipes || {};
  this._callPipes[name] = this._callPipes[name] || new Pipe();
  return this._callPipes[name];
};

PeentoApplication.prototype.call = function (name, params, callback) {
  var me = this;
  var ns = me.ns;

  var call = ns('call.' + name);
  if (typeof call !== 'function') {
    return callback(new TypeError('Cannot call ' + name));
  }

  async.series([

    // before.xxxx
    function (next) {
      debug('call: before %s', name);
      var before = me._getCallPipe('before.' + name);
      before.start(params, function (err, data) {
        params = data;
        next(err);
      });
    },

    // xxxx
    function (next) {
      debug('call: %s', name);
      call(params, function (err, data) {
        params = data;
        next(err);
      });
    },

    // after.xxx
    function (next) {
      debug('call: after %s', name);
      var after = me._getCallPipe('after.' + name);
      after.start(params, function (err, data) {
        params = data;
        next(err);
      });
    }

  ], function (err) {
    callback(err, params);
  });
};
