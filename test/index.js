const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const { compile } = require('../out')

function expectOutput(name) {
  it(name, async () => {
    const cwd = process.cwd()
    const inputFile = path.resolve(cwd, `test/fixtures/${name}.mist`)
    const outputFile = path.resolve(cwd, `test/fixtures/${name}_out.mist`)
    const output = JSON.parse(await compile(inputFile))
    const expectedOutput = JSON.parse(await fs.readFile(outputFile, 'utf-8'))
    assert.deepEqual(output, expectedOutput, '编译结果与预期不符')
  })
}

function expectThrows(name, error) {
  it(name, async () => {
    const cwd = process.cwd()
    const inputFile = path.resolve(cwd, `test/fixtures/${name}.mist`)
    assert.rejects(() => compile(inputFile), error)
  })
}

describe('Tests', () => {
  expectOutput('basic')
  expectOutput('nested')
  expectOutput('import_in_slot')
  expectOutput('repeat_slot')
  expectThrows('circular_throws', '不允许组件循环引用 a')
})
