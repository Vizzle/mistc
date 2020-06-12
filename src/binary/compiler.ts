import { ExpressionNode } from "../exp/parser"
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
    state: PairList
    data: PairList
    notifications: PairList
    actions: PairList
    extra: PairList
  }
  nodes: Node[]
  values: Value[]
}

export function binaryCompile(tpl: any): CompilationResult {
  const values: Value[] = []
  const nodes: Node[] = []
  const env = new BinaryEnv(0)

  const createValue = (value: any, type: KeyType): Value => {
    const assertType = (targetType: KeyType) => {
      if (type !== targetType && type !== KeyType.Any) {
        throw new Error(`${JSON.stringify(value)} 值的类型不正确`)
      }
    }

    if (value === undefined) {
      return { type: ValueType.None }
    }

    if (typeof value === 'string') {
      if (value.startsWith('$:')) {
        const node = parseExpression(value.substr(2))
        return {
          type: ValueType.Expression,
          value: { node }
        }
      }
      else if (type === KeyType.Length) {
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
      const node = parseExpression(JSON.stringify(value, (_, v) => {
        if (typeof v === 'string' && v.startsWith('$:')) {
          return printNode(parseExpression(v.substr(2)))
        }
        return v
      }))

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
    return values.push(value) - 1
  }

  const convertNode = (obj: any) => {
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

    const style = attrs.style || {}
    for (const key in style) {
      const info = env.getKeyInfo(key)
      if (info) {
        node.properties.push({ key: info.index, value: getValueIndex(style[key], info.type) })
      }
      else {
        node.extra.push({ key: getValueIndex(key), value: getValueIndex(style[key]) })
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

  return {
    info: {
      controller: getValueIndex(tpl.controller),
      state: [],
      data: [],
      notifications: [],
      actions: [],
      extra: [],
    },
    nodes: nodes,
    values: values,
  }
}