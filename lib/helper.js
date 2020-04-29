/* eslint-disable no-param-reassign */
const _censorDeep = function (obj, censorKeyArray) {
  if (censorKeyArray.length === 0 && typeof obj !== "undefined") {
    // this means function reach its base condition, return censor
    return "**CENSORED**"
  }
  const targetKey = censorKeyArray[0]
  if (Array.isArray(obj) && obj.length > 0 && targetKey !== undefined) {
    if (targetKey === "*") {
      const mappedArray = obj.map(function (item) {
        const restKey = censorKeyArray.slice(1, censorKeyArray.length)
        return _censorDeep(item, restKey)
      })
      return mappedArray
    }
    if (obj[targetKey] !== undefined) {
      obj[targetKey] = _censorDeep(
        obj[targetKey],
        censorKeyArray.splice(1, censorKeyArray.length),
      )
    }
    return obj
  }
  if (obj instanceof Object && obj[targetKey] !== "undefined") {
    obj[targetKey] = _censorDeep(
      obj[targetKey],
      censorKeyArray.splice(1, censorKeyArray.length),
    )
    return obj
  }
  return obj
}

exports.censor = function (obj, censorKeyArray) {
  censorKeyArray.forEach(function (key) {
    // split with dot notation
    const keyArray = key.split(".")
    if (keyArray.length >= 1) {
      // this mean the key exist
      const targetKey = keyArray[0]
      if (typeof obj[targetKey] !== "undefined") {
        obj[targetKey] = _censorDeep(
          obj[targetKey],
          keyArray.splice(1, keyArray.length),
        )
      }
    }
  })
}

exports._censorDeep = _censorDeep

const deepMerge = (b, a, mergeArray) => {
  if (mergeArray && Array.isArray(a) && Array.isArray(b)) {
    return [...b, ...a].filter((v, i, arr) => arr.indexOf(v) === i)
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return b
  }
  Object.keys(b).forEach((key) => {
    if (typeof b[key] === "object") {
      a[key] = deepMerge(
        b[key],
        typeof a[key] === "object" ? a[key] : {},
        mergeArray,
      )
    } else {
      a[key] = b[key]
    }
  })
  return a
}

exports.deepMerge = deepMerge

exports.indexDateQuarter = (date) =>
  `${date.toISOString().substr(0, 4)}-q${Math.ceil(
    +date.toISOString().substr(5, 2) / 3,
  )}`

exports.indexDateHalfYear = (date) =>
  `${date.toISOString().substr(0, 4)}-h${Math.ceil(
    +date.toISOString().substr(5, 2) / 6,
  )}`

exports.indexDateMonth = (date) => date.toISOString().substr(0, 7)
