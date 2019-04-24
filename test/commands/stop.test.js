const {expect, test} = require('@oclif/test')
const sinon = require('sinon')

const BaseCommand = require('../../src/command-base')

describe('stop', () => {
  test
  .stdout()
  .stub(process, 'cwd', () => './')
  .command(['stop'])
  .exit(6)
  .it('Exit with status 6 if no running wordup project')

  const customLogs = sinon.stub().returnsArg(0)

  test
  .stdout()
  .stub(process, 'cwd', () => './')
  .stub(BaseCommand.prototype, 'customLogs', customLogs)
  .command(['stop', '--project', 'test'])
  .it('Run with a provided project and resolves with success message', async ctx => {
    expect(customLogs.returned('Stop wordup')).to.be.true
  })
})
