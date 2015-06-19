'use strict';

import _ from 'lodash';
import { glob } from './glob';

export var ignore = function (patterns, filepath) {
  return patterns.reduce((ign, p) => {
    if (ign) { return true; }
    if (_.isString(p)) { return glob(p, filepath); }
    if (_.isRegExp(p)) { return !!filepath.match(p); }
    console.error(`pryfs/ignore - unknown pattern '${p}', ignored`);
    return false;
  }, false);
};
