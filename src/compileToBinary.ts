
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

  private writeInt(n: number, bytes: number) {
    for (let i = bytes - 1; i >= 0; i--) {
      this.writeByte((n >> (i * 8)) & 0xff)
    }
  }

}

export function compileToBinary(tpl: any) {
  const w = new Writer()

  header(w)
  chunk(w, 'INFO', info)
  chunk(w, 'CONS', constants)
  chunk(w, 'EXPR', expressions)
  chunk(w, 'NODE', nodes)
  chunk(w, 'TREE', tree)

  return w.data()
}

function header(w: Writer) {
  w.writeChars('MST')
  w.writeByte(1)
  w.writeByte(0)
}

function chunk(w: Writer, chunkName: string, chunkCallback: (w: Writer) => void) {
  if (chunkName.length !== 4) {
    throw new Error('区块名称长度必须是 4 个字节')
  }

  const chunkWriter = new Writer()
  chunkCallback(chunkWriter)
  const chuckData = chunkWriter.data()
  w.writeInt32(chuckData.length + 8)
  w.writeChars(chunkName)
  w.writeArray(chuckData)
}

function info(w: Writer) {

}

function constants(w: Writer) {

}

function expressions(w: Writer) {

}

function nodes(w: Writer) {

}

function tree(w: Writer) {

}
