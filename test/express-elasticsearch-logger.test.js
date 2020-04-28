/* eslint-disable no-unused-vars */
/* eslint-disable import/order */
/* eslint-disable no-unused-expressions */

const { expect } = require("chai")
const {
  requestHandler,
  errorHandler,
  skipLog,
} = require("../lib/express-elasticsearch-logger")

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

describe("elasticsearch index creation", () => {
  const stubESIndex = sinon.stub().callsArg(1)
  const stubESIndicesExists = sinon.stub().callsArg(1)
  const stubESCreate = sinon.stub().callsArg(1)
  const config = {
    host: "http://localhost:9200",
  }
  const getClient = () => ({
    index: stubESIndex,
    indices: {
      exists: stubESIndicesExists,
      create: stubESCreate,
    },
  })
  const callServer = async (cfg = config, client) => {
    const app = express()
    app
      .use(requestHandler(cfg, client || getClient()))
      .get("/test", function (req, res) {
        res.sendStatus(200)
      })
    await request(app).get("/test").query({ test: "it" }).expect(200)
  }
  let clock
  const date = new Date("2020-09-30T23:59:59.999Z")
  before(() => {
    clock = sinon.useFakeTimers(date)
  })
  afterEach(() => {
    stubESIndex.resetHistory()
    stubESIndicesExists.resetHistory()
    clock.setSystemTime(date)
  })
  after(() => {
    clock.restore()
  })
  describe("default index name", () => {
    it("should create the correct index pattern that default to half year pattern", async () => {
      await callServer()
      stubESIndex.should.be.called
      const { index } = stubESIndex.lastCall.args[0]
      index.should.be.equal("log_2020-h2")
    })
  })
  describe("configurable index name", () => {
    it("should able to config prefix", async () => {
      await callServer({ ...config, indexPrefix: "prod" })
      stubESIndex.should.be.called
      const { index } = stubESIndex.lastCall.args[0]
      index.should.be.equal("prod_2020-h2")
    })
    it("should able to suffix of index name by month", async () => {
      await callServer({ ...config, indexSuffixBy: "m" })
      stubESIndex.getCalls()[0].args[0].index.should.be.equal("log_2020-09")
      clock.setSystemTime(new Date("2010-02-01T23:59:59.999Z"))
      await callServer({ ...config, indexSuffixBy: "month" })
      stubESIndex.getCalls()[1].args[0].index.should.be.equal("log_2010-02")
      clock.setSystemTime(new Date("2019-03-01T23:59:59.999Z"))
      await callServer({
        ...config,
        indexPrefix: "test_month",
        indexSuffixBy: "M",
      })
      stubESIndex
        .getCalls()[2]
        .args[0].index.should.be.equal("test_month_2019-03")
    })
    it("should able to suffix of index name by quartery", async () => {
      await callServer({ ...config, indexSuffixBy: "q" })
      stubESIndex.getCalls()[0].args[0].index.should.be.equal("log_2020-q3")
      clock.setSystemTime(new Date("2010-04-01T23:59:59.999Z"))
      await callServer({ ...config, indexSuffixBy: "quarter" })
      stubESIndex.getCalls()[1].args[0].index.should.be.equal("log_2010-q2")
      clock.setSystemTime(new Date("2019-03-01T23:59:59.999Z"))
      await callServer({
        ...config,
        indexPrefix: "test_q",
        indexSuffixBy: "Q",
      })
      stubESIndex.getCalls()[2].args[0].index.should.be.equal("test_q_2019-q1")
    })
    it("should able to suffix of index name by bi-annually", async () => {
      await callServer({ ...config, indexSuffixBy: "h" })
      stubESIndex.getCalls()[0].args[0].index.should.be.equal("log_2020-h2")
      clock.setSystemTime(new Date("2010-04-01T23:59:59.999Z"))
      await callServer({ ...config, indexSuffixBy: "halfYear" })
      stubESIndex.getCalls()[1].args[0].index.should.be.equal("log_2010-h1")
      clock.setSystemTime(new Date("2019-03-01T23:59:59.999Z"))
      await callServer({
        ...config,
        indexPrefix: "test_h",
        indexSuffixBy: "H",
      })
      stubESIndex.getCalls()[2].args[0].index.should.be.equal("test_h_2019-h1")
    })
    it("should use default to bi-annually when invalid value is sent", async () => {
      await callServer({ ...config, indexSuffixBy: "mmmmm" })
      stubESIndex.getCalls()[0].args[0].index.should.be.equal("log_2020-h2")
      clock.setSystemTime(new Date("2019-03-01T23:59:59.999Z"))
      await callServer({
        ...config,
        indexPrefix: "test_undefined",
        indexSuffixBy: undefined,
      })
      stubESIndex
        .getCalls()[1]
        .args[0].index.should.be.equal("test_undefined_2019-h1")
    })
  })
})
