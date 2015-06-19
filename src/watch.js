'use strict';

import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { FsEvent } from './fsevent';
import { ignore } from './ignore';

export var watchDir = function (dirpath, stream, opts) {
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
    if (event === 'rename') { onRename(name); }
    if (event === 'change') { onChange(name); }
  });
  watcher.on('error', err =>
    console.error(`pryfs/watchDir - on [${dirpath}] ERROR ${err}`));
};
