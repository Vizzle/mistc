import { Writer } from "./writer"
import { binaryCompile, CompilationResult, Node } from "./compiler"

export function compileToBinary(tpl: any) {
  const w = new Writer()
  const r = binaryCompile(tpl)
  // console.log(JSON.stringify(r, undefined, 2))

  header(w)
  chunk(w, r, 'VALS', values)
  chunk(w, r, 'INFO', info)
  chunk(w, r, 'NODE', nodes)
  chunk(w, r, 'TREE', tree)

  return new Buffer(w.data())
}

function header(w: Writer) {
  w.writeChars('MST')
  w.writeUint8(1)
  w.writeUint8(0)
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
  w.writeUint16(r.info.controller)
  w.writeUint16(r.info.state)
  w.writeUint16(r.info.data)
  w.writePairList(r.info.notifications)
  w.writePairList(r.info.actions)
  w.writeUint16(r.info.extra)
}

function values(w: Writer, r: CompilationResult) {
  w.writeUint16(r.values.length)
  for (const c of r.values) {
    w.writeValue(c, v => r.values.findIndex(obj => obj.value === v))
  }
}

function nodes(w: Writer, r: CompilationResult) {
  w.writeUint16(r.nodes.length)
  for (const node of r.nodes) {
    w.writeUint16(node.type)
    w.writeUint16(node.gone)
    w.writeUint16(node.repeat)

    w.writePairList(node.vars)
    w.writePairList(node.styles)
    w.writePairList(node.properties)
    w.writePairList(node.extra)
  }
}

function tree(w: Writer, r: CompilationResult) {
  treeRecursive(w, r.nodes[0])
}

function treeRecursive(w: Writer, node: Node) {
  w.writeUint16(node.index)
  if (node.children) {
    w.writeUint16(node.children.length)
    for (const child of node.children) {
      treeRecursive(w, child)
    }
  } else {
    w.writeUint16(0)
  }
  
}
