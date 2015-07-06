'use strict';

import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { FsEvent } from './fsevent';
import { ignore } from './ignore';

// This method deals with file which would have been added to a recently monitored
// folder which had content before we could attach a watcher to it.
var onAddSub = (base, opts) => {
  fs.readdir(base, (err, files) => {
    if (err) {
      if (!opts.quiet) { console.error(`pryfs/onAddSub - readdir on [${base}] ERROR ${err}`); }
      return;
    }
    files.forEach(f => {
      let subfile = path.join(base, f);
      if (opts.monitored.has(subfile)) { return; }
      var statFn = opts.followSymLinks ? 'lstat' : 'stat';
      fs[statFn](subfile, (err, stats) => {
        if (err) {
          if (!opts.quiet) { console.error(`pryfs/onAddSub - lstat on [${subfile}] ERROR ${err}`); }
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

export var watchDir = function (dirpath, opts) {
  if (ignore(opts.ignore, dirpath)) { return; }

  let watcher = fs.watch(dirpath, {persistent: opts.persistent, recursive: false});
  opts.stream.onEnd(() => watcher.close());

  var onAdd = file => {
    // If the file is already monitored, it was not created...
    // so do nothing, since it was probably a glitch from fs.watch
    if (opts.monitored.has(file)) {
      if (opts.verbose) { console.log(`pryFs/watchDir/onAdd - already monitored [${file}]`); }
      return;
    }

    var statFn = opts.followSymLinks ? 'lstat' : 'stat';
    fs[statFn](file, (err, stats) => {
      if (err) {
        if (!opts.quiet) { console.error(`pryfs/watchDir/onAdd - ${statFn} on [${file}] ERROR ${err}`); }
        return;
      }

      // Check that the file was really created by checking its creation time.
      // If the file was created more than 1 second ago, the current event
      // results from a glitch in multiple fs.watch watchers.
      var creationTime = stats.birthtime.getTime();
      var now = new Date().getTime();
      var diff = now - creationTime;
      if (diff > 1000) { return; }

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

  var onDelete = file => {
    if (!opts.monitored.has(file)) {
      if (opts.verbose) { console.log(`pryFs/watchDir/onDelete - not monitored [${file}]`); }
      return;
    }
    var isDir = opts.monitored.get(file);
    opts.monitored.delete(file);
    opts.maybeFire('deleted', file, isDir);
  };

  var onChange = name => {
    let file = path.join(dirpath, name);
    if (!opts.monitored.has(file)) {
      if (opts.verbose) { console.log(`pryFs/watchDir/onChange - not monitored [${file}]`); }
      return;
    }
    var isDir = opts.monitored.get(file);
    opts.maybeFire('changed', file, isDir);
  };

  var onRename = name => {
    let file = path.join(dirpath, name);
    fs.exists(file, added => (added ? onAdd : onDelete)(file));
  };

  watcher.on('change', function (event, name) {
    if (ignore(opts.ignore, path.join(dirpath, name))) { return; }
    if (event === 'rename') { onRename(name); }
    if (event === 'change') { onChange(name); }
  });
  watcher.on('error', err =>
    console.error(`pryfs/watchDir - on [${dirpath}] ERROR ${err}`));
};
