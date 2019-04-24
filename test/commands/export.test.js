const {expect, test} = require('@oclif/test')

const sinon = require('sinon')
const Project = require('../../src/lib/project')
const shell = require('shelljs')

const wordupProjectStub = sinon.stub()
wordupProjectStub.isExecWordupProject = sinon.stub().callsFake(() => true)

const stubedPackage = require('../package-test')

describe('export', () => {
  test
  .stdout()
  .command(['export'])
  .exit(5)
  .it('exits with status 5 when no package file is set')

  test
  .stdout()
  .command(['export', 'installation'])
  .exit(5)
  .it('exits with status 5 when no package file is set')

  test
  .stdout()
  .command(['export', 'sql'])
  .exit(5)
  .it('exits with status 5 when no package file is set')

  test
  .stdout()
  .stub(Project.prototype, 'isExecWordupProject', () => true)
  .stub(Project.prototype, 'isWordupRunning', () => false)
  .command(['export', 'sql'])
  .exit(4)
  .it('Exit with status 4 if not running')

  const shellExec = sinon.stub().returnsArg(0)
  const packageB64 = Buffer.from(JSON.stringify(stubedPackage.wordup)).toString('base64')

  test
  .stdout()
  .stub(Project.prototype, 'isExecWordupProject', () => true)
  .stub(Project.prototype, 'isWordupRunning', () => true)
  .stub(Project.prototype, 'getWordupPkgB64', () => packageB64)
  .stub(process, 'cwd', () => './')
  .stub(shell, 'exec', shellExec)
  .command(['export', 'sql'])
  .it('Test final shell.exec which runs docker compose', ctx => {
    expect(shellExec.returned('docker-compose --project-directory ./ run --rm wordpress-cli wordup export ' + packageB64 + ' --type=sql')).to.be.true
  })
})
