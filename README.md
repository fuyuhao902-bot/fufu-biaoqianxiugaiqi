# 标签修改器

一个基于 Streamlit 的标签修改工具，支持：

- 账号密码登录
- 默认管理员与人员管理
- 规则管理
- 批量导入旧命名
- 自动生成纠正后命名
- 改名对照导出为 Excel

## 默认管理员

- 账号：`admin`
- 密码：`Tonghua2026!`

## 本地运行

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## 主要文件

- `streamlit_app.py`：Streamlit 主应用
- `requirements.txt`：依赖清单
- `index.html` / `script.js` / `styles.css`：早期网页原型
