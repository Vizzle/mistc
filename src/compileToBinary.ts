import { parseExpression, printNode } from "./convertExpressions"
import { ExpressionNode } from "./exp/parser"
import { parseLength, parseColor } from "./utils"
import { BinaryEnv, KeyType } from "./binaryDefines"

enum ValueType {
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

interface Action {
  if: number
  type: number
  params: number
  result: number
  success: ActionList
  error: ActionList
  finish: ActionList
}

type ActionList = Action[]

interface Expression {
  node: ExpressionNode
}

interface Value {
  type: ValueType
  value?: number | string | Expression | Length | ActionList
}

interface Pair {
  key: number
  value: number
}

type PairList = Pair[]

interface Node {
  properties: PairList
  extra: PairList
  type: number
  gone: number
  repeat: number
  vars: PairList
  index: number
  children: Node[]
}

interface CompilationResult {
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

class Writer {
  private buf: number[] = []

  public data() {
    return this.buf
  }

  public writeChars(str: string) {
    for (let i = 0; i < str.length; i++) {
      this.writeByte(str.charCodeAt(i))
    }
  }

  public writeByte(byte: number) {
    this.buf.push(byte)
  }

  public writeInt32(n: number) {
    this.writeInt(n, 4)
  }

  public writeInt16(n: number) {
    this.writeInt(n, 2)
  }

  public writeArray(arr: number[]) {
    this.buf.push(...arr)
  }

  public writeDouble(n: number) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer)
    view.setFloat64(0, n, false)
    this.writeArray(Array.from(new Int8Array(buffer)))
  }

  public writeValue(c: Value) {
    console.log('writeValue', c.type, c.value)
    this.writeByte(c.type)
    switch (c.type) {
      case ValueType.String: {
        const str = c.value as string
        if (str.length >= 0xff) {
          this.writeByte(0xff)
          this.writeInt32(str.length)
        }
        else {
          this.writeByte(str.length)
        }
        this.writeChars(str)
        break
      }
      case ValueType.Number: {
        this.writeDouble(c.value as number)
        break
      }
      case ValueType.True:
      case ValueType.False:
      case ValueType.Null:
      case ValueType.None: {
        break
      }
      case ValueType.Color: {
        this.writeInt32(c.value as number)
        break
      }
      case ValueType.Length: {
        const length = c.value as Length
        this.writeDouble(length.value)
        this.writeByte(length.unit)
        break
      }
      case ValueType.Action: {
        this.writeActionList(c.value as ActionList)
        break
      }
      case ValueType.Enum: {
        this.writeInt16(c.value as number)
        break
      }
      case ValueType.Expression: {
        this.writeExpression(c.value as Expression)
        break
      }
      default: {
        throw new Error('不支持的 Value 类型')
      }
    }
  }

  public writePairList(pairList: PairList) {
    this.writeInt16(pairList.length)
    for (const item of pairList) {
      this.writeInt16(item.key)
      this.writeInt16(item.value)
    }
  }

  private writeExpression(exp: Expression) {
    // TODO
  }

  private writeActionList(actList: ActionList) {
    this.writeByte(actList.length)
    for (const act of actList) {
      this.writeInt16(act.if)
      this.writeInt16(act.type)
      this.writeInt16(act.params)
      this.writeInt16(act.result)
      this.writeActionList(act.success)
      this.writeActionList(act.error)
      this.writeActionList(act.finish)
    }
  }

  private writeInt(n: number, bytes: number) {
    for (let i = bytes - 1; i >= 0; i--) {
      this.writeByte((n >> (i * 8)) & 0xff)
    }
  }

}

function compile(tpl: any): CompilationResult {
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

export function compileToBinary(tpl: any) {
  const w = new Writer()
  const r = compile(tpl)

  header(w)
  chunk(w, r, 'VALS', values)
  chunk(w, r, 'INFO', info)
  chunk(w, r, 'NODE', nodes)
  chunk(w, r, 'TREE', tree)

  return w.data()
}

function header(w: Writer) {
  w.writeChars('MST')
  w.writeByte(1)
  w.writeByte(0)
}

function chunk(w: Writer, r: CompilationResult, chunkName: string, chunkCallback: (w: Writer, r: CompilationResult) => void) {
  if (chunkName.length !== 4) {
    throw new Error('区块名称长度必须是 4 个字节')
  }

  const chunkWriter = new Writer()
  chunkCallback(chunkWriter, r)
  const chuckData = chunkWriter.data()
  w.writeInt32(chuckData.length + 8)
  w.writeChars(chunkName)
  w.writeArray(chuckData)
}

function info(w: Writer, r: CompilationResult) {
  w.writeInt16(r.info.controller)
  w.writePairList(r.info.state)
  w.writePairList(r.info.data)
  w.writePairList(r.info.notifications)
  w.writePairList(r.info.actions)
  w.writePairList(r.info.extra)
}

function values(w: Writer, r: CompilationResult) {
  w.writeInt16(r.values.length)
  for (const c of r.values) {
    w.writeValue(c)
  }
}

function nodes(w: Writer, r: CompilationResult) {
  w.writeInt16(r.nodes.length)
  for (const node of r.nodes) {
    w.writeInt16(node.type)
    w.writeInt16(node.gone)
    w.writeInt16(node.repeat)

    w.writePairList(node.vars)
    w.writePairList(node.properties)
    w.writePairList(node.extra)
  }
}

function tree(w: Writer, r: CompilationResult) {
  treeRecursive(w, r.nodes[0])
}

function treeRecursive(w: Writer, node: Node) {
  w.writeInt16(node.index)
  if (node.children) {
    w.writeInt16(node.children.length)
    for (const child of node.children) {
      treeRecursive(w, child)
    }
  } else {
    w.writeInt16(0)
  }
  
}
