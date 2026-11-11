/* 配色方案（预览用）。palettes.html 读取这里的 PALETTES 逐套渲染。
   除第一套外，都由数值核对过：正文对比度 ≥ 7，圆点里的字 ≥ 4.5，八类颜色两两可分（含红绿色盲模拟）。 */
window.PALETTES = [
  {
    "id": "baseline",
    "name": "原来的配色",
    "baseline": true,
    "idea": "参考图的直接转译：灰白纸面放钮扣，纯黑屏幕上是糖果色的词语圆点，连线悬停时变红。",
    "paper": "#ECEAE5",
    "ink": "#141414",
    "night": "#000000",
    "nightInk": "#F3F1EA",
    "accent": "#FF5B4D",
    "nodeInk": "#111111",
    "categories": {
      "material": "#F4E766",
      "color": "#D9A3E3",
      "form": "#A7EAB2",
      "craft": "#5FBCA9",
      "era": "#90B9E3",
      "origin": "#F2ECCB",
      "use": "#F6A67E",
      "motif": "#F391B5"
    },
    "notes": "作为对照放在最前面。它的弱点是红绿色盲下有三对颜色很难分清：「颜色」和「年代」、「工艺」和「纹样」、「形制」和「产地」。"
  },
  {
    "id": "studio-candy-refined",
    "name": "棚白糖扣（已套用到网站）",
    "idea": "沿用参考图的路子：拍摄台的白底、纯黑屏幕、糖果色词语圆点和一根红线，只是把白底调得更亮更冷，把八个糖果色的明暗重新拉开。",
    "paper": "#F7F8F7",
    "ink": "#111317",
    "night": "#000000",
    "nightInk": "#F7F8F7",
    "accent": "#FF2D46",
    "nodeInk": "#101114",
    "categories": {
      "material": "#FFD92E",
      "color": "#BCA1FF",
      "form": "#A3F7A8",
      "craft": "#1FA696",
      "era": "#6585F5",
      "origin": "#EAEBFD",
      "use": "#FAA655",
      "motif": "#FAAEC6"
    },
    "notes": "和现在最接近，改动最小。八类颜色更容易分清，代价是「工艺」「年代」变深变艳，糖果感比原来硬一点；贝母白钮扣在这张纸上仍是最淡的一枚。"
  },
  {
    "id": "haberdashery-card",
    "name": "钮扣卡纸",
    "idea": "浅色页是老式钮扣卡的鸭蛋青卡纸配藏青油墨，深色页像一块藏青西装呢，八类词语是摆在呢料上的八轴缝线，悬停的连线用皮尺的黄色。",
    "paper": "#C3DDDA",
    "ink": "#141D3B",
    "night": "#0C1430",
    "nightInk": "#EEF0EA",
    "accent": "#FFD91A",
    "nodeInk": "#0C1430",
    "categories": {
      "material": "#F4A569",
      "color": "#C9A4F7",
      "form": "#C6E9F8",
      "craft": "#1B9187",
      "era": "#5C7EF0",
      "origin": "#EFEBCB",
      "use": "#6F8E33",
      "motif": "#FAA3BD"
    },
    "notes": "纸面明显带青，黄铜、牛角、朱红在上面很跳；象牙扣和纸的明暗几乎一样，只靠冷暖分开。墨黑钮扣在藏青底上靠高光立住。"
  },
  {
    "id": "specimen-drawer-baize",
    "name": "标本抽屉",
    "idea": "浅色页是博物馆的灰绿档案卡纸，深色页是标本抽屉里的墨绿台呢，八类词语用石黄、珊瑚、石青、石绿、赭石这些矿物颜料色，红色只留给悬停的那根线。",
    "paper": "#C1CEC0",
    "ink": "#14201B",
    "night": "#1E473A",
    "nightInk": "#F1EEDD",
    "accent": "#FF4A22",
    "nodeInk": "#10201A",
    "categories": {
      "material": "#F6CF33",
      "color": "#FBB5B1",
      "form": "#6094E6",
      "craft": "#36A56F",
      "era": "#D5AA5B",
      "origin": "#5B9DAE",
      "use": "#D3C5F8",
      "motif": "#F0FBFA"
    },
    "notes": "深色页不是黑的而是绿呢，气质最像“收藏”。代价：靛蓝、木质、墨黑钮扣在绿呢上偏暗，钮扣节点最好加一圈浅色细边；浅色页的几个浅色圆点要描边才看得清。"
  },
  {
    "id": "nacre-horn",
    "name": "贝昼角夜",
    "idea": "白天是贝母内壁的青灰，夜里是牛角的暖黑，八类词语各取一种钮扣材质的本色（黄铜、电木红、骨白、珐琅蓝、铜绿、贝母青、琉璃紫、珊瑚粉），连线悬停时是牛角透光的琥珀色。",
    "paper": "#BED5E1",
    "ink": "#16171A",
    "night": "#0B0806",
    "nightInk": "#EDF0EE",
    "accent": "#E89200",
    "nodeInk": "#140F0B",
    "categories": {
      "material": "#EBD45A",
      "color": "#CC595E",
      "form": "#F8E6C8",
      "craft": "#467BEC",
      "era": "#1A9391",
      "origin": "#9AC1FA",
      "use": "#A888D8",
      "motif": "#F5B3B8"
    },
    "notes": "冷底衬暖扣，钮扣最显眼的一套。代价：页面整体偏冷；琥珀强调色只在夜色上醒目；词语颜色取自材质，和钮扣本身的颜色最容易互相呼应，也最容易混。"
  },
  {
    "id": "riso-carbon-blue",
    "name": "复写蓝套印",
    "idea": "像一本双色孔版印刷的钮扣样本册：近白的纸上只用一罐群青蓝墨印字，夜里把同一罐蓝墨整版铺满，八类词语是压在蓝底上的平涂专色，悬停时亮起一道荧光粉。",
    "paper": "#FAFBFA",
    "ink": "#2420A8",
    "night": "#2420A8",
    "nightInk": "#FAFBFA",
    "accent": "#FF2E91",
    "nodeInk": "#0A0C3A",
    "categories": {
      "material": "#F7F04A",
      "color": "#E85C22",
      "form": "#A8F7F5",
      "craft": "#3E93B0",
      "era": "#F7A913",
      "origin": "#A3B5FD",
      "use": "#51D8A1",
      "motif": "#8974FF"
    },
    "notes": "最大胆、离现在最远的一套，文字也是蓝的。代价：靛蓝珐琅、墨黑、木质钮扣在蓝底上偏暗，钮扣节点需要一圈细白边。"
  }
];
