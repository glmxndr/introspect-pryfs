/*jshint expr:true*/
/*global describe, context, it*/
'use strict';

import path from 'path';
import _ from 'lodash';
import chai from 'chai';
var expect = chai.expect;

import { FsEvent } from '../src/fsevent';

var evt = new FsEvent('changed', __filename, process.cwd());

describe('FsEvent', () => {
  describe('constructor', () => {
    it ('should set type, file and base properties', () => {
      expect(evt.type).to.equal('changed');
      expect(evt.file).to.equal(__filename);
      expect(evt.base).to.equal(process.cwd());
    });
  });
  describe('.relative', () => {
    it ('should provide the correct relative path', () => {
      expect(evt.relative()).to.equal('test/fsevent.spec.js');
    });
  });
  describe('.match', () => {
    context('with regexp', () => {
      it ('should match correctly', () => {
        expect(evt.match(/test\/fsevent\.spec\..*$/)).to.be.true;
        expect(evt.match(/test\/fsevent\.[^.]*$/)).to.be.false;
      });
    });
    context('with string (glob)', () => {
      it ('should match correctly', () => {
        expect(evt.match('test/*.spec.js')).to.be.true;
        expect(evt.match('test/*.es6')).to.be.false;
      });
    });
  });
  describe('.ext', () => {
    it ('should provide the file extension', () => {
      expect(evt.ext).to.equal('js');
    });
  });
  describe('.name', () => {
    it ('should provide the file name', () => {
      expect(evt.name).to.equal(path.parse(__filename).base);
    });
  });
  describe('.dir', () => {
    it ('should provide the file directory', () => {
      expect(evt.dir).to.equal(path.parse(__filename).dir);
    });
  });
  describe('.transform', () => {
    it ('should provide a promise with the transformed content', (done) => {
      var fn = data => (data.split(/\bimport\b/g).length);
      evt.transform(fn).then(n => {
        expect(n).to.equal(5);
        done();
      });
    });
  });
});
