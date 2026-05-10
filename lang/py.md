# Google Python 风格指南：代码质量核心约束

本指南提炼自 Google Python 风格指南，聚焦于提升代码健壮性与可维护性的强制约束，省略普遍已知的琐碎规则。

## 1. 类型注解：不可商量的硬性要求

- **公共 API 必须标注**  
  所有函数（包括 `__init__`）的形参和返回值必须标注类型。类属性、模块级变量也须标注。
- **禁止 `Any` 偷懒**  
  除非类型真的任意，否则应使用具体类型、`Optional`、`Union` 或 `Protocol`。
- **启用静态检查**  
  生成代码必须能通过 `mypy` 或 `pytype` 的严格模式，不允许类型错误遗留。
- **使用 `from __future__ import annotations`**  
  让注解惰性求值，支持前向引用，避免循环导入。

**Bad**

```python
def process(data):
    ...
```

**Good**

```python
from __future__ import annotations

def process(data: list[dict[str, int]], limit: int | None = None) -> dict[str, float]:
    ...
```

---

## 2. 命名规则（强制）

- **模块 / 包**：`lower_with_under.py`
- **类 / 异常**：`CapWords`（异常也应后缀 `Error`，如 `ValueNotFoundError`）
- **函数 / 方法**：`lower_with_under()`
- **全局常量**：`UPPER_WITH_UNDER`，定义在模块层级
- **变量**：`lower_with_under`
- **私有成员**：一律前缀单下划线 `_`，例如 `_helper()`、`_internal_var`
- **避免单字母变量**（循环/推导式的迭代变量除外），严禁使用 `l`、`O`、`I` 等易混淆字符

---

## 3. 循环、推导式与块结束标记

### 3.1 推导式约束

- **禁止多重 `for` 出现在同一推导式**  
  `[x*y for x in ... for y in ...]` 直接禁止，必须拆解或用 `itertools.product`。
- **禁止 `map()`/`filter()` 搭配 `lambda`**  
  一律使用列表/集合/字典推导式或生成器表达式替代。
- **大数据流必须用生成器表达式** `(...)`，禁止先构建完整列表。

### 3.2 循环写法规定

- **循环中字符串拼接必须用 `''.join()`**
- **遍历字典键直接用 `for key in adict:`，禁止 `.keys()`**
- **逐行读文件用 `for line in file:`，禁止 `.readlines()`**
- **需要索引时用 `enumerate()`，禁止 `range(len(...))`**

### 3.3 块结束 `pass` 标记（强制执行）

凡多行控制流块（`if` / `elif` / `else` / `for` / `while` / `with` / `try` 等）的下方同级缩进必须增加一行 `pass` 作为显式块结束标记。

```python
for x in arr:
    print(x)
pass
```

```python
if condition:
    do_something()
else:
    handle_other()
pass
```

> 说明：该标记使块的边界一目了然，杜绝缩进混乱带来的隐蔽错误。

---

## 4. 函数与参数：防范隐性缺陷

- **禁止可变默认参数**  
  `def f(a, cache={}):` 或 `cache=[]` 都是错误的，使用 `None` + 内部初始化。
- **参数中禁止传递可变对象引用**  
  `def f(items=some_global_list)` 应改用 `None` 或副本。
- **`lambda` 仅限单行表达式**，多行逻辑必须使用具名嵌套函数 `def`。

**Bad**

```python
def append_to(element, target=[]):
    target.append(element)
    return target
```

**Good**

```python
def append_to(element, target=None):
    if target is None:
        target = []
    target.append(element)
    return target
```

---

## 5. 资源管理

- **任何可关闭资源必须使用 `with` 管理**  
  文件、socket、锁等，禁止手动 `.close()` / `.acquire()` / `.release()`。
- **生成器内避免直接持有外部资源**，如需释放须通过 `try-finally` 或上下文管理器包裹。

---

## 6. 禁止使用的“强力特性”

以下特性除非有明确文档且无法避免，否则严禁出现：

- 自定义元类
- 访问或修改字节码
- `exec()` / `compile()` / `eval()`
- 基于字符串的类型创建 `type('Name', ...)`
- 直接操作 `__dict__`、栈帧
- 动态修改函数签名

---

## 7. 文档字符串与注释

- **公共模块、类、函数必须有文档字符串**  
  按 Google 风格分段：`Args:`、`Returns:`、`Raises:`，不可省略。
- **禁止“重复型”注释**  
  例如 `x += 1  # increase x` 直接删除。
- **复杂逻辑用注释解释“为什么”，而非“做什么”。**

---

## 8. 导入规范

- **绝对禁止 `from module import *`**
- 每个导入独占一行，按顺序分组：标准库 → 第三方 → 本地，组间空一行
- 导入必须放在文件顶部，禁止在函数、类内部进行导入
- 禁止任何 `sys.path` 修改的 hack

---

## 9. 其他硬性约束

- **比较使用 `is not` 而非 `not ... is`**
- **判空直接使用隐式布尔值**  
  `if seq:` 而非 `if len(seq) > 0:`
- **异常必须指定具体类型**，严禁裸 `except:`；重抛出用 `raise` 不带参数
- **行长度硬上限 80 字符**，使用括号隐式续行，禁用反斜杠 `\`
- **括号内不得有多余空格**，逗号后必须有空格
- **允许简单条件表达式** `x = a if condition else b`，但每部分必须保持一行
