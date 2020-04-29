const { expect } = require("chai")
const {
  _censorDeep,
  censor,
  indexDateHalfYear,
  indexDateMonth,
  deepMerge,
  indexDateQuarter,
} = require("../lib/helper")

const cencorString = "**CENSORED**"

describe("censor helpers", function () {
  context("#_censorDeep", function () {
    it("should be able to censor out 1 level config", function () {
      const original = {
        a: "should censor me",
        b: null,
        c: "hello",
        d: "haha",
      }
      const newObj = _censorDeep(original, "a".split("."))
      expect(newObj).to.deep.equal({
        a: cencorString,
        b: null,
        c: "hello",
        d: "haha",
      })
    })

    it("should be able to censor out multi level config", function () {
      const original = {
        a: {
          aa: { aaa: "keep me out" },
        },
        b: null,
        c: "hello",
        d: "haha",
      }
      const newObj = _censorDeep(original, "a.aa.aaa".split("."))
      expect(newObj).to.have.nested.property("a.aa.aaa", cencorString)
    })

    it("should remain the same object if the config is at fault", function () {
      const original = {
        a: {
          aa: { aaa: "keep me out" },
        },
        b: null,
        c: "hello",
        d: "haha",
      }
      const newObj = _censorDeep(original, "a.azd.ewx.1.2".split("."))
      expect(newObj).to.have.deep.equal(original)
    })

    it("should be able to censor data in array with * position and nested object", function () {
      const original = {
        Questions: [
          {
            question: "this is q1",
            answer: "this is a1",
          },
          {
            question: "this is q2",
            answer: "this is a2",
          },
          {
            question: "this is q3",
            answer: "this is a3",
          },
        ],
      }
      const expected = {
        Questions: [
          {
            question: "this is q1",
            answer: cencorString,
          },
          {
            question: "this is q2",
            answer: cencorString,
          },
          {
            question: "this is q3",
            answer: cencorString,
          },
        ],
      }
      const newObj = _censorDeep(original, "Questions.*.answer".split("."))
      expect(newObj).to.have.deep.equal(expected)
    })

    it("should be able to censor data in array with normal position", function () {
      const original = {
        Questions: [
          {
            question: "this is q1",
            answer: "this is a1",
          },
          {
            question: "this is q2",
            answer: "this is a2",
          },
          {
            question: "this is q3",
            answer: "this is a3",
          },
        ],
      }
      const expected = {
        Questions: [
          {
            question: "this is q1",
            answer: cencorString,
          },
          {
            question: "this is q2",
            answer: "this is a2",
          },
          {
            question: "this is q3",
            answer: "this is a3",
          },
        ],
      }
      const newObj = _censorDeep(original, "Questions.0.answer".split("."))
      expect(newObj).to.have.deep.equal(expected)
    })

    it("should be able to censor data in array with nested array", function () {
      const original = {
        Questions: [
          {
            question: ["haha", "haha"],
            answer: "this is a1",
          },
          {
            question: ["haha", "haha"],
            answer: "this is a2",
          },
        ],
      }
      const expected = {
        Questions: [
          {
            question: ["haha", cencorString],
            answer: "this is a1",
          },
          {
            question: ["haha", cencorString],
            answer: "this is a2",
          },
        ],
      }
      const newObj = _censorDeep(original, "Questions.*.question.1".split("."))
      expect(newObj).to.have.deep.equal(expected)
    })

    it("should be able to censor data in array with nested empty array", function () {
      const original = {
        Questions: [
          {
            question: ["hahe"],
            answer: "this is a1",
          },
          {
            question: ["haha", "haha"],
            answer: "this is a2",
          },
        ],
      }
      const expected = {
        Questions: [
          {
            question: ["hahe"],
            answer: "this is a1",
          },
          {
            question: ["haha", cencorString],
            answer: "this is a2",
          },
        ],
      }
      const newObj = _censorDeep(original, "Questions.*.question.1".split("."))
      expect(newObj).to.have.deep.equal(expected)
    })
  })
  context("#censor", function () {
    it("should be able to censor deep config", function () {
      const original = { z: { zz: { zzz: "take_me_out" } } }
      censor(original, ["z.zz.zzz"])
      expect(original).to.have.nested.property("z.zz.zzz", cencorString)
    })
    it("should be able to censor 1 level config", function () {
      const original = { z: { zz: { zzz: "take_me_out" } } }
      censor(original, ["z"])
      expect(original).to.have.nested.property("z", cencorString)
    })

    it("should be able to censor multiple configs", function () {
      const original = {
        z: { zz: { zzz: "take_me_out" } },
        b: "this is to be censored too",
        c: { y: "out too", x: "remain cool" },
      }
      censor(original, ["z.zz.zzz", "b", "c.y"])
      expect(original).to.deep.equal({
        z: { zz: { zzz: cencorString } },
        b: cencorString,
        c: { y: cencorString, x: "remain cool" },
      })
    })
  })
})

