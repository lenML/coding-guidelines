# behavior-driven-development

此处定义了 BDD 注释写法。基本要求为必须遵循每个测试都包含 "Given/When/Then" 语义化定义测试的行为。且，应该在测试之前书写。

BDD 测试注释写法示例：

```ts
import { describe, it, expect } from "vitest";

// 极简业务函数示例
function add(a: number, b: number): number {
  return a + b;
}

describe("计算器示例", () => {
  /**
   * 简单场景
   * Given 两个正整数 2 和 3
   * When 执行加法运算
   * Then 结果应为 5
   */
  it("正数相加", () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });

  /**
   * 稍复杂场景（使用 And / But）
   * Given 第一个数字为 5
   * And 第二个数字为 -2
   * When 执行加法运算
   * Then 结果应为 3
   * But 结果不应为 0
   *
   * @example add(5, -2) === 3
   */
  it("正负数相加", () => {
    const result = add(5, -2);
    expect(result).toBe(3);
    expect(result).not.toBe(0);
  });
});
```
