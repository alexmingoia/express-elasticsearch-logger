const indexSettings = {
  index: {
    number_of_shards: "3",
    number_of_replicas: "2",
    refresh_interval: "60s",
    analysis: {
      normalizer: {
        lowercase: {
          type: "custom",
          char_filter: [],
          filter: ["lowercase"],
        },
      },
    },
  },
}

const defaultMapping = {
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
        userId: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              normalizer: "lowercase",
            },
          },
        },
        email: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              normalizer: "lowercase",
            },
          },
        },
        headers: {
          properties: {
            accept: {
              type: "keyword",
              normalizer: "lowercase",
            },
            acceptencoding: {
              type: "keyword",
              normalizer: "lowercase",
            },
            authorization: {
              type: "text",
              analyzer: "standard",
            },
            cdnloop: {
              type: "keyword",
              normalizer: "lowercase",
            },
            cfconnectingip: {
              type: "keyword",
              normalizer: "lowercase",
            },
            cfipcountry: {
              type: "keyword",
              normalizer: "lowercase",
            },
            cfray: {
              type: "keyword",
              normalizer: "lowercase",
            },
            cfvisitor: {
              type: "keyword",
              normalizer: "lowercase",
            },
            contentlength: {
              type: "integer",
            },
            contenttype: {
              type: "keyword",
              normalizer: "lowercase",
            },
            host: {
              type: "keyword",
              normalizer: "lowercase",
            },
            useragent: {
              type: "text",
              analyzer: "standard",
            },
            xforwardedfor: {
              type: "keyword",
              normalizer: "lowercase",
            },
            xforwardedhost: {
              type: "keyword",
              normalizer: "lowercase",
            },
            xforwardedport: {
              type: "keyword",
              normalizer: "lowercase",
            },
            xforwardedproto: {
              type: "keyword",
              normalizer: "lowercase",
            },
            xoriginalforwardedfor: {
              type: "keyword",
              normalizer: "lowercase",
            },
            xoriginaluri: {
              type: "keyword",
              normalizer: "lowercase",
            },
            xrealip: {
              type: "keyword",
              normalizer: "lowercase",
            },
            xrequestid: {
              type: "keyword",
              normalizer: "lowercase",
            },
            xscheme: {
              type: "keyword",
              normalizer: "lowercase",
            },
          },
        },
        httpVersion: {
          type: "keyword",
        },
        method: {
          type: "keyword",
        },
        originalUrl: {
          type: "keyword",
        },
        route: {
          properties: {
            path: {
              type: "keyword",
            },
          },
        },
        path: {
          type: "keyword",
        },
        query: {
          type: "object",
          enabled: false,
        },
        body: {
          type: "object",
          enabled: false,
        },
      },
    },
    response: {
      properties: {
        sent: {
          type: "object",
          enabled: false,
        },
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
        errors: {
          type: "object",
          enabled: false,
        },
        code: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
              normalizer: "lowercase",
            },
          },
        },
        error: {
          type: "text",
        },
        error_description: {
          type: "text",
        },
        message: {
          type: "text",
          analyzer: "standard",
        },
        name: {
          type: "keyword",
          normalizer: "lowercase",
        },
        stack: {
          type: "keyword",
        },
        type: {
          type: "keyword",
        },
      },
    },
  },
}

const defaultWhiteList = {
  request: [
    "userId",
    "body",
    "email",
    "httpVersion",
    "headers",
    "method",
    "originalUrl",
    "path",
    "query",
  ],
  response: ["statusCode", "sent", "took"],
  error: [
    "message",
    "stack",
    "type",
    "name",
    "code",
    "errors",
    "error",
    "error_description",
  ],
}

const defaultCensor = ["password"]

module.exports = {
  defaultMapping,
  defaultWhiteList,
  defaultCensor,
  indexSettings,
}
