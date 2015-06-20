'use strict';

import path from 'path';
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

var buildFn = defaults => {
  var fn = overload(
    [String, Object],
    (base,   opts)   => {
      // Sanitize input
      if (!path.isAbsolute(base)) { base = path.join(process.cwd(), base); }
      opts = _.defaults(opts || {}, defaults, { base });
      opts.monitored = new Set();
      opts.quiet = opts.verbose ? false : opts.quiet;

      // Create the stream
      var s = stream('pryFs');
      if (!opts.quiet) { s.log(); }

      // Create the walking promise
      var promise = walkPath(base, s, opts);
      if (!opts.watch) { promise.then(() => s.end()); }

      // Attach the pry-relative data to the stream
      s.pry = {promise, base, opts};
      return s;
    })
    .when([String], base => fn.default(base, {}))
    .when([Object], opts => fn.default(opts.base || process.cwd(), opts))
    .when([], () => fn.default(process.cwd(), {}));
  return fn;
};

export var pry = buildFn(PRY_DEFAULTS);

pry.walk  = buildFn(_.defaults({watch: false}, PRY_DEFAULTS));
pry.watch = buildFn(_.defaults({walk:  false}, PRY_DEFAULTS));
