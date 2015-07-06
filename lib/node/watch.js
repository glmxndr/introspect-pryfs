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

// This method deals with file which would have been added to a recently monitored
// folder which had content before we could attach a watcher to it.
var onAddSub = function onAddSub(base, opts) {
  _fs2['default'].readdir(base, function (err, files) {
    if (err) {
      if (!opts.quiet) {
        console.error('pryfs/onAddSub - readdir on [' + base + '] ERROR ' + err);
      }
      return;
    }
    files.forEach(function (f) {
      var subfile = _path2['default'].join(base, f);
      if (opts.monitored.has(subfile)) {
        return;
      }
      var statFn = opts.followSymLinks ? 'lstat' : 'stat';
      _fs2['default'][statFn](subfile, function (err, stats) {
        if (err) {
          if (!opts.quiet) {
            console.error('pryfs/onAddSub - lstat on [' + subfile + '] ERROR ' + err);
          }
          return;
        }
        var isDir = stats.isDirectory();
        opts.monitored.set(subfile, isDir);
        opts.maybeFire('added', subfile, isDir);
        if (isDir && opts.recursive) {
          onAddSub(subfile, opts);
        }
      });
    });
  });
};

var watchDir = function watchDir(dirpath, opts) {
  if ((0, _ignore.ignore)(opts.ignore, dirpath)) {
    return;
  }

  var watcher = _fs2['default'].watch(dirpath, { persistent: opts.persistent, recursive: false });
  opts.stream.onEnd(function () {
    return watcher.close();
  });

  var onAdd = function onAdd(file) {
    // If the file is already monitored, it was not created...
    // so do nothing, since it was probably a glitch from fs.watch
    if (opts.monitored.has(file)) {
      if (opts.verbose) {
        console.log('pryFs/watchDir/onAdd - already monitored [' + file + ']');
      }
      return;
    }

    var statFn = opts.followSymLinks ? 'lstat' : 'stat';
    _fs2['default'][statFn](file, function (err, stats) {
      if (err) {
        if (!opts.quiet) {
          console.error('pryfs/watchDir/onAdd - ' + statFn + ' on [' + file + '] ERROR ' + err);
        }
        return;
      }

      // Check that the file was really created by checking its creation time.
      // If the file was created more than 1 second ago, the current event
      // results from a glitch in multiple fs.watch watchers.
      var creationTime = stats.birthtime.getTime();
      var now = new Date().getTime();
      var diff = now - creationTime;
      if (diff > 1000) {
        return;
      }

      var isDir = stats.isDirectory();
      opts.monitored.set(file, isDir);
      opts.maybeFire('added', file, isDir);

      if (isDir) {
        onAddSub(file, opts);
        if (opts.recursive) {
          watchDir(file, opts);
        }
      }
    });
  };

  var onDelete = function onDelete(file) {
    if (!opts.monitored.has(file)) {
      if (opts.verbose) {
        console.log('pryFs/watchDir/onDelete - not monitored [' + file + ']');
      }
      return;
    }
    var isDir = opts.monitored.get(file);
    opts.monitored['delete'](file);
    opts.maybeFire('deleted', file, isDir);
  };

  var onChange = function onChange(name) {
    var file = _path2['default'].join(dirpath, name);
    if (!opts.monitored.has(file)) {
      if (opts.verbose) {
        console.log('pryFs/watchDir/onChange - not monitored [' + file + ']');
      }
      return;
    }
    var isDir = opts.monitored.get(file);
    opts.maybeFire('changed', file, isDir);
  };

  var onRename = function onRename(name) {
    var file = _path2['default'].join(dirpath, name);
    _fs2['default'].exists(file, function (added) {
      return (added ? onAdd : onDelete)(file);
    });
  };

  watcher.on('change', function (event, name) {
    if ((0, _ignore.ignore)(opts.ignore, _path2['default'].join(dirpath, name))) {
      return;
    }
    if (event === 'rename') {
      onRename(name);
    }
    if (event === 'change') {
      onChange(name);
    }
  });
  watcher.on('error', function (err) {
    return console.error('pryfs/watchDir - on [' + dirpath + '] ERROR ' + err);
  });
};
exports.watchDir = watchDir;