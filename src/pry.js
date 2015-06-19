'use strict';

import _ from 'lodash';
import stream from 'introspect-stream';
import { overload } from 'introspect-typed';

import { walkPath } from './walk';

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
    walkPath(base, s, opts);
    return s;
  })
  .when([String], base => pry.default(base, {}))
  .when([Object], opts => pry.default(opts.base || process.cwd(), opts))
  .when([], () => pry.default(process.cwd(), {}));

pry()
