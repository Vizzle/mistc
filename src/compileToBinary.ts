
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
}

enum Unit {
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

interface Length {
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

class Expression {

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
    controller: Value
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
    var buffer = new ArrayBuffer(8);
    var longNum = new Float64Array(buffer);
    longNum[0] = n;
    this.writeArray(Array.from(new Int8Array(buffer)))
  }

  public writeValue(c: Value) {
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
      case ValueType.Null: {
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
  const none: Value = {
    type: ValueType.None
  }

  // TODO

  return {
    info: {
      controller: none,
      state: [],
      data: [],
      notifications: [],
      actions: [],
      extra: [],
    },
    nodes: [],
    values: [],
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
  // TODO
}

function values(w: Writer, r: CompilationResult) {
  w.writeInt16(r.values.length)
  for (const c of r.values) {
    w.writeValue(c)
  }
}

function nodes(w: Writer, r: CompilationResult) {
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
