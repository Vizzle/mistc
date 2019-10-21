import * as path from 'path'
import * as fs from 'fs-extra'
import * as jsonc from 'jsonc-parser'

interface Context {
  inlinedMap: Record<string, any>
  stack: string[]
  file: string
}

export async function inlineComponents(file: string, content?: string, context: Context = { inlinedMap: {}, stack: [file], file }) {
  const found = context.inlinedMap[file]
  if (found) {
    return found
  }

  if (!content) {
    content = await fs.readFile(file, 'utf-8')
  }
  const errors: jsonc.ParseError[] = []
  const tpl = jsonc.parse(content, errors, { allowTrailingComma: true })

  if (errors.length > 0) {
    const message = `${file} 检查到 ${errors.length} 个语法错误：
${errors.map(e => `(${e.offset}:${e.length}) ${jsonc.printParseErrorCode(e.error)}`).join('\n')}`
    throw new Error(message)
  }

  if (tpl.layout) {
    await visitNode(tpl.layout, context)
  }

  context.inlinedMap[file] = tpl

  return tpl
}

async function visitNode(node: any, context: Context) {
  const $import = node['@import']
  const children = node.children
  if (children instanceof Array) {
    for (const child of children) {
      const slot = child.slot
      await visitNode(child, context)

      // 处理 @import 时会删除所有属性，这里避免组件子元素上的 slot 属性被删掉
      if ($import) {
        child.slot = slot
      }
    }
  }

  if ($import) {
    let componentPath = path.resolve(path.dirname(context.file), $import)
    if (!fs.existsSync(componentPath)) {
      componentPath += '.mist'
    }
    if (!fs.existsSync(componentPath)) {
      throw new Error(`找不到组件 ${$import}`)
    }

    if (context.stack.indexOf(componentPath) >= 0) {
      throw new Error(`不允许组件循环引用 ${$import}`)
    }

    const component = await inlineComponents(componentPath, undefined, {
      inlinedMap: context.inlinedMap,
      file: componentPath,
      stack: [...context.stack, componentPath]
    })

    replaceComponent(node, component)
  }
}

function replaceComponent(node: any, component: any) {
  // 拿出需要的属性，并删除所有属性
  const params = node.params
  const children = node.children
  for (const key in node) {
    delete node[key]
  }

  const componentParams = component.params

  // 拷贝一份节点信息，因为后面会作修改
  component = JSON.parse(JSON.stringify(component.layout))

  // params 转换为 vars（也是由于这个原因，目前组件只能有一个根节点）
  handleParams(params, component, componentParams)

  // 从 children 中解析出要插入组件的插槽 map
  const slotsMap: any = {}
  if (children) {
    for (const child of children) {
      const slot = child.slot || '$default'
      delete child.slot
      let nodes: any[] = slotsMap[slot]
      if (!nodes) {
        slotsMap[slot] = nodes = []
      }
      nodes.push(child)
    }
  }

  handleSlots(component, slotsMap)

  // 把替换完成的组件节点赋值回来
  for (const key in component) {
    node[key] = component[key]
  }
}

function handleParams(params: any, component: any, componentParams: any) {
  // 把组件中定义的参数默认值合并到入参中
  if (componentParams) {
    params = params || {}

    for (const key in componentParams) {
      const defaultValue = componentParams[key].default
      if (defaultValue !== undefined && params[key] === undefined) {
        params[key] = defaultValue
      }
    }

    if (Object.keys(params).length === 0) {
      params = undefined
    }
  }

  // 合并组件根节点的 vars
  if (params) {
    if (component.vars) {
      if (component.vars instanceof Array) {
        component.vars = [params, ...component.vars]
      }
      else {
        component.vars = [params, component.vars]
      }
    }
    else {
      pushFront(component, 'vars', params)
    }
  }
}

// 把插槽插入到组件的对应位置
function handleSlots(node: any, slotsMap: any) {
  const children = node.children
  if (children instanceof Array) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.type === 'slot') {
        const slotName = child.name || '$default'
        const nodes = slotsMap[slotName] || child.children || []
        children.splice(i, 1, ...nodes)
        i += nodes.length - 1
      }
      else {
        handleSlots(child, slotsMap)
      }
    }
  }
}

// 插入一个 key-value 到对象的最前面，为了输出 json 字符串时顺序更美观
function pushFront(obj: any, key: string, value: any) {
  const copy = { ...obj }
  for (const key in obj) {
    delete obj[key]
  }
  obj[key] = value
  for (const key in copy) {
    obj[key] = copy[key]
  }
}
