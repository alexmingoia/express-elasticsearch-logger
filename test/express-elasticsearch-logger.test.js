/* eslint-disable no-unused-vars */
/* eslint-disable import/order */
/* eslint-disable no-unused-expressions */

const { expect } = require("chai")
const {
  requestHandler,
  errorHandler,
  skipLog,
} = require("../lib/express-elasticsearch-logger")
// const lib = process.env.JSCOV
//   ? require("../lib-cov/express-elasticsearch-logger")
//   : require("../lib/express-elasticsearch-logger")

const express = require("express")
const request = require("supertest")
const sinon = require("sinon")

describe("express-elasticsearch-logger module", function () {
  const config = {
    host: "http://localhost:9200",
  }

  const client = {
    index(params, cb) {
      expect(params.body).to.contain.keys([
        "duration",
        "request",
        "response",
        "@timestamp",
        "os",
        "process",
      ])
      expect(params.body.request).to.have.property("method", "GET", "env")
      expect(params.body.request).to.have.property("path", "/test")
      expect(params.body.request).to.have.property(
        "originalUrl",
        "/test?test=it",
      )
      cb()
    },
    indices: {
      exists(a, cb) {
        cb()
      },
      create(a, cb) {
        cb()
      },
    },
  }

  describe("requestHandler", function () {
    it("returns express logging middleware", function () {
      const middleware = requestHandler()
      expect(middleware).to.be.a("function")
    })

    it("logs requests", function (done) {
      const app = express()

      app.use(requestHandler(config, client)).get("/test", function (req, res) {
        res.sendStatus(200)
      })

      request(app).get("/test").query({ test: "it" }).expect(200).end(done)
    })
  })

  describe("errorHandler", function () {
    it("logs errors within requests", function (done) {
      const app = express()

      app
        .use(requestHandler(config, client))
        .get("/test", function (req, res, next) {
          next(new Error("test"))
        })
        .use(errorHandler)
        .use(function (err, req, res, next) {
          expect(err).to.have.property("message", "test")
          res.sendStatus(555)
        })

      request(app).get("/test").query({ test: "it" }).expect(555).end(done)
    })
  })

  describe("config", function () {
    it("should be able to config error whitelist", function (done) {
      const indexFunctionStub = sinon.spy()
      const clientTest = {
        index: indexFunctionStub,
        indices: {
          exists(a, cb) {
            cb()
          },
          create(a, cb) {
            cb()
          },
        },
      }
      const app = express()
      app
        .use(requestHandler(config, clientTest))
        .get("/test", function (req, res, next) {
          const e = new Error("test")
          e.name = "this-is-the-error"
          e.something = "should-not-see-this"
          next(e)
        })
        .use(errorHandler)
        .use(function (err, req, res, next) {
          res.sendStatus(555)
        })

      request(app)
        .get("/test")
        .query({ test: "it" })
        .expect(function () {
          expect(indexFunctionStub.calledOnce).to.be.true
          const params = indexFunctionStub.firstCall.args[0]
          expect(params.body).to.contain.keys(["error", "request"])
          expect(params.body.error).to.have.property(
            "name",
            "this-is-the-error",
          )
          expect(params.body.error).to.not.have.property("something")
        })
        .end(done)
    })
  })

  describe("skipLog", function () {
    it("should add skipLog to req", function (done) {
      const app = express()
      app.use(skipLog).get("/test", function (req, res) {
        expect(req).to.have.property("skipLog")
        res.sendStatus(200)
      })

      request(app).get("/test").expect(200).end(done)
    })
  })
})
