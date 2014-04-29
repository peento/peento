/**
 * Assets
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

module.exports = function (ns) {

  return function (req, res, next) {
    var asset = ns('asset');
    var n = req._parsedUrl.pathname.slice(8);
    var f = asset[n];
    if (f) {
      res.sendfile(f);
    } else {
      res.status(404);
      res.end('File /' + n + ' not found.');
    }
  }

};
