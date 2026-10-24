# 历史静态告警清理

2026-10-24。未部署生产。

## 结果

- ESLint：41 → 0，lint:strict 通过。
- TypeScript：98 → 0，typecheck:strict 通过。
- UI静态审计：41项原工具识别局限，经项目适配器按实际源码证据核对，严格审计剩余0项。没有新增按文件/行号忽略清单，没有修改插件缓存。
- 历史lint/typecheck诊断基线均已清空；新诊断将使默认检查失败。

## 修复

Window桥接声明直接从导出的实现推导；补充控制器、DOM、导航元组及浏览器运行环境类型。WorkspaceSelect声明可选id/onBlur，并保留字符串/数值选项的原值类型；练习数量显式转数值。删除无用导入、变量及转义。适配器脚本通过精确exported声明登记跨脚本调用函数，ESLint按实际script作用域解析；JSX组件引用通过专门规则登记，其他未使用变量仍报错。空catch核对后保留容错路径并注明理由，来源验证失败仍默认拒绝。

UI审计适配器 scripts/audit-ui.py 只读加载已安装的Premium 1.4.0审计器，支持 --auditor 指定其他安装路径。保留React组件大小写，避免将Select/Input/Button/Textarea当成原生标签；解析实际ID/选择器绑定、变量别名和委托点击证据；核对WorkspacePrimitives.install的受支持日期/单选适配。未适配的多选、时间输入及无动作按钮仍报错。原始上游工具不经此适配，仍可能显示同类误报；交付核验使用项目适配器，而非声称上游原始报告已清零。

## 验证

- node scripts/lint.mjs --strict：0。
- node scripts/typecheck.mjs --strict：0。
- node --test：234/234通过，包含新增2项ESLint规则反例。
- Python scripts/test-audit-ui.py：7/7通过，涵盖无动作按钮、无关绑定、委托属性匹配、JSX大小写、未适配原生控件与不支持的多选/时间类型。
- Python scripts/audit-ui.py：findings=[]。本地完整报告preview/audit-ui-fixed.json保留绑定证据。
- tasks-ui与calendar-ui构建、build-pages、check-assets及git diff --check通过。
- 浏览器：22个工作/私人页面×1440/768/390/320，共88组边界与主要表单检查，无页面/表单越界及运行时错误。日志preview/warnings-browser-matrix.log。
- 待办删除失败与焦点、娱乐筛选、单词保存失败重试及下一词焦点、React Bits触发与清理、打卡完成、减少动态效果均通过隔离回归。

本次没有改变业务数据、权限、主题与页面结构；测试记录均为隔离数据。
