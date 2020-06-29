import { ExpressionNode, visitNode, IdentifierNode, LiteralNode, FunctionExpressionNode, LambdaExpressionNode, ArrayExpressionNode, ObjectExpressionNode } from "../exp/parser"
import { BinaryEnv, KeyType } from "./defines"
import { parseExpression, printNode } from "../convertExpressions"
import { parseLength, parseColor } from "./utils"

export enum ValueType {
  None,
  Expression,
  String,
  Number,
  True,
  False,
  Null,
  Length,
  Color,
  Action,
  Enum,
  Array,
  Object,
}

export enum Unit {
  none,
  percent,
  px,
  rpx,
  vw,
  vh,
  vmin,
  vmax,
  cm,
  mm,
  q,
  in,
  pc,
  pt,

  auto = 100,
  content,
}

export interface Length {
  value: number
  unit: Unit
}

export interface Action {
  if: number
  type: number
  params: number
  result: number
  success: ActionList
  error: ActionList
  finish: ActionList
}

export type ActionList = Action[]

export interface Expression {
  node: ExpressionNode
}

export interface Value {
  type: ValueType
  value?: number | string | Expression | Length | ActionList | number[] | [number, number][]
}

export interface Pair {
  key: number
  value: number
}

export type PairList = Pair[]

export interface Node {
  styles: PairList
  properties: PairList
  extra: PairList
  type: number
  gone: number
  repeat: number
  vars: PairList
  index: number
  children: Node[]
}

export interface CompilationResult {
  info: {
    controller: number
    state: number
    data: number
    notifications: PairList
    actions: PairList
    extra: number
  }
  nodes: Node[]
  values: Value[]
  styles: [number, PairList][]
}

