import { inlineComponents } from './inlineComponents'
import { compileToBinary } from './binary'
import { convertExpressions, printNode } from './convertExpressions'
import { ExpressionNode } from './exp/parser'

export interface CompileOptions {
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
  /**
   * 是否启用严格模式，严格模式下所有错误都会导致编译失败。默认开启
   */
  strict?: boolean
  
  debug?:boolean
}

export async function compile(file: string, options: CompileOptions = { minify: false, debug: false }, content?: string) {
  const result = await inlineComponents(file, content,  { inlinedMap: {}, stack: [file], file , platform : options.platform, debug : options.debug})
  
  const constants: Record<string, any> = {}
  if (options.platform) {
    const isAndroid = options.platform === 'android'
    constants._platform_ = isAndroid ? 'Android' : 'iOS'
    constants.is_ios = !isAndroid
    constants.is_android = isAndroid
    constants.system = { name: constants._platform_ }
  }

  convertExpressions(result, constants)

  removeGone(result.layout)

  if (options.binary) {
    return compileToBinary(result, options)
  }
  return JSON.stringify(result, (_, value) => {
    if (value instanceof ExpressionNode) {
      return '$:' + printNode(value)
    }
    return value
  }, options.minify ? undefined : 2)
}

function removeGone(node: any) {
  const children = node.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.gone === true) {
        children.splice(i, 1)
        i--;
        continue;
      }
      else if (child.gone === false) {
        delete child.gone
      }

      removeGone(child)
    }
  }
}
