const {expect, test} = require('@oclif/test')

describe('auth', () => {
  test
  .stdout()
  .command(['auth'])
  .exit(0)
  .it('Auth exits with message', ctx => {
    expect(ctx.stdout).to.contain('This action will be released in a feature release.')
  })
})
