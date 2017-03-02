/*!
 * express-elasticsearch-logger
 * https://github.com/alexmingoia/express-elasticsearch-logger
 */

'use strict';

var elasticsearch = require('elasticsearch');
var os = require('os');
var cloneDeep = require('clone-deep');

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
 * var logger = require('express-elasticsearch-logger');
 *
 * var app = express();
 *
 * app
 *   .use(logger.requestHandler({
 *     host: 'http://localhost:9200'
 *   })
 *   .get('/', function (req, res, next) {
 *     res.sendStatus(204);
 *   })
 *   .use(logger.errorHandler);
 * ```
 *
 * @param {Object} config elasticsearch configuration
 * @param {String=} config.index elasticsearch index (default: log_YEAR_MONTH)
 * @param {String=} config.type elasticsearch request type (default: request)
 * @param {Object} config.whitelist
 * @param {Array.<String>} config.whitelist.request request properties to log
 * @param {Array.<String>} config.whitelist.response response properties to log
 * @param {Array.<String>} config.censor list of request body properties to censor
 * @param {elasticsearch.Client=} client elasticsearch client
 * @returns {elasticsearchLoggerMiddleware} express middleware
 */
exports.requestHandler = function (config, client) {
  config = deepMerge(config || {}, {
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
    },
    censor: [],
    mapping: {
      properties: {
        env: {
          type: 'string',
          index: 'not_analyzed'
        },
        duration: {
          type: 'integer'
        },
        '@timestamp': {
          type: 'date'
        },
        request: {
          properties: {
            httpVersion: {
              type: 'string',
              index: 'not_analyzed'
            },
            method: {
              type: 'string',
              index: 'not_analyzed'
            },
            originalUrl: {
              type: 'string',
              index: 'not_analyzed'
            },
            route: {
              properties: {
                path: {
                  type: 'string',
                  index: 'not_analyzed'
                }
              }
            },
            path: {
              type: 'string',
              index: 'not_analyzed'
            },
            query: {
              type: 'object',
              enabled: false // prevent indexing and auto-mapping
            },
            body: {
              type: 'object',
              enabled: false // prevent indexing and auto-mapping
            }
          }
        },
        response: {
          properties: {
            statusCode: {
              type: 'integer'
            }
          }
        },
        process: {
          properties: {
            totalmem: {
              type: 'integer'
            },
            freemem: {
              type: 'integer'
            },
            loadavg: {
              type: 'integer'
            }
          }
        },
        error: {
          properties: {
            message: {
              type: 'string',
              index: 'analyzed',
              analyzer: 'standard'
            },
            stack: {
              type: 'string',
              index: 'not_analyzed'
            },
            type: {
              type: 'string',
              index: 'not_analyzed'
            }
          }
        }
      }
    }
  });

  client = client || (new elasticsearch.Client(config));

  client.indexExists = false;

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
     * @property {String} request.route.path
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
     * @property {String} @timestamp ISO time of request
     * @type {Object}
     * @memberof module:express-elasticsearch-logger
     */
    var request = {
      env: process.env.NODE_ENV || 'development',
      request: {},
      '@timestamp': (new Date()).toISOString()
    };

    config.whitelist.request.forEach(function (key) {
      if (typeof req[key] === 'object') {
        request.request[key] = cloneDeep(req[key]);
      } else {
        request.request[key] = req[key];
      }
    });

    if (request.request.body) {
      config.censor.forEach(function (key) {
        if (typeof request.request.body[key] !== 'undefined') {
          request.request.body[key] = '**CENSORED**';
        }
      });
    }

    // monkey patch Response#end to capture request time
    res.end = function () {
      res.end = end;

      end.apply(res, arguments);

      request.response = {};
      request.duration = Date.now() - start;

      if (req.route && req.route.path) {
        request.request.route = {
          path: req.route.path
        };
      }

      if (res.error) {
        request.error = {};

        Object.getOwnPropertyNames(res.error).forEach(function (key) {
          request.error[key] = res.error[key];
        });
      }

      request.os = {
        totalmem: os.totalmem(), // bytes
        freemem: os.freemem(), // bytes
        loadavg: os.loadavg() // array of 5, 10, and 15 min averages
      };

      request.process = {
        memory: process.memoryUsage() // bytes
      };

      config.whitelist.response.forEach(function (key) {
        request.response[key] = res[key];
      });

      if (client.indexExists) {
        log(request, config, client);
      } else {
        ensureIndexExists(config, client, function (error) {
          if (error) {
            return console.error(error);
          }

          client.indexExists = true;

          log(request, config, client);
        });
      }
    };

    next();
  };
};

/**
 * Error handler middleware exposes error to `Response#end`
 *
 * This middleware is used in combination with
 * {@link module:express-elasticsearch-logger.requestHandler} to capture request
 * errors.
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

/**
 * Log `request` to elasticsearch.
 *
 * @param {Object} config
 * @param {elasticsearch.Client} client
 * @param {request} request
 * @private
 */
function log (request, config, client) {
  client.index({
    index: config.index,
    type: config.type,
    body: request
  }, function (error, response) {
    if (error) {
      console.error(error);
    }
  });
}

/**
 * Ensure log index and request mapping exist.
 *
 * @param {Object} config
 * @param {elasticsearch.Client} client
 * @param {Function} done
 * @private
 */
function ensureIndexExists (config, client, done) {
  var mappings = {};
  mappings[config.type] = config.mapping;

  client.indices.exists({
    index: config.index
  }, function (err, exists) {
    if (err) return done(err);

    if (exists) {
      client.indices.putMapping({
        index: config.index,
        type: config.type,
        ignoreConflicts: true,
        body: config.mapping
      }, done);
    } else {
      client.indices.create({
        index: config.index,
        body: {
          mappings: mappings
        }
      }, done);
    }
  });
}

function deepMerge(b, a) {
  Object.keys(b).forEach(function (key) {
    if (typeof b[key] === 'object') {
      a[key] = deepMerge(b[key], (typeof a[key] === 'object' ? a[key] : {}));
    } else {
      a[key] = b[key];
    }
  });
  return a;
}
