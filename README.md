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
  - `-u,--check-update`     检查更新，输出 JSON 字符串，属性有 hasUpdate, currentVersion, newVersion
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

使用与普通模板相似的写法定义一个组件，组件可以接收外部传入的**参数**和**插槽**。`layout` 定义的节点即为组件的根节点，目前不支持多个根节点。

<a name="4Zb0h"></a>
### 入参
入参通过变量引用。推荐在 `params` 属性描述参数定义，一来方便使用组件的时候能快速知道组件的入参，二来也可以实现编译检查和编辑器插件提示功能。

```json
"params": {
  "title": { // 参数名
    "default": "标题", // 默认值，未传入该参数时使用
    "type": "string", // 参数类型
    "description": "参数说明"
  },
  "param2": {
    "type": "number"
  }
}
```

#### 插槽

插槽机制与支付宝小程序类似，组件内通过 `slot` 节点定义插槽，引用组件时的子元素会插入到组件的插槽位置。

一个组件**可以定义多个插槽**，通过 `name` 属性定义插槽名称，不写 name 则为默认插槽。组件中的多个插槽也**可以使用相同的名称**，这种情况下插入的元素会在该名称的插槽下都存在。

需要注意的是同一个插槽可以插入多个根节点，依次插入在原来 slot 所在的位置。目前组件只能有一个根节点，因此组件的**根节点不能为 slot**。

##### 默认值

`slot` 节点可以通过它的 `children` 定义默认值，外部没有插入插槽的节点时，则使用默认值。

由于是编译期替换，暂不支持小程序的 slot-scope 特性。

如下定义了一个组件文件 `foo.mist`：

```json
{
  // 入参定义，可选，用于编译检查和插件提示
  "params": {
    "title": {// 参数名
      "type": "string", // 参数类型
      "description": "标题" // 参数说明
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
        // 定义插槽，这个节点会被插入的元素或默认内容替换
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

引用组件时只需在节点上使用 `@import` 属性，即可根据**文件名**引用另一组件（使用相对路径，可以省略 `.mist` 后缀名）。`@import` 属性所在的节点整个被替换为引用组件的 `layout` 节点。

引用组件时通过 `params` 属性传入参数；通过 `children` 传入插槽，每一个（直接）子元素会根据其 `slot` 属性插入到对应的插槽中，不写 `slot` 则插入到默认插槽，多个子元素可以插入到同一个插槽。

组件引用**支持嵌套**，即组件中可以引用别的组件。由于是编译期替换，组件引用**不能引用自身，也不能包含循环引用**。

如下模板引用了上面定义的 `foo` 组件：

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

编译时组件入参会定义为 `vars`，如果组件的根节点已经有 `vars` 属性，则合并为数组形式的 `vars`，入参放在前面。

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