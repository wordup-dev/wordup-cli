const {expect, test} = require('@oclif/test')
const shell = require('shelljs')

const sinon = require('sinon')
const Project = require('../../src/lib/project')
const BaseCommand = require('../../src/command-base')

const stubedPackage = require('../package-test')

describe('install', () => {
  test
  .stdout()
  .stub(Project.prototype, 'isExecWordupProject', () => false)
  .command(['install'])
  .exit(1)
  .it('exits with status 5 when no package file is set')

  test
  .stdout()
  .stub(Project.prototype, 'isExecWordupProject', () => true)
  .stub(Project.prototype, 'isWordupProjectRunning', () => true)
  .command(['install'])
  .exit(5)
  .it('exits with status 5 when wordup is running')

  test
  .stdout()
  .stub(Project.prototype, 'isExecWordupProject', () => true)
  .stub(Project.prototype, 'isWordupProjectRunning', () => false)
  .stub(Project.prototype, 'isInstalled', () => true)
  .command(['install'])
  .exit(4)
  .it('Exit with status 4 if already installed', ctx => {
    expect(ctx.stdout).to.eq('The development server and volumes are already installed. To delete this installation use: wordup stop --delete.\n')
  })


  test
  .stderr()
  .stub(Project.prototype, 'isExecWordupProject', () => true)
  .stub(Project.prototype, 'isWordupProjectRunning', () => false)
  .stub(Project.prototype, 'getWordupPkgInstall',() => {
    return {
    'type':'new',
    'config':stubedPackage.wordup
  }})
  .stub(process, 'cwd', () => './')
  .stub(BaseCommand.prototype, 'customLogs', sinon.stub().resolves(1))
  .command(['install','--force'])
  .exit(10)
  .it('Test docker-compose with boot failure')
})
