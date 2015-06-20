'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _fsevent = require('./fsevent');

var _ignore = require('./ignore');

var _watch = require('./watch');

var walkPath;
exports.walkPath = walkPath;
var walkDir = function walkDir(filepath, stream, opts) {
  if ((0, _ignore.ignore)(opts.ignore, filepath)) {
    return;
  }
  var promise = new Promise(function (resolve, reject) {
    _fs2['default'].readdir(filepath, function (err, files) {
      if (err) {
        if (!opts.quiet) {
          console.error('pryfs/walkDir - readdir on [' + filepath + '] ERROR ' + err);
        }
        reject(err);
        return;
      }
      var ps = [];
      (files || []).forEach(function (f) {
        var subpath = _path2['default'].join(filepath, f);
        if ((0, _ignore.ignore)(opts.ignore, subpath)) {
          return;
        }
        var p = walkPath(subpath, stream, opts);
        ps.push(p);
      });
      Promise.all(ps).then(function () {
        return resolve();
      });
    });
  });
  return promise;
};

exports.walkPath = walkPath = function (file, stream, opts) {
  if ((0, _ignore.ignore)(opts.ignore, file)) {
    return Promise.resolve();
  }
  var statFn = opts.followSymLinks ? 'lstat' : 'stat';
  var promise = new Promise(function (resolve, reject) {
    _fs2['default'][statFn](file, function (err, stats) {
      if (err && !opts.quiet) {
        if (!opts.quiet) {
          console.error('pryfs/walkPath - lstat on [' + file + '] ERROR ' + err);
        }
        reject(err);
        return;
      }
      opts.monitored.add(file);
      if (opts.walk) {
        stream.next((0, _fsevent.FsEvent)('visited', file, opts.base));
      }
      if (stats.isDirectory()) {
        if (opts.watch) {
          (0, _watch.watchDir)(file, stream, opts);
        }
        if (opts.recursive) {
          walkDir(file, stream, opts).then(function () {
            resolve();
          });
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  });
  return promise;
};