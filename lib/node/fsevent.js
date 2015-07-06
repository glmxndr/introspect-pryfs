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

var _glob = require('./glob');

var _ignore = require('./ignore');

var FsEvent = function FsEvent(type, file, base, isDir) {
  if (!(this instanceof FsEvent)) {
    return new FsEvent(type, file, base, isDir);
  }
  _lodash2['default'].extend(this, { file: file, type: type, base: base, isDir: isDir });
  this.isFile = !this.isDir;
};

exports.FsEvent = FsEvent;
FsEvent.prototype = Object.defineProperties({
  toString: function toString() {
    return 'FsEvent [' + this.type + ' ' + this.relative() + ']';
  },

  relative: function relative() {
    return _path2['default'].relative(this.base, this.file);
  },

  relativeTo: function relativeTo(other) {
    return _path2['default'].relative(other, this.file);
  },

  match: function match(pattern) {
    return (0, _ignore.ignore)([pattern], this.file);
  },

  /**
   * Read the content of the file in UTF-8  and applies the given function.
   * @return a promise of the result of the given function
   */
  transform: function transform(fn, encoding) {
    var _this = this;

    if (this.isDir) {
      return Promise.reject('this event is not on a file');
    }
    encoding = encoding || 'utf-8';
    return new Promise(function (resolve, reject) {
      _fs2['default'].readFile(_this.file, { encoding: encoding }, function (err, data) {
        if (err) {
          reject(err);
        } else {
          try {
            resolve(fn(data));
          } catch (e) {
            reject(e);
          }
        }
      });
    });
  },

  read: function read(encoding) {
    return this.transform(function (d) {
      return d;
    }, encoding);
  }

}, {
  ext: {
    get: function () {
      return _path2['default'].parse(this.file).ext.replace(/^\./, '');
    },
    configurable: true,
    enumerable: true
  },
  name: {
    get: function () {
      return _path2['default'].parse(this.file).base;
    },
    configurable: true,
    enumerable: true
  },
  dir: {
    get: function () {
      return _path2['default'].parse(this.file).dir;
    },
    configurable: true,
    enumerable: true
  }
});