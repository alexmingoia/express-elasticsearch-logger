/* eslint-disable no-console */
/*!
 * express-elasticsearch-logger
 * https://github.com/alexmingoia/express-elasticsearch-logger
 */

const elasticsearch = require("@elastic/elasticsearch")
const os = require("os")
const cloneDeep = require("clone-deep")
const {
  deepMerge,
  censor,
  indexDateHalfYear,
  indexDateQuarter,
  indexDateMonth,
} = require("./helper")
const { ensureIndexExists, log } = require("./elasticsearch")
const {
  defaultCensor,
  defaultMapping,
  defaultWhiteList,
  indexSettings,
} = require("./config")

const SUFFIX_MAP = {
  m: indexDateMonth,
  month: indexDateMonth,
  M: indexDateMonth,
  q: indexDateQuarter,
  quarter: indexDateQuarter,
  Q: indexDateQuarter,
  h: indexDateHalfYear,
  halfYear: indexDateHalfYear,
  H: indexDateHalfYear,
}
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
 * @param {Boolean} config.includeDefault include default whitelist and censor the the given config
 * @param {String?} config.indexPrefix elasticsearch index prefix for running index
 * @param {String?} config.indexSuffixBy elasticsearch index suffix for running index, one of m M <Monthly> q Q <Quarterly> h H <Bi-annually>
 * @param {Object?} config.indexSettings settings in the mapping to be created
 * @param {elasticsearch.Client=} client elasticsearch client
 * @returns {elasticsearchLoggerMiddleware} express middleware
 */
exports.requestHandler = function (config = {}, client) {
  /** Caching */
  const createdIndexes = new Set()
  const isIndexCreated = (name) => createdIndexes.has(name)
  const setIndexCreated = (name) => createdIndexes.add(name)

  /** Lazy Evaluation Index Name */
  const suffixFn = SUFFIX_MAP[config.indexSuffixBy] || indexDateHalfYear
  const getIndexName = () =>
    `${config.indexPrefix || "log"}_${suffixFn(new Date())}`
  const mergeArray = config.includeDefault !== false
  const cfg = deepMerge(
    config,
    {
      node: config.host || "localhost:9200", // elastic new client use node
      whitelist: defaultWhiteList,
      censor: defaultCensor,
      mapping: defaultMapping,
      indexSettings,
    },
    mergeArray,
  )
  const esClient = client || new elasticsearch.Client(cfg)

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
    const indexName = config.index || getIndexName()
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
      if (isIndexCreated(indexName)) {
        log(doc, indexName, esClient)
      } else {
        ensureIndexExists(
          {
            index: indexName,
            settings: cfg.indexSettings,
            mapping: cfg.mapping,
          },
          esClient,
          (error) => {
            if (error) {
              console.error(error)
              return
            }
            setIndexCreated(indexName)
            log(doc, indexName, esClient)
          },
        )
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
