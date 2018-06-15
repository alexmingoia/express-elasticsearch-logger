/*!
 * express-elasticsearch-logger
 * https://github.com/alexmingoia/express-elasticsearch-logger
 */

'use strict';

var expect = require('chai').expect;
var lib = process.env.JSCOV ? require('../lib-cov/express-elasticsearch-logger') : require('../lib/express-elasticsearch-logger');
var express = require('express');
var request = require('supertest');

describe('express-elasticsearch-logger module', function () {
  var config = {
    host: 'http://localhost:9200'
  };

  var client = {
    index: function (params, cb) {
      expect(params.body).to.contain.keys([
        'env',
        'duration',
        'request',
        'response',
        'timestamp',
        'os',
        'process'
      ]);
      expect(params.body.request).to.have.property('method', 'GET');
      expect(params.body.request).to.have.property('path', '/test');
      expect(params.body.request).to.have.property('originalUrl', '/test?test=it');
      cb();
    }
  };

  describe('.requestHandler()', function () {
    it('returns express logging middleware', function () {
      var middleware = lib.requestHandler();

      expect(middleware).to.be.a('function');
    });

    it('logs requests', function (done) {
      var app = express();

      app
        .use(lib.requestHandler(config, client))
        .get('/test', function (req, res, next) {
          res.sendStatus(200);
        });

      request(app)
        .get('/test')
        .query({ test: 'it' })
        .expect(200)
        .end(done);
    });

  });

  describe('.errorHandler()', function () {
    it('logs errors within requests', function (done) {
      var app = express();

      app
        .use(lib.requestHandler(config, client))
        .get('/test', function (req, res, next) {
          next(new Error('test'));
        })
        .use(lib.errorHandler)
        .use(function (err, req, res, next) {
          expect(err).to.have.property('message', 'test');
          res.sendStatus(555);
        });

      request(app)
        .get('/test')
        .query({ test: 'it' })
        .expect(555)
        .end(done);
    });
  });

  describe('.skipLog()', function () {
    it('should add skipLog to req', function (done) {
      var app = express();
      app
        .use(lib.skipLog)
        .get('/test', function (req, res, next) {
          expect(req).to.have.property('skipLog')
          res.sendStatus(200);
        });

      request(app)
        .get('/test')
        .expect(200)
        .end(done)
    })
  });
});
