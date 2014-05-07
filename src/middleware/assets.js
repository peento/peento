/**
 * Assets
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

module.exports = function (ns) {
  var app = ns('app');
  return function (req, res, next) {
    var asset = ns('asset');
    var n = req._parsedUrl.pathname.slice(8);
    var f = asset[n];
    if (f) return res.sendfile(f);

    // if is debug mode, try to lookup from asset paths
    if (app._is_debug) {
      f = app._fileLookup.asset.resolveSync(n);
      if (f) return res.sendfile(f);
    }

    res.status(404);
    res.end('File /' + n + ' not found.');
  }

};
