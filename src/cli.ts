import * as fs from 'fs-extra'
import * as path from 'path'

import { compile } from "."

const { version } = require('../package.json')

interface Options {
  minify?: boolean
  output?: string
  file?: string
  version?: boolean
  help?: boolean
}

function printHelp() {
  console.log(`
Mist 模板编译工具

Usage:
  kobex [options] file

Options:
  -o,--output <file>    输出到指定文件
  -m,--minify           是否进行最小化
  -v,--version          输出版本号
  -h,--help             显示帮助
`)
}

function printVersion() {
  console.log(version)
}

function parseArgs() {
  const argv = process.argv
  const options: Options = {}

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    switch (arg) {
      case '-o': {
        i++;
        const file = argv[i]
        if (!file) {
          console.warn('请指定输出文件名')
          continue
        }
        options.output = file
        break;
      }
      case '-h': {
        options.help = true
        break;
      }
      case '-v': {
        options.version = true
        break;
      }
      case '-m': {
        options.minify = true
        break;
      }
      default: {
        if (arg[0] === '-') {
          console.warn(`不支持的选项 \`${arg}\``)
          continue
        }

        if (options.file) {
          console.warn(`只能编译一个文件`)
          continue
        }

        options.file = arg
        break;
      }
    }
  }

  return options
}

async function main() {
  if (process.argv.length <= 2) {
    printHelp()
    return
  }

  const options = parseArgs()
  if (options.help) {
    printHelp()
  }
  else if (options.version) {
    printVersion()
  }
  else if (!options.file) {
    console.error('请指定要编译的文件')
  }
  else {
    try {
      const cwd = process.cwd()
      const inputFile = path.resolve(cwd, options.file)
      const result = await compile(inputFile, { minify: options.minify })
      if (options.output) {
        const outputFile = path.resolve(cwd, options.output)
        await fs.ensureFile(outputFile)
        await fs.writeFile(outputFile, result)
        console.log('编译成功，输出文件：' + outputFile)
      }
      else {
        console.log(result)
      }
    }
    catch (e) {
      if (e instanceof Error) {
        console.error(e.message)
      }
      else {
        console.error(e)
      }
    }
  }
}

main()
