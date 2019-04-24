const {expect, test} = require('@oclif/test')

describe('wpcli', () => {
  test
  .stdout()
  .command(['wpcli'])
  .exit(2)
  .it('exits with status 2 when no parameter is set')
})
