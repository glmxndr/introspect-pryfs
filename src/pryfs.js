'use strict';

import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import stream from 'introspect-stream';
import { overload } from 'introspect-typed';

import { glob } from './glob';

var FsEvent = function (type, file, base) {
  if (!(this instanceof FsEvent)) { return new FsEvent(type, file, base); }
  _.extend(this, {file, type, base});
};

FsEvent.prototype = {
  toString () {
    return `FsEvent [${this.type} ${path.relative(this.base, this.file)}]`;
  }
};

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
  var onChange = name => {
    let file = path.join(dirpath, name);
    if (!opts.monitored.has(file)) { return; }
    stream.next(FsEvent('changed', file, opts.base));
  };
  var onRename = name => {
    let file = path.join(dirpath, name);
    fs.exists(file, added => {
      let deleted = !added;
      let type = added ? 'added' : 'deleted';
      if (deleted && !opts.monitored.has(file)) { return; }
      stream.next(FsEvent(type, file, opts.base));

      if (deleted) {
        opts.monitored.delete(file);
        return;
      } else {
        opts.monitored.add(file);
      }
      var statFn = opts.followSymLinks ? 'lstat' : 'stat';
      fs[statFn](file, (err, stats) => {
        if (err && !opts.quiet) {
          console.error(`pryfs/watchDir - ${statFn} on [${file}] ERROR ${err}`);
          return;
        }
        if (stats.isDirectory()) { watchDir(file, stream, opts); }
      });
    });
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
