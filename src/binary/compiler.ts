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
  value?: number | string | Expression | Length | ActionList
}

export interface Pair {
  key: number
  value: number
}

export type PairList = Pair[]

export interface Node {
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
}

function obj2Exp(obj: any): ExpressionNode {
  if (obj === undefined || obj === null || typeof obj === 'number' || typeof obj === 'boolean' || typeof obj === 'string') {
    return new LiteralNode(obj)
  }
  else if (obj instanceof ExpressionNode) {
    return obj
  }
  else if (obj instanceof Array) {
    return new ArrayExpressionNode(obj.map(obj2Exp))
  }
  else {
    return new ObjectExpressionNode(Object.keys(obj).map(k => [new LiteralNode(k), obj2Exp(obj[k])]))
  }
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
        return Object.keys(obj).map(key => {
          return <Action>{
            if: 0,
            type: getValueIndex('invoke'),
            params: getValueIndex(obj[key]),
            result: 0,
            success: [],
            error: [],
            finish: []
          }
        })
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
    else if (typeof value === 'object') {
      assertType(KeyType.Action)

      if (type === KeyType.Action) {
        return {
          type: ValueType.Action,
          value: parseAction(value),
        }
      }

      // object 转换为 object literal 表达式
      const node = obj2Exp(value)

      return {
        type: ValueType.Expression,
        value: { node }
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
    if (typeof obj !== 'object' || obj instanceof Array) {
      throw new Error('节点格式错误，只能为 object（目前暂不支持节点为表达式）')
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
      properties: [],
      extra: [],
    }

    const repeatType = values[node.repeat].type
    if (!(repeatType === ValueType.None || repeatType === ValueType.Number || repeatType === ValueType.Expression)) {
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
        node.properties.push({ key: info.index, value: getValueIndex(style[key], info.type) })
        delete style[key]
      }
    }

    if (attrs.style && Object.keys(attrs.style).length === 0) {
      delete attrs.style
    }

    for (const key in attrs) {
      const info = env.getOuterKeyInfo(key)
      if (info) {
        node.properties.push({ key: info.index, value: getValueIndex(attrs[key], info.type) })
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

  return {
    info: {
      controller: getValueIndex(tpl.controller),
      state: getValueIndex(tpl.state),
      data: getValueIndex(tpl.data),
      notifications: Object.keys(notifications).map(k => ({ key: getValueIndex(k), value: getValueIndex(notifications[k], KeyType.Action) })),
      actions: Object.keys(actions).map(k => ({ key: getValueIndex(k), value: getValueIndex(actions[k], KeyType.Action) })),
      extra: getValueIndex(extra),
    },
    nodes: nodes,
    values: values,
  }
}
