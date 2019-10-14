import { inlineComponents } from './inlineComponents'

interface CompileOptions {
  /**
   * 是否进行最小化处理
   */
  minify?: boolean
}

export async function compile(file: string, options: CompileOptions = { minify: false }) {
  const result = await inlineComponents(file)
  return JSON.stringify(result, null, options.minify ? undefined : 2)
}
