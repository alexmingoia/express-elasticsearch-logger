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
  })
};

const _censorDeep = function(obj, censorKeyArray) {
  if (censorKeyArray.length === 0 && typeof obj !== 'undefined') {
    // this means function reach its base condition, return censor
    return '**CENSORED**'
  }
  var targetKey = censorKeyArray[0];
  if (obj instanceof Object && obj[targetKey] !== 'undefined') {
    obj[targetKey] = _censorDeep(obj[targetKey], censorKeyArray.splice(1, censorKeyArray.length));
    return obj
  }
  return obj
};

exports._censorDeep = _censorDeep;