describe("indexDate helpers", () => {
  context("indexDateMonth", () => {
    it("should get the YYYY-MM format for given date", () => {
      indexDateMonth(new Date("2020-05-01T10:34:57.685Z")).should.equal(
        "2020-05",
      )
      indexDateMonth(new Date("2020-04-30T10:34:57.685Z")).should.equal(
        "2020-04",
      )
      indexDateMonth(new Date("2019-01-01T00:34:57.685Z")).should.equal(
        "2019-01",
      )
      indexDateMonth(new Date("2020-02-29T00:34:57.685Z")).should.equal(
        "2020-02",
      )
      indexDateMonth(new Date("2020-12-31T23:59:59.999Z")).should.equal(
        "2020-12",
      )
    })
  })
  context("indexDateQuarter", () => {
    it("should get the YYYY-q{number} format for given date", () => {
      indexDateQuarter(new Date("2020-05-01T10:34:57.685Z")).should.equal(
        "2020-q2",
      )
      indexDateQuarter(new Date("2020-03-30T10:34:57.685Z")).should.equal(
        "2020-q1",
      )
      indexDateQuarter(new Date("2019-01-01T00:34:57.685Z")).should.equal(
        "2019-q1",
      )
      indexDateQuarter(new Date("2020-02-29T00:34:57.685Z")).should.equal(
        "2020-q1",
      )
      indexDateQuarter(new Date("2020-12-31T23:59:59.999Z")).should.equal(
        "2020-q4",
      )
      indexDateQuarter(new Date("2020-09-30T23:59:59.999Z")).should.equal(
        "2020-q3",
      )
      indexDateQuarter(new Date("2020-10-01T00:00:00.000Z")).should.equal(
        "2020-q4",
      )
    })
  })
  context("indexDateHalfYear", () => {
    it("should get the YYYY-h{number} format for given date", () => {
      indexDateHalfYear(new Date("2020-05-01T10:34:57.685Z")).should.equal(
        "2020-h1",
      )
      indexDateHalfYear(new Date("2020-03-30T10:34:57.685Z")).should.equal(
        "2020-h1",
      )
      indexDateHalfYear(new Date("2019-01-01T00:34:57.685Z")).should.equal(
        "2019-h1",
      )
      indexDateHalfYear(new Date("2020-02-29T00:34:57.685Z")).should.equal(
        "2020-h1",
      )
      indexDateHalfYear(new Date("2020-12-31T23:59:59.999Z")).should.equal(
        "2020-h2",
      )
      indexDateHalfYear(new Date("2020-09-30T23:59:59.999Z")).should.equal(
        "2020-h2",
      )
      indexDateHalfYear(new Date("2020-10-01T00:00:00.000Z")).should.equal(
        "2020-h2",
      )
    })
  })
})

context("deepMerge", () => {
  it("should able to merge object in nested but not array", () => {
    const result = deepMerge(
      { a: { b: ["green"] }, c: { d: "hi" } },
      { a: { b: ["sorasak", "srirussamee"] }, c: { e: "hi" } },
    )
    result.should.deep.equal({
      a: { b: ["green"] },
      c: { e: "hi", d: "hi" },
    })
  })
  it("should able to merge object in nested object and array if true flag is sent as third argument", () => {
    const result = deepMerge(
      { a: { b: ["green"] }, c: { d: "hi", f: ["hello", "world"] } },
      { a: { b: ["sorasak"] }, c: { e: "hi", f: ["world", "thailand"] } },
      true,
    )
    result.should.deep.equal({
      a: { b: ["green", "sorasak"] },
      c: { e: "hi", d: "hi", f: ["hello", "world", "thailand"] },
    })
  })
})
