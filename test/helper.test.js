'use strict';

var expect = require('chai').expect;
var helper = require('../lib/helper');

var cencorString = '**CENSORED**';

describe('helper module', function () {
  describe('methods', function() {
    context('#_censorDeep', function() {
      it('should be able to censor out 1 level config', function() {
        var original = {
          a: 'should censor me', b: null, c: 'hello', d: 'haha'
        };
        var newObj = helper._censorDeep(original, 'a'.split('.'));
        expect(newObj).to.deep.equal({a: cencorString, b: null, c: 'hello', d: 'haha'});
      });

      it('should be able to censor out multi level config', function() {
        var original = {
          a: {
            aa: { aaa: 'keep me out' }
          }, b: null, c: 'hello', d: 'haha'
        };
        var newObj = helper._censorDeep(original, 'a.aa.aaa'.split('.'));
        expect(newObj).to.have.deep.property('a.aa.aaa', cencorString);
      });

      it('should remain the same object if the config is at fault', function() {
        var original = {
          a: {
            aa: { aaa: 'keep me out' }
          }, b: null, c: 'hello', d: 'haha'
        };
        var newObj = helper._censorDeep(original, 'a.azd.ewx.1.2'.split('.'));
        expect(newObj).to.have.deep.equal(original);
      });

      it('should be able to censor data in array with * position and nested object', function() {
        var original = {
          Questions: [
            {
              question: "this is q1",
              answer: "this is a1"
            },
            {
              question: "this is q2",
              answer: "this is a2"
            },
            {
              question: "this is q3",
              answer: "this is a3"
            }
          ]
        };
        var expected = {
          Questions: [
            {
              question: "this is q1",
              answer: cencorString
            },
            {
              question: "this is q2",
              answer: cencorString
            },
            {
              question: "this is q3",
              answer: cencorString
            }
          ]
        };
        var newObj = helper._censorDeep(original, 'Questions.*.answer'.split('.'));
        expect(newObj).to.have.deep.equal(expected);
      });

      it('should be able to censor data in array with normal position', function() {
        var original = {
          Questions: [
            {
              question: "this is q1",
              answer: "this is a1"
            },
            {
              question: "this is q2",
              answer: "this is a2"
            },
            {
              question: "this is q3",
              answer: "this is a3"
            }
          ]
        };
        var expected = {
          Questions: [
            {
              question: "this is q1",
              answer: cencorString
            },
            {
              question: "this is q2",
              answer: "this is a2"
            },
            {
              question: "this is q3",
              answer: "this is a3"
            }
          ]
        };
        var newObj = helper._censorDeep(original, 'Questions.0.answer'.split('.'));
        expect(newObj).to.have.deep.equal(expected);
      });

      it('should be able to censor data in array with nested array', function() {
        var original = {
          Questions: [
            {
              question: ["haha", "haha"],
              answer: "this is a1"
            },
            {
              question: ["haha", "haha"],
              answer: "this is a2"
            }
          ]
        };
        var expected = {
          Questions: [
            {
              question: ["haha",cencorString],
              answer: "this is a1"
            },
            {
              question: ["haha",cencorString],
              answer: "this is a2"
            }
          ]
        };
        var newObj = helper._censorDeep(original, 'Questions.*.question.1'.split('.'));
        expect(newObj).to.have.deep.equal(expected);
      });

      it('should be able to censor data in array with nested empty array', function() {
        var original = {
          Questions: [
            {
              question: ["hahe"],
              answer: "this is a1"
            },
            {
              question: ["haha", "haha"],
              answer: "this is a2"
            }
          ]
        };
        var expected = {
          Questions: [
            {
              question: ["hahe"],
              answer: "this is a1"
            },
            {
              question: ["haha",cencorString],
              answer: "this is a2"
            }
          ]
        };
        var newObj = helper._censorDeep(original, 'Questions.*.question.1'.split('.'));
        expect(newObj).to.have.deep.equal(expected);
      });
    });
    context('#censor', function() {
      it('should be able to censor deep config', function() {
        var original = {z: {zz: {zzz: 'take_me_out'}}};
        helper.censor(original, ['z.zz.zzz']);
        expect(original).to.have.deep.property('z.zz.zzz', cencorString);
      });
      it('should be able to censor 1 level config', function() {
        var original = {z: {zz: {zzz: 'take_me_out'}}};
        helper.censor(original, ['z']);
        expect(original).to.have.deep.property('z', cencorString);
      });

      it('should be able to censor multiple configs', function() {
        var original = {z: {zz: {zzz: 'take_me_out'}}, b: 'this is to be censored too', c: {y: 'out too', x: 'remain cool'}};
        helper.censor(original, ['z.zz.zzz', 'b', 'c.y']);
        expect(original).to.deep.equal(
          {z: {zz: {zzz: cencorString}}, b: cencorString, c: {y: cencorString, x: 'remain cool'}}
        );
      });
    });
  });
});
