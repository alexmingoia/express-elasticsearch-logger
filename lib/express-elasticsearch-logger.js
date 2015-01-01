/*!
 * express-elasticsearch-logger
 * https://github.com/alexmingoia/express-elasticsearch-logger
 */

'use strict';

var defaults = require('defaults');
var elasticsearch = require('elasticsearch');
var os = require('os');

/**
 * @module express-elasticsearch-logger
 * @alias logger
 */

/**
 * Returns Express middleware configured according to given `options`.
 *
 * Middleware must be mounted before all other middleware to ensure accurate
 * capture of requests. The error handler must be mounted before other error
 * handler middleware.
 *
 * @example
 *
 * ```javascript
 * var express = require('express');
 * var elasticsearchLogger = require('express-elasticsearch-logger');
 *
 * var app = express();
 *
 * app
 *   .use(elasticsearchLogger.requestHandler({
 *     host: 'http://localhost:9200'
 *   })
 *   .get('/', function (req, res, next) {
 *     res.sendStatus(204);
 *   })
 *   .use(elasticsearchLogger.errorHandler);
 * ```
 *
 * @param {Object} config elasticsearch configuration
 * @param {String=} config.index elasticsearch index (default: log_YEAR_MONTH)
 * @param {String=} config.type elasticsearch document type (default: request)
 * @param {Object} config.whitelist
 * @param {Array.<String>} config.whitelist.request request properties to log
 * @param {Array.<String>} config.whitelist.response response properties to log
 * @param {elasticsearch.Client=} client elasticsearch client
 * @returns {elasticsearchLoggerMiddleware} express middleware
 */
exports.requestHandler = function (config, client) {
  config = defaults(config, {
    index: 'log_' + (new Date()).toISOString().substr(0, 7),
    type: 'request',
    whitelist: {
      request: [
        'httpVersion',
        'headers',
        'method',
        'originalUrl',
        'path',
        'query'
      ],
      response: [
        'statusCode',
        'took'
      ]
    }
  });

  client = client || (new elasticsearch.Client(config));

  /**
   * Logs request and response information to ElasticSearch.
   *
   * @param {express.Request} req
   * @param {express.Response} res
   * @param {express.Request.next} next
   */
  return function elasticsearchLoggerMiddleware(req, res, next) {
    var end = res.end;
    var start = Date.now();

    /**
     * Document indexed with ElasticSearch. `request` and `response` properties
     * are included if they are whitelisted by `config.whitelist`.
     *
     * @property {String} env defaults to "development"
     * @property {Error=} error error object passed to `next()`
     * @property {Number} duration milliseconds between request and response
     * @property {Object} request
     * @property {String} request.httpVersion
     * @property {Object} request.headers
     * @property {String} request.method
     * @property {String} request.originalUrl
     * @property {String} request.path
     * @property {Object} request.query
     * @property {Object} response
     * @property {Number} response.statusCode
     * @property {Object} os
     * @property {Number} os.totalmem OS total memory in bytes
     * @property {Number} os.freemem OS free memory in bytes
     * @property {Array.<Number>} os.loadavg Array of 5, 10, and 15 min averages
     * @property {Object} process
     * @property {Number} process.memoryUsage process memory in bytes
     * @property {String} timestamp ISO time of request
     * @type {Object}
     * @memberof module:express-elasticsearch-logger
     */
    var document = {
      env: process.env.NODE_ENV || 'development',
      request: {},
      timestamp: (new Date()).toISOString()
    };

    config.whitelist.request.forEach(function (key) {
      document.request[key] = req[key];
    });

    // monkey patch Response#end to capture request time
    res.end = function () {
      res.end = end;

      end.apply(res, arguments);

      document.response = {};
      document.duration = Date.now() - start;

      if (res.error) {
        document.error = res.error;
      }

      document.os = {
        totalmem: os.totalmem(), // bytes
        freemem: os.freemem(), // bytes
        loadavg: os.loadavg() // array of 5, 10, and 15 min averages
      };

      document.process = {
        memory: process.memoryUsage() // bytes
      };

      config.whitelist.response.forEach(function (key) {
        document.response[key] = res[key];
      });

      client.index({
        index: config.index,
        type: config.type,
        body: document
      }, function (error, response) {
        if (error) {
          console.error(error);
        }
      });
    };

    next();
  };
};

/**
 * Error handler middleware exposes error to `Response#end`
 *
 * This middleware is used in combination with
 * {@link module:logger.requestHandler} to capture request errors.
 *
 * @param {Error} err
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.Request.next} next
 */
exports.errorHandler = function (err, req, res, next) {
  res.error = err;
  next(err);
}
