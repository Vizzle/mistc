import { Value, ValueType, Length, ActionList, Expression, PairList } from "./compiler"

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
