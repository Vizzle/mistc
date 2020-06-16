import { Value, ValueType, Length, ActionList, Expression, PairList, Unit } from "./compiler"
import { ExpressionNode, LiteralNode, IdentifierNode, ArrayExpressionNode, ObjectExpressionNode, ConditionalExpressionNode, UnaryExpressionNode, getUnaryOpText, BinaryExpressionNode, getBinaryOpText, SubscriptExpressionNode, FunctionExpressionNode, LambdaExpressionNode, ParenNode, UnaryOp, BinaryOp } from "../exp/parser"
import { TextEncoder } from "util"

enum ExpCode {
  NONE,
  INT8,   // [int8]
  NUM,    // [double64]
  STR,    // [uint16] ref of value chunk
  BOOL,   // [int8]
  NULL,   // []
  ARR,    // [uint32, exps]
  OBJ,    // [uint32, key_values]
  ID,     // [uint8, chars]
  FUNC,   // [uint8, id[uint8, chars], target_exp, param_exps]
  COND,   // [cond_exp, true_exp, false_exp]
  LAMBDA, // [uint8, param_ids, exp]

  // [exp1]  unary operators
  NEG = 50, // -
  NOT,      // !
  POS,      // +

  // [exp1, exp2]  binary operators
  ADD = 70, // +
  SUB,      // -
  MUL,      // *
  DIV,      // /
  MOD,      // %
  EQ,       // ==
  NEQ,      // !+
  GT,       // >
  GTE,      // >=
  LT,       // <
  LTE,      // <=
  AND,      // &&
  OR,       // ||
  IDX,      // []
  EQT,      // ===
  NEQT,     // !==
}

export class Writer {
  private buf: Uint8Array
  private dv: DataView
  private offset: number
  private littleEndian: boolean

  constructor() {
    this.buf = new Uint8Array(100)
    this.dv = new DataView(this.buf.buffer)
    this.offset = 0
    this.littleEndian = false
  }

  public data() {
    return this.buf.slice(0, this.offset)
  }

  public writeChars(str: string, writeLength = false) {
    const data = new TextEncoder().encode(str)

    if (writeLength) {
      const length = data.length
      if (length >= 0xff) {
        this.writeUint8(0xff)
        this.writeInt32(length)
      }
      else {
        this.writeUint8(length)
      }
    }

    this.ensure(data.length)
    this.buf.set(data, this.offset)
    this.offset += data.length
  }

  public writeArray(arr: Uint8Array) {
    this.ensure(arr.length)
    this.buf.set(arr, this.offset)
    this.offset += arr.length
  }

  public writeInt8(n: number) {
    this.ensure(1)
    this.dv.setInt8(this.offset, n)
    this.offset += 1
  }

  public writeUint8(n: number) {
    this.ensure(1)
    this.dv.setUint8(this.offset, n)
    this.offset += 1
  }

  public writeInt16(n: number) {
    this.ensure(2)
    this.dv.setInt16(this.offset, n, this.littleEndian)
    this.offset += 2
  }

  public writeUint16(n: number) {
    this.ensure(2)
    this.dv.setUint16(this.offset, n, this.littleEndian)
    this.offset += 2
  }

  public writeInt32(n: number) {
    this.ensure(4)
    this.dv.setInt32(this.offset, n, this.littleEndian)
    this.offset += 4
  }

  public writeColor(n: number) {
    this.ensure(4)
    this.dv.setUint32(this.offset, n, this.littleEndian)
    this.offset += 4
  }

  public writeDouble(n: number) {
    this.ensure(8)
    this.dv.setFloat64(this.offset, n, this.littleEndian)
    this.offset += 8
  }

  public writeValue(c: Value, valueCallback: (obj: string) => number) {
    this.writeUint8(c.type)
    switch (c.type) {
      case ValueType.String: {
        this.writeChars(c.value as string, true)
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
        this.writeColor(c.value as number)
        break
      }
      case ValueType.Length: {
        const length = c.value as Length
        this.writeUint8(length.unit)
        if (length.unit < Unit.auto) {
          this.writeDouble(length.value)
        }
        break
      }
      case ValueType.Action: {
        this.writeActionList(c.value as ActionList)
        break
      }
      case ValueType.Enum: {
        this.writeUint16(c.value as number)
        break
      }
      case ValueType.Expression: {
        this.writeExpression(c.value as Expression, valueCallback)
        break
      }
      default: {
        throw new Error('不支持的 Value 类型')
      }
    }
  }

  public writePairList(pairList: PairList) {
    this.writeUint16(pairList.length)
    for (const item of pairList) {
      this.writeUint16(item.key)
      this.writeUint16(item.value)
    }
  }

  private writeExpression(exp: Expression, valueCallback: (obj: string) => number) {
    this.writeExpBin(exp.node, valueCallback)
  }

