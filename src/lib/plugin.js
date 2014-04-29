/**
 * Peento Plugin
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var path = require('path');
var fs = require('fs');
var rd = require('rd');
var express = require('express');
var MySQLModel = require('lei-mysql-model');
var utils = require('./utils');
var createDebug = require('./debug');

module.exports = exports = Plugin;


function Plugin (name, ns, dir) {
  this.name = name;
  this.ns = ns;
  this.dir = dir;
  this.hooks = {};
  this.filters = {};
  this.models = {};
  this.calls = {};
  this.routers = {};
  this.middlewares = {};
  this.assets = {};
  this.views = {};
  this.debug = createDebug('plugin:' + name);
}

/******************************************************************************/

Plugin.prototype.load = function () {
  this.loadHooks();
  this.loadFilters();
  this.loadModels();
  this.loadCalls();
  this.loadRouters();
  this.loadMiddlewares();
  this.loadAssets();
  this.loadViews();
};

Plugin.prototype._dir = function (name) {
  return path.resolve(this.dir, name);
};

Plugin.prototype._dirIsExisis = function (name) {
  var dir = this._dir(name);
  return fs.existsSync(dir);
};

Plugin.prototype._dirLoadEachJsFile = function (name, fn) {
  if (!this._dirIsExisis(name)) return;
  var me = this;
  var debug = me.debug;
  var dir = me._dir(name);
  rd.eachFileFilterSync(dir, /\.js$/, function (f, s) {
    var n = utils.filenameToNamespace(dir, f);
    debug('load %s: %s', n, f);
    var m = require(f);
    m.plugin = me.name;
    fn(f, n, m);
  });
};

Plugin.prototype._dirFindEachFile = function (name, fn) {
  if (!this._dirIsExisis(name)) return;
  var debug = this.debug;
  var dir = this._dir(name);
  rd.eachFileSync(dir, function (f, s) {
    var n = utils.filenameToRelativePath(dir, f);
    debug('find %s: %s', n, f);
    fn(f, n);
  });
};

Plugin.prototype.loadHooks = function () {
  this.debug('loadHooks');
  var hooks = this.hooks;
  this._dirLoadEachJsFile('hook', function (f, n, m) {
    hooks[n] = m;
  });
};

Plugin.prototype.loadFilters = function () {
  this.debug('loadFilters');
  var filters = this.filters;
  this._dirLoadEachJsFile('filter', function (f, n, m) {
    filters[n] = m;
  });
};

Plugin.prototype.loadModels = function () {
  this.debug('loadModels');
  var models = this.models;
  this._dirLoadEachJsFile('model', function (f, n, m) {
    models[n] = m;
  });
};

Plugin.prototype.loadCalls = function () {
  this.debug('loadCalls');
  var calls = this.calls;
  this._dirLoadEachJsFile('call', function (f, n, m) {
    calls[n] = m;
  });
};

Plugin.prototype.loadRouters = function () {
  this.debug('loadRouters');
  var routers = this.routers;
  this._dirLoadEachJsFile('router', function (f, n, m) {
    routers[n] = m;
  });
};

Plugin.prototype.loadMiddlewares = function () {
  this.debug('loadMiddlewares');
  var middlewares = this.middlewares;
  this._dirLoadEachJsFile('middleware', function (f, n, m) {
    middlewares[n] = m;
  });
};

Plugin.prototype.loadAssets = function () {
  this.debug('loadAssets');
  var assets = this.assets;
  this._dirFindEachFile('asset', function (f, n) {
    assets[n] = f;
  });
};

Plugin.prototype.loadViews = function () {
  this.debug('loadViews');
  var views = this.views;
  this._dirFindEachFile('view', function (f, n) {
    views[n] = f;
  });
};

/******************************************************************************/

Plugin.prototype._createDebug = function (name) {
  name = name.replace(/\./g, ':');
  return createDebug('plugin:' + this.name + ':' + name);
};

Plugin.prototype.init = function () {
  this.initHooks();
  this.initFilters();
  this.initModels();
  this.initCalls();
  this.initMiddlewares();
  this.initAssets();
  this.initViews();
  this.initRouters();
};

Plugin.prototype.initHooks = function () {
  var me = this;
  var ns = me.ns;
  var app = ns('app');
  var hook = {};
  ns('hook.' + me.name, hook);

  utils.objectEachKey(me.hooks, function (i) {
    var fn = me.hooks[i];
    fn(ns, function registerHook (call, options, handler) {
      me.debug('register hook [%s.%s]: %s', me.name, i, call);
      var pipe = app._getCallPipe(call);
      var args = utils.argumentsToArray(arguments);
      args[0] = me.name;
      pipe.add.apply(pipe, args);
      hook[call] = args;
    }, me._createDebug(i));
  });
};

Plugin.prototype.initFilters = function () {
  var me = this;
  var ns = me.ns;
  var app = ns('app');

  utils.objectEachKey(me.filters, function (i) {
    var fn = me.filters[i];
    fn(ns, function registerFilter (n, fn) {
      me.debug('register filter [%s.%s]: %s', me.name, i, n);
      ns('filter.' + n, fn);
    }, me._createDebug(i));
  });
};

Plugin.prototype.initModels = function () {
  var me = this;
  var ns = me.ns;

  utils.objectEachKey(me.models, function (i) {
    me.debug('register model [%s]: %s', me.name, i);
    var fn = me.models[i];
    var m = fn(ns, MySQLModel.create, me._createDebug(i));
    ns('model.' + i, m);
  });
};

Plugin.prototype.initCalls = function () {
  var me = this;
  var ns = me.ns;

  utils.objectEachKey(me.calls, function (i) {
    me.debug('register call [%s]: %s', me.name, i);
    var fn = me.calls[i];
    var m = fn(ns, me._createDebug(i));
    ns('call.' + i, m);
  });
};

Plugin.prototype.initRouters = function () {
  var me = this;
  var ns = me.ns;
  var app = ns('app.express');

  utils.objectEachKey(me.routers, function (i) {
    me.debug('register router [%s]: %s', me.name, i);
    var fn = me.routers[i];
    //var router = express.Router();
    //fn(ns, router, me._createDebug(i));
    //app.use(router);
    //ns('router.' + i, router);
    fn(ns, app, me._createDebug(i));
  });
};

Plugin.prototype.initMiddlewares = function () {
  var me = this;
  var ns = me.ns;

  utils.objectEachKey(me.middlewares, function (i) {
    me.debug('register middleware [%s]: %s', me.name, i);
    var fn = me.middlewares[i];
    var m = fn(ns, me._createDebug(i));
    ns('middleware.' + i, m);
  });
};

Plugin.prototype.initAssets = function () {
  var me = this;
  var ns = me.ns;

  if (!ns('asset')) ns('asset', {});
  var asset = ns('asset');

  utils.objectEachKey(me.assets, function (i) {
    var f = me.assets[i];
    me.debug('register asset [%s]: %s', i, f);
    asset[i] = f;
  });
};

Plugin.prototype.initViews = function () {
  var me = this;
  var ns = me.ns;

  if (!ns('view')) ns('view', {});
  var view = ns('view');

  utils.objectEachKey(me.views, function (i) {
    var f = me.views[i];
    me.debug('register view [%s]: %s', i, f);
    view[i] = f;
  });
};
