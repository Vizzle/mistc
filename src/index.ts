import { inlineComponents } from './inlineComponents'

interface CompileOptions {
  /**
   * 是否进行最小化处理
   */
  minify?: boolean
  /**
   * 平台
   */
  platform?: string
  
  debug?:boolean
}

export async function compile(file: string, options: CompileOptions = { minify: false, debug: false}, content?: string) {
  const result = await inlineComponents(file, content,  { inlinedMap: {}, stack: [file], file , platform : options.platform, debug : options.debug})
  return JSON.stringify(result, null, options.minify ? undefined : 2)
}
