import { ExpressionNode, LiteralNode, IdentifierNode, ArrayExpressionNode, ObjectExpressionNode, ConditionalExpressionNode, UnaryExpressionNode, getUnaryOpText, BinaryExpressionNode, getBinaryOpText, SubscriptExpressionNode, FunctionExpressionNode, LambdaExpressionNode, ParenNode, UnaryOp, BinaryOp } from "./exp/parser"

class Variable {
  /**
   * value !== undefined 表示常量
   */
  value?: any
}

class Context {
  private variableTable: Map<string, Variable[]> = new Map()

  public push(key: string, value?: any) {
    let stack = this.variableTable.get(key)
    if (!stack) {
      stack = []
      this.variableTable.set(key, stack)
    }

    const variable: Variable = {}
    if (value instanceof ExpressionNode) {
      if (value instanceof LiteralNode) {
        variable.value = value.value
      }
    }
    else if (value !== undefined) {
      variable.value = value
    }

    stack.push(variable)
  }

  public pop(key: string) {
    let stack = this.variableTable.get(key)
    if (!stack) {
      throw new Error(`no variable named '${key}' to pop`)
    }
    stack.pop()
  }

  public get(key: string) {
    let stack = this.variableTable.get(key)
    if (stack) {
      return stack[stack.length - 1]
    }
    return undefined
  }
}

/**
 * 折叠 string, number, bool, null 常量，json 中的 null 不认为是常量
 * @param tpl 模板。模板中的表达式需要已解析为 ExpressionNode
 */
export function constantFoldingTemplate(tpl: any) {
  const ctx = new Context()


  const constantFoldingObject = (obj: any) => {
    if (obj instanceof ExpressionNode) {
      return constantFolding(obj, ctx)
    }
    else if (typeof obj === 'object') {
      for (const k in obj) {
        obj[k] = constantFolding(obj[k], ctx)
      }
      return obj
    }
    return obj
  }

  const constantFoldingElement = (node: any) => {
    if (node.repeat) {
      ctx.push('_index_')
      ctx.push('_item_')
    }

    const pushedVars: string[] = []
    if (node.vars) {
      let varsArr: any[] = node.vars
      if (!(varsArr instanceof Array)) {
        varsArr = [varsArr]
      }

      for (const vars of varsArr) {
        constantFoldingObject(vars)
        for (const key in vars) {
          ctx.push(key, vars[key])
          const v = ctx.get(key)
          if (v && shouldConstantPropagation(v)) {
            delete vars[key]
          }
        }
        pushedVars.push(...vars)
      }

      varsArr = varsArr.filter(vars => Object.keys(vars).length > 0)
      node.vars = varsArr.length === 0 ? undefined : varsArr.length === 1 ? varsArr[0] : varsArr
    }

    for (const key in node) {
      if (key !== 'repeat' && key !== 'vars' && key !== 'children') {
        node[key] = constantFoldingObject(node[key])
      }
    }

    (node.children || []).forEach(constantFoldingElement)

    for (const key of pushedVars) {
      ctx.pop(key)
    }

    if (node.repeat) {
      ctx.pop('_index_')
      ctx.pop('_item_')
    }
  }

  for (const key in tpl) {
    if (key !== 'layout') {
      tpl[key] = constantFoldingObject(tpl[key])
    }
  }

  constantFoldingElement(tpl.layout)
}

function numberValue(value: any) {
  if (typeof value === 'number') {
    return value
  }
  else if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  else {
    return 0
  }
}

function boolValue(value: any) {
  if (typeof value === 'boolean') {
    return value
  }
  else if (typeof value === 'number') {
    return value !== 0
  }
  else {
    return !isNull(value)
  }
}

function isNull(v: any) {
  return v === null || v === undefined
}

function equalsValue(v1: any, v2: any): boolean {
  if (isNull(v1) || isNull(v2)) {
    return numberValue(v1) === numberValue(v2)
  }
  return v1 === v2
}

