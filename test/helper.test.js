'use strict';

var expect = require('chai').expect;
var lib = process.env.JSCOV ? require('../lib-cov/express-elasticsearch-logger') : require('../lib/express-elasticsearch-logger');
var express = require('express');
var request = require('supertest');

describe('helper module', function () {
  describe('methods', function() {
    context('#test', function() {
      it('test method', function() {
        expect(true).to.be.true
      })
    })
  })
})