export function binaryCompile(tpl: any): CompilationResult {
  const values: Value[] = []
  const nodes: Node[] = []
  const env = new BinaryEnv(0)

  // 第一个 value 始终为 none
  values.push({ type: ValueType.None })

  const parseAction = (obj: any): ActionList => {
    if (obj instanceof Array) {
      return obj.map(parseAction).reduce((p, c) => (p.push(...c), p), <ActionList>[])
    }
    else {
      if (obj.type) {
        const action: Action = {
          if: getValueIndex(obj.if),
          type: getValueIndex(obj.type),
          params: getValueIndex(obj.params),
          result: getValueIndex(obj.result),
          success: parseAction(obj.success || []),
          error: parseAction(obj.error || []),
          finish: parseAction(obj.finish || []),
        }
        return [action]
      }
      else {
        const action: Action = {
          if: 0,
          type: getValueIndex('invoke'),
          params: getValueIndex(obj),
          result: 0,
          success: [],
          error: [],
          finish: []
        }
        return [action]
      }
    }
  }

  const createValue = (value: any, type: KeyType): Value => {
    const assertType = (targetType: KeyType) => {
      if (type !== targetType && type !== KeyType.Any) {
        throw new Error(`${JSON.stringify(value)} 值的类型不正确`)
      }
    }

    if (value === undefined) {
      return { type: ValueType.None }
    }

    if (value instanceof ExpressionNode) {
      return {
        type: ValueType.Expression,
        value: { node: value }
      }
    }
    else if (typeof value === 'string') {
      if (type === KeyType.Length) {
        return {
          type: ValueType.Length,
          value: parseLength(value)
        }
      }
      else if (type === KeyType.Color) {
        return {
          type: ValueType.Color,
          value: parseColor(value)
        }
      }
      else if (type === KeyType.Enum) {
        const index = env.getEnumIndex(value)
        if (index === undefined) {
          throw new Error(`未识别的枚举值 '${value}'`)
        }
        return {
          type: ValueType.Enum,
          value: index
        }
      }
      else {
        assertType(KeyType.String)
        return {
          type: ValueType.String,
          value
        }
      }
    }
    else if (typeof value === 'number') {
      if (type === KeyType.Length) {
        return {
          type: ValueType.Length,
          value: parseLength(value)
        }
      }
      else {
        assertType(KeyType.Number)
        return {
          type: ValueType.Number,
          value
        }
      }
    }
    else if (typeof value === 'boolean') {
      assertType(KeyType.Bool)
      return {
        type: value ? ValueType.True : ValueType.False,
      }
    }
    else if (value === null) {
      return {
        type: ValueType.Null,
      }
    }
    else if (value instanceof Array) {
      return {
        type: ValueType.Array,
        value: value.map(v => getValueIndex(v))
      }
    }
    else if (typeof value === 'object') {
      assertType(KeyType.Action)

      if (type === KeyType.Action) {
        return {
          type: ValueType.Action,
          value: parseAction(value),
        }
      }
      else {
        return {
          type: ValueType.Object,
          value: Object.keys(value).map(k => <[number, number]>[getValueIndex(k), getValueIndex(value[k])])
        }
      }
    }

    throw new Error(`未识别的值类型：${value} (${typeof value})`)
  }

  const equalsValue = (a: Value, b: Value) => {
    if (a.type !== b.type) {
      return false
    }

    switch (a.type) {
      case ValueType.String:
      case ValueType.Number:
      case ValueType.Color:
      case ValueType.Enum:
        return a.value === b.value
      case ValueType.Null:
      case ValueType.True:
      case ValueType.False:
      case ValueType.None:
        return true
      case ValueType.Expression:
        return printNode((a.value as Expression).node) === printNode((b.value as Expression).node)
      case ValueType.Length:
        const l1 = a.value as Length
        const l2 = b.value as Length
        return l1.unit === l2.unit && l1.value === l2.value
      case ValueType.Action:
        return false
      case ValueType.Array: {
        const arr1 = a.value as number[]
        const arr2 = b.value as number[]
        return arr1.length === arr2.length && arr1.every((v, i) => v === arr2[i])
      }
      case ValueType.Object: {
        const arr1 = a.value as [number, number][]
        const arr2 = b.value as [number, number][]
        return arr1.length === arr2.length && arr1.every((v, i) => v[0] === arr2[i][0] && v[1] === arr2[i][i])
      }

        return 
    }
    return false
  }

  const getValueIndex = (obj: any, type: KeyType = KeyType.Any): number => {
    const value = createValue(obj, type)
    const index = values.findIndex(v => equalsValue(v, value))
    if (index >= 0) {
      return index
    }

    if (value.type === ValueType.Expression) {
      const strings: string[] = []
      visitNode((value.value as Expression).node, node => {
        if (node instanceof IdentifierNode) {
          strings.push(node.identifier)
        }
        else if (node instanceof LiteralNode) {
          if (typeof node.value === 'string') {
            strings.push(node.value)
          }
        }
        else if (node instanceof FunctionExpressionNode) {
          strings.push(node.action.identifier)
        }
        else if (node instanceof LambdaExpressionNode) {
          strings.push(node.parameter.identifier)
        }
      })
      
      for (const value of strings) {
        const _ = getValueIndex(value)
      }
    }

    return values.push(value) - 1
  }

  const convertNode = (obj: any) => {
    if (obj instanceof ExpressionNode) {
      throw new Error('暂不支持节点为表达式');
    }

    if (typeof obj !== 'object' || obj instanceof Array) {
      throw new Error('节点格式错误，只能为 object');
    }

    if (obj.ref) {
      throw new Error('不支持 ref')
    }

    const node: Node = {
      type: getValueIndex(obj.type),
      gone: getValueIndex(obj.gone),
      repeat: getValueIndex(obj.repeat),
      index: nodes.length,
      children: [],
      vars: [],
      styles: [],
      properties: [],
      extra: [],
    }

    const repeatType = values[node.repeat].type
    if (!(repeatType === ValueType.None || repeatType === ValueType.Number || repeatType === ValueType.Expression || repeatType == ValueType.Array)) {
      throw new Error(`repeat 属性类型错误 ${repeatType}`)
    }

    nodes.push(node)

    if (obj.vars) {
      let vars: any = {}
      if (obj.vars instanceof Array) {
        for (const v of obj.vars) {
          vars = { ...vars, ...v }
        }
      }
      else {
        vars = obj.vars
      }
      for (const key in vars) {
        node.vars.push({ key: getValueIndex(key), value: getValueIndex(vars[key]) })
      }
    }

    const attrs = { ...obj }
    delete attrs.type
    delete attrs.gone
    delete attrs.repeat
    delete attrs.vars
    delete attrs.children

    const style = attrs.style || {}
    for (const key in style) {
      const info = env.getStyleKeyInfo(key)
      if (info) {
        const target = info.basic ? node.styles : node.properties
        target.push({ key: info.index, value: getValueIndex(style[key], info.type) })
        delete style[key]
      }
    }

    if (attrs.style && Object.keys(attrs.style).length === 0) {
      delete attrs.style
    }

    for (const key in attrs) {
      const info = env.getOuterKeyInfo(key)
      if (info && (info.basic || env.supportsType(obj.type))) {
        const target = info.basic ? node.styles : node.properties
        target.push({ key: info.index, value: getValueIndex(attrs[key], info.type) })
      }
      else {
        node.extra.push({ key: getValueIndex(key), value: getValueIndex(attrs[key], KeyType.Any) })
      }
    }

    // 保证这些 key 被编译到前面（且按照这里的顺序）
    const priorityProperties = ['class', 'margin', 'padding', 'corner-radius']
    for (const key of priorityProperties.reverse()) {
      const ref = env.getKeyInfo(key).index
      const index = node.properties.findIndex(item => item.key === ref)
      if (index >= 0) {
        node.properties.unshift(...node.properties.splice(index, 1))
      }
    }

    if (obj.children) {
      for (const child of obj.children) {
        if (typeof child === 'object' && !(child instanceof Array)) {
          node.children.push(convertNode(child))
        }
        else {
          throw new Error('节点格式不正确，目前不支持节点为表达式')
        }
      }
    }

    return node
  }

  inlineStylesForTemplate(tpl)

  convertNode(tpl.layout)

  const notifications = tpl.notifications || {}
  const actions = tpl.actions || {}

  const extra = { ...tpl }
  delete extra.controller
  delete extra.state
  delete extra.data
  delete extra.notifications
  delete extra.actions
  delete extra.layout
  delete extra.styles

  const styles: CompilationResult['styles'] = []

  if (tpl.styles) {
    for (const key in tpl.styles) {
      const style = tpl.styles[key]
      const list: PairList = Object.keys(style).map(k => <Pair>{ key: getValueIndex(k), value: getValueIndex(style[k]) })
      styles.push([getValueIndex(key), list])
    }
  }

  return {
    info: {
      controller: getValueIndex(tpl.controller),
      state: getValueIndex(tpl.state),
      data: getValueIndex(tpl.data),
      notifications: Object.keys(notifications).map(k => ({ key: getValueIndex(k), value: getValueIndex(notifications[k], KeyType.Action) })),
      actions: Object.keys(actions).map(k => ({ key: getValueIndex(k), value: getValueIndex(actions[k], KeyType.Action) })),
      extra: getValueIndex(extra),
    },
    nodes,
    values,
    styles,
  }
}

function inlineStylesForTemplate(tpl: any) {
  if (!tpl.styles) {
    return
  }
  
  const ctx = {
    hasUnknownClass: false
  }

  inlineStyleForNode(tpl.layout, tpl.styles, ctx)

  if (!ctx.hasUnknownClass) {
    delete tpl.styles
  }
}

function inlineStyleForNode(node: any, styles: any, ctx: { hasUnknownClass: boolean }) {
  if (node instanceof ExpressionNode) {
    return
  }

  const cls = node.class
  if (typeof cls === 'string') {
    const newStyle = {}
    const classes = cls.split(' ').filter((s: string) => s)
    for (const c of classes) {
      Object.assign(newStyle, styles[c] || {})
    }
    Object.assign(newStyle, node.style || {})
    node.style = newStyle
    delete node.class
  }
  else if (cls instanceof ExpressionNode) {
    ctx.hasUnknownClass = true
  }

  const children = node.children
  if (children && children instanceof Array) {
    children.forEach(node => inlineStyleForNode(node, styles, ctx))
  }
}
