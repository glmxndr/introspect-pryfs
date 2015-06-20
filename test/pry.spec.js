/*jshint expr:true*/
/*global describe, context, it*/
'use strict';

import fs from 'fs-extra';
import path from 'path';
import _ from 'lodash';
import chai from 'chai';
const expect = chai.expect;

import { pry } from '../';


describe('pry', () => {
  it ('should provide promise, base path and opts', () => {
    let s = pry.walk('tmp', {quiet: true});
    expect(s.pry.base).to.equal(path.join(process.cwd(), 'tmp'));
    expect(s.pry.promise).to.be.truthy;
    expect(s.pry.opts).to.be.truthy;
  });

  it ('should walk and watch the file system by default', (done) => {
    fs.removeSync('tmp/test-pry');
    fs.ensureDirSync('tmp/test-pry/sub');

    let results = {};
    let s = pry('tmp/test-pry', {quiet: true});
    s.onNext(evt => {
      if (!results[evt.type]) { results[evt.type] = []; }
      results[evt.type].push(evt.relative());
    });
    s.onEnd(() => {
      fs.removeSync('tmp/test-pry');
      done();
    });

    setTimeout(() => {
      fs.ensureFileSync('tmp/test-pry/.git/test');
      fs.ensureFileSync('tmp/test-pry/file1');
      fs.ensureFileSync('tmp/test-pry/file2');
      //fs.ensureDirSync('tmp/test-pry/sub1/');
      fs.ensureFileSync('tmp/test-pry/sub1/sub1/sub1/file1');
      fs.ensureDirSync('tmp/test-pry/sub2/');
      fs.remove('tmp/test-pry/sub1/');
    }, 10);

    setTimeout(() => {
      expect(s.ended()).to.be.false;
      expect(results.visited.length).to.equal(2);
      expect(results.added.length).to.equal(7);
      expect(results.deleted.length).to.equal(2);
      s.end();
    }, 50);

  });
});
