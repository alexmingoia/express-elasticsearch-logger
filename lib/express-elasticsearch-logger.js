/* eslint-disable no-console */
/*!
 * express-elasticsearch-logger
 * https://github.com/alexmingoia/express-elasticsearch-logger
 */

const elasticsearch = require("elasticsearch")
const os = require("os")
const cloneDeep = require("clone-deep")
const { deepMerge, censor } = require("./helper")
const { ensureIndexExists, log } = require("./elasticsearch")
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
 * const express = require('express');
 * const logger = require('express-elasticsearch-logger');
 *
 * const app = express();
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
  const cfg = deepMerge(config || {}, {
    index: `log_${new Date().toISOString().substr(0, 7)}`,
    type: "request",
    whitelist: {
      request: [
        "httpVersion",
        "headers",
        "method",
        "originalUrl",
        "path",
        "query",
      ],
      response: ["statusCode", "took"],
      error: ["message", "stack", "type", "name", "code"],
    },
    censor: [],
    mapping: {
      properties: {
        env: {
          type: "keyword",
          index: true,
        },
        duration: {
          type: "integer",
        },
        "@timestamp": {
          type: "date",
        },
        request: {
          properties: {
            httpVersion: {
              type: "keyword",
              index: true,
            },
            method: {
              type: "keyword",
              index: true,
            },
            originalUrl: {
              type: "keyword",
              index: true,
            },
            route: {
              properties: {
                path: {
                  type: "keyword",
                  index: true,
                },
              },
            },
            path: {
              type: "keyword",
              index: true,
            },
            query: {
              type: "object",
              enabled: false, // prevent indexing and auto-mapping
            },
            body: {
              type: "object",
              enabled: false, // prevent indexing and auto-mapping
            },
          },
        },
        response: {
          properties: {
            statusCode: {
              type: "integer",
            },
          },
        },
        process: {
          properties: {
            totalmem: {
              type: "integer",
            },
            freemem: {
              type: "integer",
            },
            loadavg: {
              type: "integer",
            },
          },
        },
        error: {
          properties: {
            message: {
              type: "text",
              index: true,
              analyzer: "standard",
            },
            stack: {
              type: "keyword",
              index: true,
            },
            type: {
              type: "keyword",
              index: true,
            },
          },
        },
      },
    },
  })

  const esClient = client || new elasticsearch.Client(cfg)
  esClient.indexExists = false

  /**
   * Logs request and response information to ElasticSearch.
   *
   * @param {express.Request} req
   * @param {express.Response} res
   * @param {express.Request.next} next
   */
  return (req, res, next) => {
    const { end } = res
    const start = Date.now()

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
    const doc = {
      env: process.env.NODE_ENV || "development",
      request: {},
      "@timestamp": new Date().toISOString(),
    }

    cfg.whitelist.request.forEach(function (key) {
      if (typeof req[key] === "object") {
        doc.request[key] = cloneDeep(req[key])
      } else {
        doc.request[key] = req[key]
      }
    })

    if (doc.request.body) {
      censor(doc.request.body, cfg.censor)
    }

    // monkey patch Response#end to capture request time
    res.end = function (...args) {
      res.end = end
      end.apply(res, args)

      if (req.skipLog) {
        return
      }

      doc.response = {}
      doc.duration = Date.now() - start

      if (req.route && req.route.path) {
        doc.request.route = {
          path: req.route.path,
        }
      }

      if (res.error) {
        doc.error = {}

        Object.getOwnPropertyNames(res.error).forEach(function (key) {
          if (cfg.whitelist.error.includes(key)) {
            doc.error[key] = res.error[key]
          }
        })
      }

      doc.os = {
        totalmem: os.totalmem(), // bytes
        freemem: os.freemem(), // bytes
        loadavg: os.loadavg(), // array of 5, 10, and 15 min averages
      }

      doc.process = {
        memory: process.memoryUsage(), // bytes
      }

      cfg.whitelist.response.forEach(function (key) {
        doc.response[key] = res[key]
      })

      if (esClient.indexExists) {
        log(doc, cfg, esClient)
      } else {
        ensureIndexExists(cfg, esClient, (error) => {
          if (error) {
            console.error(error)
            return
          }
          esClient.indexExists = true
          log(doc, cfg, esClient)
        })
      }
    }

    next()
  }
}

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
  res.error = err
  next(err)
}

/**
 * This middleware will mark for skip log
 * use this middleware for endpoint that is called too often and did not need to log
 * like healthcheck
 *
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.Request.next} next
 */
exports.skipLog = function (req, res, next) {
  req.skipLog = true
  next()
}
