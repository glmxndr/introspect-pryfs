'use strict';

import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { glob } from './glob';
import { ignore } from './ignore';

export var FsEvent = function (type, file, base, isDir) {
  if (!(this instanceof FsEvent)) { return new FsEvent(type, file, base, isDir); }
  _.extend(this, {file, type, base, isDir});
  this.isFile = !this.isDir;
};

FsEvent.prototype = {
  toString () { return `FsEvent [${this.type} ${this.relative()}]`; },

  relative () { return path.relative(this.base, this.file); },

  relativeTo (other) { return path.relative(other, this.file); },

  match (pattern) { return ignore([pattern], this.file); },

  /**
   * Read the content of the file in UTF-8  and applies the given function.
   * @return a promise of the result of the given function
   */
  transform (fn, encoding) {
    if (this.isDir) { return Promise.reject('this event is not on a file'); }
    encoding = encoding || 'utf-8';
    return new Promise((resolve, reject) => {
      fs.readFile(this.file, {encoding}, (err, data) => {
        if (err) { reject(err); }
        else {
          try { resolve(fn(data)); }
          catch(e) { reject(e); }
        }
      });
    });
  },

  read (encoding) { return this.transform(d => d, encoding); },

  get ext () { return path.parse(this.file).ext.replace(/^\./, ''); },

  get name () { return path.parse(this.file).base; },

  get dir () { return path.parse(this.file).dir; }
};
