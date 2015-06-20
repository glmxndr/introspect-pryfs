'use strict';

import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { FsEvent } from './fsevent';
import { ignore } from './ignore';

// This method deals with file which would have been added to a recently monitored
// folder which had content before we could attach a watcher to it.
var onAddSub = (base, stream, opts) => {
  fs.readdir(base, (err, files) => {
    files.forEach(f => {
      let subfile = path.join(base, f);
      if (opts.monitored.has(subfile)) { return; }
      opts.monitored.add(subfile);
      stream.next(FsEvent('added', subfile, opts.base));
      if (opts.recursive) {
        var statFn = opts.followSymLinks ? 'lstat' : 'stat';
        fs[statFn](subfile, (err, stats) => {
          if (stats.isDirectory()) {
            onAddSub(subfile, stream, opts);
          }
        });
      }
    });
  });
};

export var watchDir = function (dirpath, stream, opts) {
  if (ignore(opts.ignore, dirpath)) { return; }

  let watcher = fs.watch(dirpath, {persistent: opts.persistent, recursive: false});
  stream.onEnd(() => watcher.close());

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

      opts.monitored.add(file);
      stream.next(FsEvent('added', file, opts.base));

      if (stats.isDirectory()) {
        onAddSub(file, stream, opts);
        if (opts.recursive) {
          watchDir(file, stream, opts);
        }
      }
    });
  };

  var onDelete = file => {
    if (!opts.monitored.has(file)) {
      if (opts.verbose) { console.log(`pryFs/watchDir/onDelete - not monitored [${file}]`); }
      return;
    }
    opts.monitored.delete(file);
    stream.next(FsEvent('deleted', file, opts.base));
  };

  var onChange = name => {
    let file = path.join(dirpath, name);
    if (!opts.monitored.has(file)) {
      if (opts.verbose) { console.log(`pryFs/watchDir/onChange - not monitored [${file}]`); }
      return;
    }
    stream.next(FsEvent('changed', file, opts.base));
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
