/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-unused-vars */
const createError = require("http-errors")
const express = require("express")
const cookieParser = require("cookie-parser")
const expressLogger = require("../lib/express-elasticsearch-logger")

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

const loggerHost = "http://localhost:9200"
app.use(
  expressLogger.requestHandler({
    host: loggerHost,
    whitelist: {
      request: [
        "body",
        "email",
        "httpVersion",
        "headers",
        "method",
        "originalUrl",
        "path",
        "query",
      ],
      response: ["statusCode", "sent"],
    },
    censor: [
      "ssn",
      "socialSecurityNumber",
      "password",
      "form.socialSecurityNumber",
      "userInfo.password",
    ],
    mapping: {
      properties: {
        response: {
          properties: {
            sent: {
              type: "object",
              enabled: false,
            },
          },
        },
        request: {
          properties: {
            email: {
              type: "text",
            },
          },
        },
        error: {
          properties: {
            errors: {
              type: "object",
              enabled: false,
            },
          },
        },
      },
    },
  }),
)

app.get("/", function (req, res) {
  res.send(new Date())
})

const router = express.Router()

router.get("/", function (req, res) {
  res.send(req.query)
})

router.post("/", function (req, res) {
  res.send(req.body)
})

app.use("/route", router)

app.use(expressLogger.errorHandler)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get("env") === "development" ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.send(err)
})

module.exports = app
