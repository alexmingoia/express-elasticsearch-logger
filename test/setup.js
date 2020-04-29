const chai = require("chai")
const sinonChai = require("sinon-chai")
const chaiAsPromised = require("chai-as-promised")
const chaid = require("chaid")

chai.use(sinonChai).use(chaiAsPromised).use(chaid)
chai.should()
