const {expect, test} = require('@oclif/test')
const sinon = require('sinon')
const cmd = require('../../src/commands/init')

describe('init', () => {
  test
  .stdout()
  .stub(cmd.prototype, 'promptInit', sinon.stub().resolves('Success'))
  .command(['init'])
  .it('Returns promise message', ctx => {
    expect(ctx.stdout).to.contain('Success')
    // done()
  })
})
