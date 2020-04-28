/* eslint-disable no-console */
/**
 * Log `request` to elasticsearch.
 *
 * @param {String}  index index name
 * @param {elasticsearch.Client} client
 * @param {Object} doc document to save
 * @private
 */
function log(doc, index, client) {
  client.index(
    {
      index,
      body: doc,
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
  const { settings, mapping: mappings } = config

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
              ...(settings && { settings }),
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
