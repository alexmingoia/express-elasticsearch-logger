/* eslint-disable no-console */
/**
 * Log `request` to elasticsearch.
 *
 * @param {Object} config
 * @param {elasticsearch.Client} client
 * @param {request} request
 * @private
 */
function log(request, config, client) {
  client.index(
    {
      index: config.index,
      type: config.type,
      body: request,
    },
    function (error) {
      if (error) {
        console.error(error)
      }
    },
  )
}

/**
 * Ensure log index and request mapping exist.
 *
 * @param {Object} config
 * @param {elasticsearch.Client} client
 * @param {Function} done
 * @private
 */
function ensureIndexExists(config, client, done) {
  const mappings = {}
  mappings[config.type] = config.mapping

  client.indices.exists(
    {
      index: config.index,
    },
    (err, exists) => {
      if (err) {
        done(err)
        return
      }

      if (exists) {
        client.indices.putMapping(
          {
            index: config.index,
            type: config.type,
            updateAllTypes: true,
            body: config.mapping,
          },
          done,
        )
      } else {
        client.indices.create(
          {
            index: config.index,
            body: {
              mappings,
            },
          },
          done,
        )
      }
    },
  )
}

module.exports = {
  log,
  ensureIndexExists,
}
