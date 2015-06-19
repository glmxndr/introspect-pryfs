'use strict';

import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import stream from 'introspect-stream';
import { overload } from 'introspect-typed';

import { glob } from './glob';
import { FsEvent } from './fsevent';

var ignore = function (patterns, filepath) {
  return patterns.reduce((ign, p) => {
    if (ign) { return true; }
    if (_.isString(p)) { return glob(p, filepath); }
    if (_.isRegExp(p)) { return !!filepath.match(p); }
    console.error(`pryfs/ignore - unknown pattern '${p}', ignored`);
    return false;
  }, false);
};

var watchDir = function (dirpath, stream, opts) {
  if (ignore(opts.ignore, dirpath)) { return; }
  let watcher = fs.watch(dirpath, {persistent: opts.persistent, recursive: false});

  var onAdded = file => {
    // If the file is already monitored, it was not created...
    // so do nothing, since it was probably a glitch from fs.watch
    if (opts.monitored.has(file)) { return; }

    var statFn = opts.followSymLinks ? 'lstat' : 'stat';
    fs[statFn](file, (err, stats) => {
      if (err && !opts.quiet) {
        console.error(`pryfs/watchDir - ${statFn} on [${file}] ERROR ${err}`);
        return;
      }

      // Check that the file was really created by checking its creation time.
      // If the file was created more than 1 second ago, the current event
      // results from a glitch in multiple fs.watch watchers.
      var creationTime = stats.birthtime.getTime();
      var now = new Date().getTime();
      var diff = now - creationTime;
      if (diff > 1000) { return; }

      opts.monitored.add(file);
      stream.next(FsEvent('added', file, opts.base));

      if (opts.recursive && stats.isDirectory()) {
        watchDir(file, stream, opts);
      }
    });
  };

  var onDeleted = file => {
    if (!opts.monitored.has(file)) { return; }
    opts.monitored.delete(file);
    stream.next(FsEvent('deleted', file, opts.base));
  };

  var onChange = name => {
    let file = path.join(dirpath, name);
    if (!opts.monitored.has(file)) { return; }
    stream.next(FsEvent('changed', file, opts.base));
  };
  
  var onRename = name => {
    let file = path.join(dirpath, name);
    fs.exists(file, added => (added ? onAdded : onDeleted)(file));
  };

  watcher.on('change', function (event, name) {
    console.log(arguments);
    if (event === 'rename') { onRename(name); }
    if (event === 'change') { onChange(name); }
  });
  watcher.on('error', err =>
    console.error(`pryfs/watchDir - on [${dirpath}] ERROR ${err}`));
};

var pryPath;
var walkDir = function (filepath, stream, opts) {
  if (ignore(opts.ignore, filepath)) { return; }
  fs.readdir(filepath, function (err, files) {
    if (err && !opts.quiet) {
      console.error(`pryfs/walkDir - readdir on [${filepath}] ERROR ${err}`);
      return;
    }
    (files || []).forEach(f => {
      let subpath = path.join(filepath, f);
      pryPath(subpath, stream, opts);
    });
  });
};

pryPath = function (file, stream, opts) {
  if (ignore(opts.ignore, file)) { return; }
  var statFn = opts.followSymLinks ? 'lstat' : 'stat';
  fs[statFn](file, (err, stats) => {
    if (err && !opts.quiet) {
      console.error(`pryfs/pryPath - lstat on [${file}] ERROR ${err}`);
      return;
    }
    opts.monitored.add(file);
    if (opts.walk) {
      stream.next(FsEvent('visited', file, opts.base));
    }
    if (stats.isDirectory()) {
      if (opts.watch) { watchDir(file, stream, opts); }
      if (opts.recursive) { walkDir(file, stream, opts); }
    }
  });

};

const PRY_DEFAULTS = {
  quiet: false,
  ignore: ['.*{ignore,rc}', '.{svn,git}', 'node_modules'],
  walk: true,
  watch: true,
  persistent: true,
  recursive: true,
  followSymLinks: true
};

export var pry = overload(
  [String, Object],
  (base,   opts)   => {
    opts = _.defaults(opts || {}, PRY_DEFAULTS, { base });
    opts.monitored = new Set();
    var s = stream('pryFs').log();
    pryPath(base, s, opts);
    return s;
  })
  .when([String], base => pry.default(base, {}))
  .when([Object], opts => pry.default(opts.base || process.cwd(), opts))
  .when([], () => pry.default(process.cwd(), {}));

pry();