function constantFolding(exp: ExpressionNode, ctx: Context): ExpressionNode {
  let folded = false
  const transform = (exp: ExpressionNode) => transformNode(exp, (node, parent) => {
    if (node instanceof IdentifierNode) {
      const variable = ctx.get(node.identifier)
      if (variable && shouldConstantPropagation(variable)) {
        folded = true
        return new LiteralNode(variable.value)
      }
    }
    else if (node instanceof UnaryExpressionNode) {
      if (node.operand instanceof LiteralNode) {
        folded = true
        switch (node.operator) {
          case UnaryOp.Positive: return new LiteralNode(+numberValue(node.operand.value))
          case UnaryOp.Negative: return new LiteralNode(-numberValue(node.operand.value))
          case UnaryOp.Not: return new LiteralNode(!boolValue(node.operand.value))
          default: throw new Error('unsupported unary operator')
        }
      }
    }
    else if (node instanceof BinaryExpressionNode) {
      if (node.operand1 instanceof LiteralNode && node.operand2 instanceof LiteralNode) {
        folded = true

        const v1 = node.operand1.value
        const v2 = node.operand2.value

        switch (node.operator) {
          case BinaryOp.Add: {
            if (typeof v1 === 'string' || typeof v2 === 'string') {
              return new LiteralNode(v1 + v2)
            }
            else {
              return new LiteralNode(numberValue(v1) + numberValue(v2))
            }
          }
          case BinaryOp.Sub: return new LiteralNode(numberValue(v1) - numberValue(v2))
          case BinaryOp.Mul: return new LiteralNode(numberValue(v1) * numberValue(v2))
          case BinaryOp.Div: return new LiteralNode(numberValue(v1) / numberValue(v2))
          case BinaryOp.Mod: return new LiteralNode(numberValue(v1) % numberValue(v2))
          case BinaryOp.And: return new LiteralNode(boolValue(v1) && boolValue(v2))
          case BinaryOp.Or: return new LiteralNode(boolValue(v1) || boolValue(v2))
          case BinaryOp.Equal: return new LiteralNode(equalsValue(v1, v2))
          case BinaryOp.NotEqual: return new LiteralNode(!equalsValue(v1, v2))
          case BinaryOp.EqualTriple: return new LiteralNode(equalsValue(v1, v2))
          case BinaryOp.NotEqualTriple: return new LiteralNode(!equalsValue(v1, v2))
          case BinaryOp.GreaterThan: return new LiteralNode(numberValue(v1) > numberValue(v2))
          case BinaryOp.LessThan: return new LiteralNode(numberValue(v1) < numberValue(v2))
          case BinaryOp.GreaterOrEqual: return new LiteralNode(numberValue(v1) >= numberValue(v2))
          case BinaryOp.LessOrEqual: return new LiteralNode(numberValue(v1) <= numberValue(v2))
          default: throw new Error('unsupported unary operator')
        }
      }
    }
    else if (node instanceof ConditionalExpressionNode) {
      if (node.condition instanceof LiteralNode) {
        folded = true
        return boolValue(node.condition.value) ? (node.truePart || node.condition) : node.falsePart
      }
    }
    else if (node instanceof ParenNode) {
      const exp = node.expression
      let unwrapParen = false
      if (!parent) {
        unwrapParen = true
      }
      else if (!(exp instanceof BinaryExpressionNode || exp instanceof UnaryExpressionNode || exp instanceof ConditionalExpressionNode)) {
        unwrapParen = true
      }

      if (unwrapParen) {
        folded = true
        return exp
      }
    }
    
    return node
  })

  do {
    folded = false
    exp = transform(exp)
  } while (folded)

  // add parens for number literals. (eg: `4.intValue`  =>  `(4).intValue`)
  transformNode(exp, (node, parent) => {
    if (node instanceof LiteralNode && typeof node.value === 'number' && parent instanceof FunctionExpressionNode && node === parent.target) {
      return new ParenNode(node)
    }
    return node
  })

  if (exp instanceof LiteralNode) {
    if (exp.value !== null) {
      return exp.value
    }
  }

  return exp
}

function shouldConstantPropagation(v: Variable) {
  return v.value !== undefined && (v.value === null || typeof v.value !== 'object')
}

function transformNode(node: ExpressionNode, visitor: (node: ExpressionNode, parent?: ExpressionNode) => ExpressionNode, parent?: ExpressionNode): ExpressionNode {
  node = visitor(node, parent)

  const transform = (n: ExpressionNode) => transformNode(n, visitor, node)

  if (node instanceof LiteralNode) {
    
  }
  else if (node instanceof IdentifierNode) {
    
  }
  else if (node instanceof ArrayExpressionNode) {
    node.list = node.list.map(transform)
  }
  else if (node instanceof ObjectExpressionNode) {
    node.list = node.list.map(([key, value]) => [key, transform(value)])
  }
  else if (node instanceof ConditionalExpressionNode) {
    node.condition = transform(node.condition)
    if (node.truePart) {
      node.truePart = transform(node.truePart)
    }
    node.falsePart = transform(node.falsePart)
  }
  else if (node instanceof UnaryExpressionNode) {
    node.operand = transform(node.operand)
  }
  else if (node instanceof BinaryExpressionNode) {
    node.operand1 = transform(node.operand1)
    node.operand2 = transform(node.operand2)
  }
  else if (node instanceof SubscriptExpressionNode) {
    node.target = transform(node.target)
    node.subscript = transform(node.subscript)
  }
  else if (node instanceof FunctionExpressionNode) {
    if (node.target) {
      node.target = transform(node.target)
    }
    if (node.parameters) {
      node.parameters = node.parameters.map(transform)
    }
  }
  else if (node instanceof LambdaExpressionNode) {
    node.expression = transform(node.expression)
  }
  else if (node instanceof ParenNode) {
    node.expression = transform(node.expression)
  }

  return node
}
