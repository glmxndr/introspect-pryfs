/*jshint expr:true*/
/*global describe, it*/
'use strict';

import _ from 'lodash';
import chai from 'chai';
var expect = chai.expect;

import { glob } from '../src/glob';

describe('glob', () => {
  it ('does not overmatch the dots', () => {
    expect(glob('/some/test.js','/some/test.js')).to.be.true;
    expect(glob('/some/test.js','/some/test_js')).to.be.false;
  });
  it ('works with **', () => {
    expect(glob('**/*.js','/test.js')).to.be.true;
    expect(glob('**/*.js','/any/path/to/test.js')).to.be.true;

    var match = glob('/some/**/*.js');
    expect(match('/some/test.js')).to.be.true;
    expect(match('/some/a/test.js')).to.be.true;
    expect(match('/some/a/b/c/d/test.js')).to.be.true;
    expect(match('/s__e/test.js')).to.be.false;
    expect(match('/sometest.js')).to.be.false;
    expect(match('/some/test.es6')).to.be.false;
  });
  it ('works with *', () => {
    var match = glob('/some/test*.js');
    expect(match('/some/test.js')).to.be.true;
    expect(match('/some/test1.js')).to.be.true;
    expect(match('/some/test1/2.js')).to.be.false;
  });
  it ('works with ?', () => {
    var match = glob('/some/test?.js');
    expect(match('/some/testx.js')).to.be.true;
    expect(match('/some/test1.js')).to.be.true;
    expect(match('/some/test__.js')).to.be.false;
  });
  it ('works with []', () => {
    var match = glob('/some/test.[ch]');
    expect(match('/some/test.c')).to.be.true;
    expect(match('/some/test.h')).to.be.true;
    expect(match('/some/test.ch')).to.be.false;
    expect(match('/some/test.')).to.be.false;
    expect(match('/some/test.x')).to.be.false;
  });
  it ('works with a single {,}', () => {
    var match = glob('/some/test.{js,es6}');
    expect(match('/some/test.js')).to.be.true;
    expect(match('/some/test.es6')).to.be.true;
    expect(match('/some/test.css')).to.be.false;
  });
  it ('works with a multiple {,}', () => {
    var match = glob('/some/test{.spec,}.{js,es6}');
    expect(match('/some/test.spec.js')).to.be.true;
    expect(match('/some/test.js')).to.be.true;
    expect(match('/some/test.spec.es6')).to.be.true;
    expect(match('/some/test.es6')).to.be.true;
    expect(match('/some/test.spec')).to.be.false;
  });

  it ('works with a a combination of all', () => {
    var match = glob('/??[bc3]/**/*{.spec,}.{js,es6}');
    expect(match('/lib/any/thing/.spec.js')).to.be.true;
    expect(match('/src/any/thing.es6')).to.be.true;
    expect(match('/src/any/thing.js')).to.be.true;
    expect(match('/etc/.js')).to.be.true;
    expect(match('/123/_.js')).to.be.true;

    expect(match('/1234/_.js')).to.be.false;
    expect(match('/123.js')).to.be.false;
    expect(match('/som_/test.es6')).to.be.false;
    expect(match('/lib/test.spec')).to.be.false;
    expect(match('/src/any/thing.css')).to.be.false;
    expect(match('/xxx/any/thing.js')).to.be.false;
  });
});
