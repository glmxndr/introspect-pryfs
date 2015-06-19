'use strict';

import path from 'path';
import _ from 'lodash';
import { glob } from './glob';
import { ignore } from './ignore';

export var FsEvent = function (type, file, base) {
  if (!(this instanceof FsEvent)) { return new FsEvent(type, file, base); }
  _.extend(this, {file, type, base});
};

FsEvent.prototype = {
  toString () { return `FsEvent [${this.type} ${this.relative()}]`; },

  relative () { return path.relative(this.base, this.file); },

  relativeTo (other) { return path.relative(other, this.file); },

  match (pattern) { return ignore([pattern], this.file); },

  get ext () { return path.parse(this.file).ext.replace(/^\./, ''); },

  get name () { return path.parse(this.file).base; },

  get dir () { return path.parse(this.file).dir; }
};
