# bdd + tdd

请遵循 bdd + tdd 流程。

流程如下

## 1. 根据用户需求产出 BDD 注释型空测试。

```ts
import { describe, it, expect } from "vitest";

function add(a: number, b: number): number {
  return;
}

describe("计算器示例", () => {
  /**
   * 简单场景
   * Given 两个正整数 2 和 3
   * When 执行加法运算
   * Then 结果应为 5
   */
  it("正数相加", () => {});
});
```

详细 BDD 看 ./behavior-driven-development/readme.md

## 2. 根据 BDD 注释，编写 RED 测试 （TDD RED 流程）

```ts
import { describe, it, expect } from "vitest";

function add(a: number, b: number): number {
  return;
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
});
```

详细 TDD 规范请看 ./test-driven-development/SKILL.md

## 3. 根据 TDD 测试，开发功能 （TDD GREEN 流程）

```ts
import { describe, it, expect } from "vitest";

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
});
```
