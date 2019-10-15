# mistc

Mist 组件编译工具

## Install

```shell
npm install -g mistc
```

## CLI Usage

```shell
mistc [options] file
```

Options:
  - `-o,--output <file>`    输出到指定文件
  - `-m,--minify`           是否进行最小化
  - `-v,--version`          输出版本号
  - `-h,--help`             显示帮助

## API Usage

```ts
import { compile } from 'mistc'

async function test() {
  const templatePath = '/path/to/the/template/file.mist'
  const compiledTemplate = await compile(templatePath, { minify: true })
  console.log(compiledTemplate)
}
```

## 组件编译说明

### 组件定义

使用与普通模板相似的写法定义一个组件，如下定义了一个组件文件 `foo.mist`

```json
{
  // 入参定义，可选，用于编译检查和插件提示
  "params": {
    "title": {
      "type": "string",
      "description": "标题"
    }
  },
  // 组件布局结构，与普通模板写法基本一致。暂时只支持一个根节点
  "layout": {
    "style": {
      "direction": "vertical"
    },
    "children": [
      {
        "type": "text",
        "style": {
          "text": "${title}", // 使用传入的参数
          "font-size": 18
        }
      },
      {
        // 定义插槽，与小程序的插槽类似。由于是编译期替换，暂不支持 slot-scope
        "type": "slot",
        "name": "content", // 插槽名称，可选
        "children": [ // 插槽默认内容，外部未传入插槽内容时使用
          {
            "type": "text",
            "style": {
              "text": "content"
            }
          }
        ]
      }
    ]
  }
}
```

### 组件引用

引用组件时只需在节点上使用 `@import` 属性，即可根据文件名引用另一组件（使用相对路径，可以省略 `.mist` 后缀名）

由于是编译期替换，组件引用不能引用自身，也不能包含循环引用

如下模板引用了上面定义的 foo 组件

```json
{
  "data": {
    "item": {
      "title": "标题",
      "content": "内容"
    }
  },
  "layout": {
    "children": [
      {
        // 注意这里只支持这几个属性，诸如 type, vars 等这些属性不能使用
        "@import": "foo",  // 引用 ./foo.mist 组件
        "params": { // 组件入参
          "title": "${item.title}"
        },
        "children": [
          {
            "slot": "content", // 放入的插槽名称，未指定时，放入默认插槽
            "type": "text",
            "style": {
              "text": "${item.content}" // 请注意在插槽中使用的变量名，可能会被组件内部同名变量覆盖
            }
          }
        ]
      }
    ]
  }
}
```

### 编译结果

编译时组件入参会定义为 vars，如果组件的根节点已经有 vars 属性，则合并为数组形式的 vars，入参放在前面。
上面的模板会被编译为如下结果：

```json
{
  "data": {
    "item": {
      "title": "标题",
      "content": "内容"
    }
  },
  "layout": {
    "children": [
      {
        "vars": {
          "title": "${item.title}"
        },
        "style": {
          "direction": "vertical"
        },
        "children": [
          {
            "type": "text",
            "style": {
              "text": "${title}",
              "font-size": 18
            }
          },
          {
            "type": "text",
            "style": {
              "text": "${item.content}"
            }
          }
        ]
      }
    ]
  }
}
```