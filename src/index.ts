import { inlineComponents } from './inlineComponents'
import { compileToBinary } from './binary'
import { convertExpressions, printNode } from './convertExpressions'
import { ExpressionNode } from './exp/parser'

interface CompileOptions {
  /**
   * 是否进行最小化处理
   */
  minify?: boolean
  /**
   * 平台
   */
  platform?: string
  /**
   * 是否编译为二进制产物
   */
  binary?: boolean
  
  debug?:boolean
}

export async function compile(file: string, options: CompileOptions = { minify: false, debug: false }, content?: string) {
  const result = await inlineComponents(file, content,  { inlinedMap: {}, stack: [file], file , platform : options.platform, debug : options.debug})
  convertExpressions(result)
  if (options.binary) {
    return compileToBinary(result)
  }
  return JSON.stringify(result, (_, value) => {
    if (value instanceof ExpressionNode) {
      return '$:' + printNode(value)
    }
    return value
  }, options.minify ? undefined : 2)
}
