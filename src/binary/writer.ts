import { Value, ValueType, Length, ActionList, Expression, PairList } from "./compiler"
import { ExpressionNode, LiteralNode, IdentifierNode, ArrayExpressionNode, ObjectExpressionNode, ConditionalExpressionNode, UnaryExpressionNode, getUnaryOpText, BinaryExpressionNode, getBinaryOpText, SubscriptExpressionNode, FunctionExpressionNode, LambdaExpressionNode, ParenNode, UnaryOp, BinaryOp } from "../exp/parser"

enum ExpCode {
  NONE,
  INT8,   // [int8]
  NUM,    // [double64]
  STR,    // [uint8, chars]
  STRL,   // [uint32, chars]
  BOOL,   // [int8]
  NULL,   // []
  ARR,    // [uint32, exps]
  OBJ,    // [uint32, key_values]
  ID,     // [uint8, chars]
  FUNC,   // [uint8, id[uint8, chars], target_exp, param_exps]
  COND,   // [cond_exp, true_exp, false_exp]
  LAMBDA, // [uint8, param_ids, exp]
  STRS,   // [uint8, exps]  list of expressions computed to a string

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
    this.writeExpBin(exp.node)
  }

  private writeExpBin(node: ExpressionNode | null | undefined) {
    if (!node) {
      this.writeByte(ExpCode.NONE)
      return
    }

    if (node instanceof LiteralNode) {
      const value = node.value
      if (typeof value === 'number') {
        if (value >= -128 && value <= 127 && parseInt(value + '') === value) {
          this.writeByte(ExpCode.INT8)
          this.writeByte(value)
        }
        else {
          this.writeByte(ExpCode.NUM)
          this.writeDouble(value)
        }
      }
      else if (typeof value === 'string') {
        if (value.length <= 255) {
          this.writeByte(ExpCode.STR)
          this.writeByte(value.length)
          this.writeChars(value)
        }
        else {
          this.writeByte(ExpCode.STRL)
          this.writeInt32(value.length)
          this.writeChars(value)
        }
      }
      else if (typeof value === 'boolean') {
        this.writeByte(ExpCode.BOOL)
        this.writeByte(value ? 1 : 0)
      }
      else if (value === null || value === undefined) {
        this.writeByte(ExpCode.NULL)
      }
      else {
        throw new Error('不支持的常量类型')
      }
    }
    else if (node instanceof IdentifierNode) {
      this.writeByte(ExpCode.ID)
      this.writeIdentifier(node.identifier)
    }
    else if (node instanceof ArrayExpressionNode) {
      this.writeByte(ExpCode.ARR)
      this.writeInt32(node.list.length)
      for (const c of node.list) {
        this.writeExpBin(c)
      }
    }
    else if (node instanceof ObjectExpressionNode) {
      this.writeByte(ExpCode.OBJ)
      this.writeInt32(node.list.length)
      for (const c of node.list) {
        this.writeExpBin(c[0])
        this.writeExpBin(c[1])
      }
    }
    else if (node instanceof ConditionalExpressionNode) {
      this.writeByte(ExpCode.COND)
      this.writeExpBin(node.condition)
      this.writeExpBin(node.truePart)
      this.writeExpBin(node.falsePart)
    }
    else if (node instanceof UnaryExpressionNode) {
      switch (node.operator) {
        case UnaryOp.Not: this.writeByte(ExpCode.NOT); break
        case UnaryOp.Negative: this.writeByte(ExpCode.NEG); break
        case UnaryOp.Positive: this.writeByte(ExpCode.POS); break
        default: throw new Error('不支持的一元运算符')
      }
      this.writeExpBin(node.operand)
    }
    else if (node instanceof BinaryExpressionNode) {
      switch (node.operator) {
        case BinaryOp.Add: this.writeByte(ExpCode.ADD); break
        case BinaryOp.Sub: this.writeByte(ExpCode.SUB); break
        case BinaryOp.Mul: this.writeByte(ExpCode.MUL); break
        case BinaryOp.Div: this.writeByte(ExpCode.DIV); break
        case BinaryOp.Mod: this.writeByte(ExpCode.MOD); break
        case BinaryOp.GreaterThan: this.writeByte(ExpCode.GT); break
        case BinaryOp.GreaterOrEqual: this.writeByte(ExpCode.GTE); break
        case BinaryOp.LessThan: this.writeByte(ExpCode.LT); break
        case BinaryOp.LessOrEqual: this.writeByte(ExpCode.LTE); break
        case BinaryOp.Equal: this.writeByte(ExpCode.EQ); break
        case BinaryOp.NotEqual: this.writeByte(ExpCode.NEQ); break
        case BinaryOp.EqualTriple: this.writeByte(ExpCode.EQT); break
        case BinaryOp.NotEqualTriple: this.writeByte(ExpCode.NEQT); break
        case BinaryOp.And: this.writeByte(ExpCode.AND); break
        case BinaryOp.Or: this.writeByte(ExpCode.OR); break
        default: throw new Error('不支持的二元运算符')
      }
      this.writeExpBin(node.operand1)
      this.writeExpBin(node.operand2)
    }
    else if (node instanceof SubscriptExpressionNode) {
      this.writeByte(ExpCode.SUB)
      this.writeExpBin(node.target)
      this.writeExpBin(node.subscript)
    }
    else if (node instanceof FunctionExpressionNode) {
      this.writeByte(ExpCode.FUNC)
      this.writeByte(node.parameters ? node.parameters.length : 255)
      this.writeIdentifier(node.action.identifier)
      this.writeExpBin(node.target)
      for (const c of node.parameters || []) {
        this.writeExpBin(c)
      }
    }
    else if (node instanceof LambdaExpressionNode) {
      this.writeByte(ExpCode.LAMBDA)
      this.writeByte(1)
      this.writeIdentifier(node.parameter.identifier)
      this.writeExpBin(node.expression)
    }
    else if (node instanceof ParenNode) {
      this.writeExpBin(node.expression)
    }
    else {
      throw new Error(`unknown node`)
    }
  }

  private writeIdentifier(id: string) {
    if (id.length > 255) {
      throw new Error('标识符长度不能大于 255')
    }
    this.writeByte(id.length)
    this.writeChars(id)
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
