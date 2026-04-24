export const STORAGE_VERSION = 1;

export const DEFAULT_ACCOUNTS = [
  { id: "acc-wechat", name: "微信", symbol: "微", type: "ewallet", balance: 0, system: true, color: "#85d178" },
  { id: "acc-alipay", name: "支付宝", symbol: "支", type: "ewallet", balance: 0, system: true, color: "#63b8ff" },
  { id: "acc-bank", name: "银行卡", symbol: "卡", type: "bank", balance: 0, system: true, color: "#ff7f9e" },
  { id: "acc-cash", name: "现金", symbol: "现", type: "cash", balance: 0, system: true, color: "#ffc979" }
];

export const DEFAULT_CATEGORIES = [
  { id: "cat-canteen", name: "食堂", symbol: "饭", type: "expense", system: true, color: "#ff718f" },
  { id: "cat-takeout", name: "外卖", symbol: "卖", type: "expense", system: true, color: "#ff9d6b" },
  { id: "cat-milk-tea", name: "奶茶饮料", symbol: "茶", type: "expense", system: true, color: "#ff7cc0" },
  { id: "cat-transport", name: "交通", symbol: "行", type: "expense", system: true, color: "#7f98ff" },
  { id: "cat-shopping", name: "购物", symbol: "购", type: "expense", system: true, color: "#6cb3ff" },
  { id: "cat-dorm", name: "宿舍生活", symbol: "宿", type: "expense", system: true, color: "#a98aff" },
  { id: "cat-social", name: "娱乐社交", symbol: "乐", type: "expense", system: true, color: "#ff8db8" },
  { id: "cat-study", name: "学习资料", symbol: "学", type: "expense", system: true, color: "#7bd0a8" },
  { id: "cat-medical", name: "医疗", symbol: "医", type: "expense", system: true, color: "#59d6c0" },
  { id: "cat-other-expense", name: "其他", symbol: "其", type: "expense", system: true, color: "#cab7d8" },
  { id: "cat-allowance", name: "生活费", symbol: "生", type: "income", system: true, color: "#86cf73" },
  { id: "cat-parttime", name: "兼职", symbol: "兼", type: "income", system: true, color: "#76c9a0" },
  { id: "cat-scholarship", name: "奖学金", symbol: "奖", type: "income", system: true, color: "#5ac7b8" },
  { id: "cat-refund", name: "退款", symbol: "退", type: "income", system: true, color: "#65c4ff" },
  { id: "cat-redpacket", name: "红包", symbol: "红", type: "income", system: true, color: "#ff8f78" },
  { id: "cat-other-income", name: "其他", symbol: "其", type: "income", system: true, color: "#98c2ff" }
];

export const NAV_ITEMS = [
  { id: "dashboard", label: "首页", icon: "⌂" },
  { id: "ledger", label: "账单", icon: "≣" },
  { id: "quick", label: "快记", icon: "+" },
  { id: "analytics", label: "统计", icon: "◫" },
  { id: "settings", label: "我的", icon: "○" }
];

export const TRANSACTION_TABS = [
  { id: "all", label: "全部" },
  { id: "expense", label: "支出" },
  { id: "income", label: "收入" },
  { id: "transfer", label: "转账" }
];
