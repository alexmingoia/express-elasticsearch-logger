'use strict';
exports.censor = function(obj, censorKeyArray) {
  censorKeyArray.forEach(function(key){
    //split with dot notation
    var keyArray = key.split('.');
    if (keyArray.length >= 1) {
      // this mean the key exist
      var targetKey = keyArray[0];
      if (typeof obj[targetKey] !== 'undefined') {
        obj[targetKey] = _censorDeep(obj[targetKey], keyArray.splice(1, keyArray.length));
      }
    }
  });
};



var _censorDeep = function(obj, censorKeyArray) {
  if (censorKeyArray.length === 0 && typeof obj !== 'undefined') {
    // this means function reach its base condition, return censor
    return '**CENSORED**';
  }
  var targetKey = censorKeyArray[0];
  if (Array.isArray(obj) && obj.length > 0 && targetKey !== undefined) {
    if (targetKey === "*") {
      const mappedArray = obj.map(function(item) {
        const restKey = censorKeyArray.slice(1, censorKeyArray.length)
        return _censorDeep(item, restKey)
      })
      return mappedArray
    }
    if (obj[targetKey] !== undefined) {
      obj[targetKey] = _censorDeep(obj[targetKey], censorKeyArray.splice(1, censorKeyArray.length));
    }
    return obj;
  } else if (obj instanceof Object && obj[targetKey] !== 'undefined') {
    obj[targetKey] = _censorDeep(obj[targetKey], censorKeyArray.splice(1, censorKeyArray.length));
    return obj;
  } 
  return obj;
};

exports._censorDeep = _censorDeep;