  private writeExpBin(node: ExpressionNode | null | undefined, valueCallback: (obj: string) => number) {
    if (!node) {
      this.writeUint8(ExpCode.NONE)
      return
    }

    const writeExpBin = (node: ExpressionNode | null | undefined) => this.writeExpBin(node, valueCallback)
    const writeString = (str: string) => {
      const index = valueCallback(str)
      if (index <= 0) {
        throw new Error(`找不到字符串常量 ${str}`)
      }
      this.writeUint16(index)
    }

    if (node instanceof LiteralNode) {
      const value = node.value
      if (typeof value === 'number') {
        if (value >= -128 && value <= 127 && parseInt(value + '') === value) {
          this.writeUint8(ExpCode.INT8)
          this.writeInt8(value)
        }
        else {
          this.writeUint8(ExpCode.NUM)
          this.writeDouble(value)
        }
      }
      else if (typeof value === 'string') {
        this.writeUint8(ExpCode.STR)
        writeString(value)
      }
      else if (typeof value === 'boolean') {
        this.writeUint8(ExpCode.BOOL)
        this.writeUint8(value ? 1 : 0)
      }
      else if (value === null || value === undefined) {
        this.writeUint8(ExpCode.NULL)
      }
      else {
        throw new Error('不支持的常量类型')
      }
    }
    else if (node instanceof IdentifierNode) {
      this.writeUint8(ExpCode.ID)
      writeString(node.identifier)
    }
    else if (node instanceof ArrayExpressionNode) {
      this.writeUint8(ExpCode.ARR)
      this.writeUint16(node.list.length)
      for (const c of node.list) {
        writeExpBin(c)
      }
    }
    else if (node instanceof ObjectExpressionNode) {
      this.writeUint8(ExpCode.OBJ)
      this.writeUint16(node.list.length)
      for (const c of node.list) {
        writeExpBin(c[0])
        writeExpBin(c[1])
      }
    }
    else if (node instanceof ConditionalExpressionNode) {
      this.writeUint8(ExpCode.COND)
      writeExpBin(node.condition)
      writeExpBin(node.truePart)
      writeExpBin(node.falsePart)
    }
    else if (node instanceof UnaryExpressionNode) {
      switch (node.operator) {
        case UnaryOp.Not: this.writeUint8(ExpCode.NOT); break
        case UnaryOp.Negative: this.writeUint8(ExpCode.NEG); break
        case UnaryOp.Positive: this.writeUint8(ExpCode.POS); break
        default: throw new Error('不支持的一元运算符')
      }
      writeExpBin(node.operand)
    }
    else if (node instanceof BinaryExpressionNode) {
      switch (node.operator) {
        case BinaryOp.Add: this.writeUint8(ExpCode.ADD); break
        case BinaryOp.Sub: this.writeUint8(ExpCode.SUB); break
        case BinaryOp.Mul: this.writeUint8(ExpCode.MUL); break
        case BinaryOp.Div: this.writeUint8(ExpCode.DIV); break
        case BinaryOp.Mod: this.writeUint8(ExpCode.MOD); break
        case BinaryOp.GreaterThan: this.writeUint8(ExpCode.GT); break
        case BinaryOp.GreaterOrEqual: this.writeUint8(ExpCode.GTE); break
        case BinaryOp.LessThan: this.writeUint8(ExpCode.LT); break
        case BinaryOp.LessOrEqual: this.writeUint8(ExpCode.LTE); break
        case BinaryOp.Equal: this.writeUint8(ExpCode.EQ); break
        case BinaryOp.NotEqual: this.writeUint8(ExpCode.NEQ); break
        case BinaryOp.EqualTriple: this.writeUint8(ExpCode.EQT); break
        case BinaryOp.NotEqualTriple: this.writeUint8(ExpCode.NEQT); break
        case BinaryOp.And: this.writeUint8(ExpCode.AND); break
        case BinaryOp.Or: this.writeUint8(ExpCode.OR); break
        default: throw new Error('不支持的二元运算符')
      }
      writeExpBin(node.operand1)
      writeExpBin(node.operand2)
    }
    else if (node instanceof SubscriptExpressionNode) {
      this.writeUint8(ExpCode.IDX)
      writeExpBin(node.target)
      writeExpBin(node.subscript)
    }
    else if (node instanceof FunctionExpressionNode) {
      this.writeUint8(ExpCode.FUNC)
      this.writeUint8(node.parameters ? node.parameters.length : 255)
      writeString(node.action.identifier)
      writeExpBin(node.target)
      for (const c of node.parameters || []) {
        writeExpBin(c)
      }
    }
    else if (node instanceof LambdaExpressionNode) {
      this.writeUint8(ExpCode.LAMBDA)
      this.writeUint8(1)
      writeString(node.parameter.identifier)
      writeExpBin(node.expression)
    }
    else if (node instanceof ParenNode) {
      writeExpBin(node.expression)
    }
    else {
      throw new Error(`unknown node`)
    }
  }

  private writeActionList(actList: ActionList) {
    this.writeUint8(actList.length)
    for (const act of actList) {
      this.writeUint16(act.if)
      this.writeUint16(act.type)
      this.writeUint16(act.params)
      this.writeUint16(act.result)
      this.writeActionList(act.success)
      this.writeActionList(act.error)
      this.writeActionList(act.finish)
    }
  }

  private ensure(bytes: number) {
    if (this.offset + bytes > this.buf.length) {
      const oldBuf = this.buf
      this.buf = new Uint8Array((this.offset + bytes) * 2)
      this.buf.set(oldBuf)
      this.dv = new DataView(this.buf.buffer)
    }
  }

}
