'use strict';

var expect = require('chai').expect;
var lib = process.env.JSCOV ? require('../lib-cov/express-elasticsearch-logger') : require('../lib/express-elasticsearch-logger');
var express = require('express');
var request = require('supertest');
var helper = require('../lib/helper');

var cencorString = '**CENSORED**';

describe('helper module', function () {
  describe('methods', function() {
    context('#_censorDeep', function() {
      it('should be able to censor out 1 level config', function() {
        var original = {
          a: 'should censor me', b: null, c: 'hello', d: 'haha'
        };
        var newObj = helper._censorDeep(original, 'a'.split('.'));
        expect(newObj).to.deep.equal({a: cencorString, b: null, c: 'hello', d: 'haha'});
      });

      it('should be able to censor out multi level config', function() {
        var original = {
          a: {
            aa: { aaa: 'keep me out' }
          }, b: null, c: 'hello', d: 'haha'
        };
        var newObj = helper._censorDeep(original, 'a.aa.aaa'.split('.'));
        expect(newObj).to.have.deep.property('a.aa.aaa', cencorString);
      });

      it('should remain the same object if the config is at fault', function() {
        var original = {
          a: {
            aa: { aaa: 'keep me out' }
          }, b: null, c: 'hello', d: 'haha'
        };
        var newObj = helper._censorDeep(original, 'a.azd.ewx.1.2'.split('.'));
        expect(newObj).to.have.deep.equal(original);
      });
    });
    context('#censor', function() {
      it('should be able to censor deep config', function() {
        var original = {z: {zz: {zzz: 'take_me_out'}}};
        helper.censor(original, ['z.zz.zzz']);
        expect(original).to.have.deep.property('z.zz.zzz', cencorString);
      });
      it('should be able to censor 1 level config', function() {
        var original = {z: {zz: {zzz: 'take_me_out'}}};
        helper.censor(original, ['z']);
        expect(original).to.have.deep.property('z', cencorString);
      });

      it('should be able to censor multiple configs', function() {
        var original = {z: {zz: {zzz: 'take_me_out'}}, b: 'this is to be censored too', c: {y: 'out too', x: 'remain cool'}};
        helper.censor(original, ['z.zz.zzz', 'b', 'c.y']);
        expect(original).to.deep.equal(
          {z: {zz: {zzz: cencorString}}, b: cencorString, c: {y: cencorString, x: 'remain cool'}}
        );
      });
    })
  });
});
