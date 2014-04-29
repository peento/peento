/**
 * Error Handler
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

module.exports = function () {

  return function (err, req, res, next) {
    console.error(err.stack || err);
    if (req._parsedUrl.pathname.substr(-5) === '.json') {
      // JSON Format
      if (Array.isArray(err)) {
        err = err.map(function (err) {
          return err.toString();
        }).join('\n');
      }
      res.json({error: err.toString()});
    } else {
      // HTML page
      res.end('' + ((err && err.stack) || err));
    }
  }

};
