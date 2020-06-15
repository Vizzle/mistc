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
    w.writeValue(c, v => r.values.findIndex(obj => obj.value === v))
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
