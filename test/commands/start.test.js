const {expect, test} = require('@oclif/test')
const Project = require('../../src/lib/project')

describe('start', () => {
  test
  .stdout()
  .stub(Project.prototype, 'isExecWordupProject', () => false)
  .command(['start'])
  .exit(1)
  .it('exits with status 1 when no package file is set')

  test
  .stdout()
  .stub(Project.prototype, 'isExecWordupProject', () => true)
  .stub(Project.prototype, 'isWordupProjectRunning', () => true)
  .command(['start'])
  .exit(5)
  .it('exits with status 5 when wordup is already running')

  test
  .stdout()
  .stub(Project.prototype, 'isExecWordupProject', () => true)
  .stub(Project.prototype, 'isWordupProjectRunning', () => false)
  .stub(Project.prototype, 'isInstalled', () => false)
  .command(['start'])
  .exit(4)
  .it('Exit with status 4 if project not installed', ctx => {
    expect(ctx.stdout).to.eq('Your current installation is not set up. Please run first wordup local:install\n')
  })
})
