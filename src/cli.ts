import * as fs from 'fs-extra'
import * as path from 'path'
import request from 'request'

import { compile } from "."

const { name, version } = require('../package.json')

interface Options {
  minify?: boolean
  output?: string
  file?: string
  platform?: string
  debug?:boolean
  version?: boolean
  checkUpdate?: boolean
  help?: boolean
}

function printHelp() {
  console.log(`
Mist 模板编译工具

Usage:
  mistc [options] file

Options:
  -o,--output <file>    输出到指定文件
  -m,--minify           是否进行最小化
  -u,--check-update     检查更新，输出 JSON 字符串，属性有 hasUpdate, currentVersion, newVersion
  -p,--platform         编译平台
  -d,--debug            是否调试
  -v,--version          输出版本号
  -h,--help             显示帮助
`)
}

function printVersion() {
  console.log(version)
}

function checkUpdate() {
  const pkgUrl = `https://registry.npmjs.org/${name}/latest`
  request(pkgUrl, (err, res, body) => {
    const info = JSON.parse(body)
    let result: any
    if (info.version !== version) {
      result = {
        hasUpdate: true,
        currentVersion: version,
        newVersion: info.version,
      }
    }
    else {
      result = {
        hasUpdate: false,
      }
    }

    console.log(JSON.stringify(result, null, 2))
  })
}

function parseArgs() {
  const argv = process.argv
  const options: Options = {}

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    switch (arg) {
      case '-o':
      case '--output': {
        i++;
        const file = argv[i]
        if (!file) {
          throw new Error('请指定输出文件名')
        }
        options.output = file
        break;
      }
      case '-h':
      case '--help': {
        options.help = true
        break;
      }
      case '-v':
      case '--version': {
        options.version = true
        break;
      }
      case '-p':
      case '--platform': {
        i++;
        const platform = argv[i]
        if (platform !== 'android' && platform !== 'ios') {
          throw new Error('请输入android或ios')
        }
        options.platform = platform
        break;
      }
      case '-d':
      case '--debug': {
        options.debug = true
        break;
      }
      case '-u':
      case '--check-update': {
        options.checkUpdate = true
        break;
      }
      case '-m':
      case '--minify': {
        options.minify = true
        break;
      }
      default: {
        if (arg[0] === '-') {
          throw new Error(`不支持的选项 \`${arg}\``)
        }

        if (options.file) {
          throw new Error(`只能编译一个文件`)
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
  else if (options.checkUpdate) {
    checkUpdate()
  }
  else if (options.version) {
    printVersion()
  }
  else if (!options.file) {
    console.error('请指定要编译的文件')
  }
  else {
    const cwd = process.cwd()
    const inputFile = path.resolve(cwd, options.file)
    const result = await compile(inputFile, { minify: options.minify, platform: options.platform, debug: options.debug })
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
}

function handleException(e: any) {
  if (e instanceof Error) {
    console.error(e.message)
  }
  else {
    console.error(e)
  }
  process.exit(1)
}

process.on('uncaughtException', handleException)
process.on('unhandledRejection', handleException)

main()
