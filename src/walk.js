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
  var promise = new Promise((resolve, reject) => {
    fs.readdir(filepath, function (err, files) {
      if (err) {
        if (!opts.quiet) { console.error(`pryfs/walkDir - readdir on [${filepath}] ERROR ${err}`); }
        reject(err);
        return;
      }
      let ps = [];
      (files || []).forEach(f => {
        let subpath = path.join(filepath, f);
        if (ignore(opts.ignore, subpath)) { return; }
        let p = walkPath(subpath, stream, opts);
        ps.push(p);
      });
      Promise.all(ps).then(() => resolve());
    });
  });
  return promise;
};

walkPath = function (file, stream, opts) {
  if (ignore(opts.ignore, file)) { return Promise.resolve(); }
  var statFn = opts.followSymLinks ? 'lstat' : 'stat';
  var promise = new Promise((resolve, reject) => {
    fs[statFn](file, (err, stats) => {
      if (err && !opts.quiet) {
        if (!opts.quiet) { console.error(`pryfs/walkPath - lstat on [${file}] ERROR ${err}`); }
        reject(err);
        return;
      }
      opts.monitored.add(file);
      if (opts.walk) {
        stream.next(FsEvent('visited', file, opts.base));
      }
      if (stats.isDirectory()) {
        if (opts.watch) { watchDir(file, stream, opts); }
        if (opts.recursive) {
          walkDir(file, stream, opts).then(() => { resolve(); });
        }
        else { resolve(); }
      } else {
        resolve();
      }
    });
  });
  return promise;
};
