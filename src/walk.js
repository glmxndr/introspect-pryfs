'use strict';

import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { FsEvent } from './fsevent';
import { ignore } from './ignore';
import { watchDir } from './watch';

export var walkPath;
var walkDir = function (filepath, stream, opts) {
  if (ignore(opts.ignore, filepath)) { return; }
  fs.readdir(filepath, function (err, files) {
    if (err && !opts.quiet) {
      console.error(`pryfs/walkDir - readdir on [${filepath}] ERROR ${err}`);
      return;
    }
    (files || []).forEach(f => {
      let subpath = path.join(filepath, f);
      walkPath(subpath, stream, opts);
    });
  });
};

walkPath = function (file, stream, opts) {
  if (ignore(opts.ignore, file)) { return; }
  var statFn = opts.followSymLinks ? 'lstat' : 'stat';
  fs[statFn](file, (err, stats) => {
    if (err && !opts.quiet) {
      console.error(`pryfs/walkPath - lstat on [${file}] ERROR ${err}`);
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
