const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const { compile } = require('../out')

it('compile', async () => {
  const cwd = process.cwd()
  const inputFile = path.resolve(cwd, 'test/fixtures/test.mist')
  const outputFile = path.resolve(cwd, 'test/fixtures/output.mist')
  const output = JSON.parse(await compile(inputFile))
  const expectedOutput = JSON.parse(await fs.readFile(outputFile, 'utf-8'))
  assert.deepEqual(output, expectedOutput, '编译结果与预期不符')
})
