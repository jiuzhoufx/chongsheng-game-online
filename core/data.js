/**
 * ============================================================================
 *  《重生之我在破败家族力挽狂澜》—— core/data.js
 * ----------------------------------------------------------------------------
 *  文件职责：
 *    游戏的"数据仓库"：全部文案、数值、行动、事件、结局集中在这里。
 *    引擎(engine.js)负责"怎么算"，本文件负责"是什么"。
 *
 *  v0.5.0 文字瘦身 + 48 周长局：
 *    - 所有事件/结局文案压缩到 1~2 句（参考 Progress Knight / Kittens Game
 *      这类开源文字游戏的"一行字"密度）；
 *    - 一局 48 周，危机每 4 周一轮（6 个危机循环两遍），拍卖会 6 场。
 *
 *  【原创声明 / 侵权规避红线】
 *    全部文字、数值、剧情均为本项目原创，仅借鉴公共玩法类型。
 *    修改时禁止复制任何现有商业游戏的文案/数值/美术（详见 docs/PUBLISH_GUIDE.md）。
 *
 *  @version 0.5.0
 *  @see     docs/CHANGELOG.md  每次修改本文件，请在 CHANGELOG 里补一条记录！
 * ============================================================================
 */

/* ---------------------------------------------------------------------------
 * 0. 全局配置 CONFIG
 * ------------------------------------------------------------------------ */
var CONFIG = {
  VERSION: '0.7.1',            // 当前数据版本（与 CHANGELOG 保持同步）

  MAX_WEEKS: 48,               // 一局 48 周（v0.5.0 由 24 翻倍）
  AP_PER_WEEK: 3,              // 每周行动点

  START_CASH: 80000,           // 开局【公司账户】
  START_POCKET: 50000,         // 开局【个人钱包】
  START_DEBT: 3000000,         // 开局家族负债
  START_HEALTH: 55,            // 开局父亲健康（0~100）
  START_REPUTATION: 20,        // 开局声望（0~100）
  START_MORALE: 60,            // 开局士气（0~100）
  START_CHARM: 10,             // 开局魅力（0~100）

  TRANSFER_FEE: 0.1,           // 公司→个人 转账手续费率
  TRANSFER_S_AMOUNT: 50000,    // 小额转账额度
  TRANSFER_L_AMOUNT: 200000,   // 大额转账额度
  WEEKLY_POCKET_SALARY: 8000,  // 每周老板周薪（进个人钱包）
  CHICKEN_COST: 500000,        // 时光怀表售价

  WEEKLY_INTEREST_RATE: 0.005, // 每周债务利息（复利）
  WEEKLY_WAGE: 12000,          // 每周固定工资支出
  MEDICAL_COST: 20000,         // 第 1 周医疗费
  MEDICAL_COST_GROWTH: 800,    // 医疗费每周上涨（48 周长局，涨速减半）
  MEDICAL_HEAL: 18,            // 治疗恢复量
  NO_MEDICAL_DAMAGE: 12,       // 未治疗的健康损耗

  EVENT_CHANCE: 0.35,          // 普通周随机事件概率
  FORESIGHT_MAX: 4,            // 先知记忆次数（12 场危机，给 4 次窥探）

  REPAY_AMOUNT: 150000,        // 单次还款额
  INVEST_LOW_AMOUNT: 100000,   // 稳健理财投入
  INVEST_LOW_RETURN: 1.03,     // 稳健理财周回报倍数
  INVEST_HIGH_AMOUNT: 50000,   // 高风险投机投入

  STAFF_HIRE_COST: 8000,       // 招 1 名员工费用
  STAFF_MAX: 6,                // 员工上限
  STAFF_WEEKLY_WAGE: 1000,     // 每名员工周工资
  PRODUCT_MAINTENANCE: 5000,   // 产品线每级每周维护费

  MAX_EQUIPMENT: 5,            // 设备等级上限
  MAX_INVENTORY: 3,            // 原料库存上限
  TRUTH_NEED: 100,             // 调查进度满值
  DEBT_CRUSH: 8000000,         // 终局"债台高筑"线
  AUTO_BORROW_MULT: 2,         // 账户透支自动借高利贷的惩罚倍率

  DAD_RECOVERY_COST: 300000,   // "康复疗程"费用（救爸爸线的终点）
  DAD_RECOVERY_HEALTH: 80      // 需要父亲健康达到该值才能开始疗程
};

/* ---------------------------------------------------------------------------
 * 1. 行动定义 ACTIONS
 * ------------------------------------------------------------------------- */
var ACTIONS = [
  /* ===== 经营 ===== */
  { id: 'order', group: '经营', name: '接订单', icon: '📋',
    desc: '产出订单赚钱。声望/士气/设备/原料/魅力越高赚越多。', special: 'order' },

  { id: 'buy_material', group: '经营', name: '采购原料', icon: '📦',
    desc: '公司账户花 1.5 万囤原料（≤3份），每份让订单 +30%。',
    need: { cash: 15000 },
    effect: { cash: -15000, inventory: 1, log: '囤进一批便宜原料。' } },

  { id: 'upgrade', group: '经营', name: '升级设备', icon: '🏭',
    desc: '费用随等级递增，订单收益更高。', special: 'upgrade' },

  { id: 'booth', group: '经营', name: '街头试吃', icon: '🍢',
    desc: '声望 +5，士气 -3。',
    effect: { cash: 2000, reputation: 5, morale: -3, log: '夜市摊前排起了队。' } },

  /* ===== 产品线 ===== */
  { id: 'develop_gua', group: '产品线', name: '研发果脯', icon: '🍬',
    desc: '最便宜的一条线。每级 +15% 订单收益。', special: 'develop_gua' },
  { id: 'develop_guan', group: '产品线', name: '研发罐头', icon: '🥫',
    desc: '投入中等。每级 +15% 订单收益。', special: 'develop_guan' },
  { id: 'develop_lihe', group: '产品线', name: '研发礼盒', icon: '🎁',
    desc: '最贵最赚。每级 +15% 订单收益。', special: 'develop_lihe' },

  /* ===== 员工 ===== */
  { id: 'hire_staff', group: '员工', name: '招人', icon: '🧑‍🏭',
    desc: '8000/人（≤6人）。每名 +8% 订单，周薪 +1000。',
    need: { cash: 8000 }, special: 'hire_staff' },
  { id: 'fire_staff', group: '员工', name: '辞退', icon: '📤',
    desc: '省工资，但士气 -8、声望 -2。', special: 'fire_staff' },

  /* ===== 债务 ===== */
  { id: 'negotiate', group: '债务', name: '与债主周旋', icon: '🤝',
    desc: '本周免息，声望 -4。',
    effect: { reputation: -4, flags: { deferInterest: 1 },
      log: '酒桌上把利息的事压下了。' } },
  { id: 'repay', group: '债务', name: '偿还欠款', icon: '💸',
    desc: '公司账户还 15 万，声望 +2。',
    need: { cash: 150000 }, special: 'repay' },

  /* ===== 转账（不耗行动点） ===== */
  { id: 'transfer_s', group: '转账', name: '转 5 万到钱包', icon: '💳',
    desc: '10% 手续费。不耗行动点。', need: { cash: 50000 }, special: 'transfer_s' },
  { id: 'transfer_l', group: '转账', name: '转 20 万到钱包', icon: '🏧',
    desc: '10% 手续费。不耗行动点。', need: { cash: 200000 }, special: 'transfer_l' },

  /* ===== 产业（v0.6.0）：一步步买资产，从摆摊到物流园 ===== */
  { id: 'buy_factory', group: '产业', name: '赎回食品厂', icon: '🏭',
    desc: '20 万赎回核心老厂：订单 +15%，周入 1.5 万。',
    need: { cash: 200000 }, special: 'buy_factory' },
  { id: 'buy_van', group: '产业', name: '买送货面包车', icon: '🚚',
    desc: '8 万：订单 +10%。',
    need: { cash: 80000 }, special: 'buy_van' },
  { id: 'hire_manager', group: '产业', name: '聘请经理', icon: '🧑‍💼',
    desc: '15 万：每周自动接一单（不耗行动点），周薪 3000。',
    need: { cash: 150000 }, special: 'hire_manager' },
  { id: 'buy_clinic', group: '产业', name: '买康复理疗仪', icon: '🩺',
    desc: '25 万：父亲每周自动 +4 健康。',
    need: { cash: 250000 }, special: 'buy_clinic' },
  { id: 'buy_branch', group: '产业', name: '开城东分厂', icon: '🏬',
    desc: '35 万：每周净入 3 万。',
    need: { cash: 350000 }, special: 'buy_branch' },
  { id: 'buy_logistics', group: '产业', name: '建冷库物流园', icon: '🚛',
    desc: '80 万：每周净入 8 万，产业顶点。',
    need: { cash: 800000 }, special: 'buy_logistics' },

  /* ===== 家庭 ===== */
  { id: 'care', group: '家庭', name: '陪护父亲', icon: '🫂',
    desc: '健康 +8，士气 +6。',
    effect: { health: 8, morale: 6, log: '父亲念叨起第一批果脯的味道。' } },
  { id: 'medical', group: '家庭', name: '支付医疗费', icon: '🏥',
    desc: '钱包支付，费用随周数上涨。健康 +18。', special: 'medical' },
  { id: 'recovery_course', group: '家庭', name: '康复疗程', icon: '🎗️',
    desc: '健康≥80 时可做：30 万根治父亲的病——他再也不需要治疗了。',
    special: 'recovery_course' },

  /* ===== 人脉 ===== */
  { id: 'chamber', group: '人脉', name: '拜访商会', icon: '🏛️',
    desc: '声望 +4、魅力 +3，可能遇到投资人。',
    effect: { reputation: 4, charm: 3,
      risk: { chance: 0.3,
        win: { cash: 50000, flags: { metInvestor: 1 },
          log: '一位老板当场注入 5 万周转金！' },
        lose: { log: '名片收了一堆，回应寥寥。' } },
      log: '提着果篮拜访了商会的老前辈。' } },
  { id: 'media', group: '人脉', name: '接受采访', icon: '🎤',
    desc: '声望 +8、魅力 +2，士气 -5。',
    effect: { reputation: 8, charm: 2, morale: -5, log: '采访播出后订货电话被打爆。' } },

  /* ===== 暗线 ===== */
  { id: 'investigate', group: '暗线', name: '追查资金流向', icon: '🔍',
    desc: '进度 +10~18，满 100 揭开三叔的真面目。', special: 'investigate' },

  /* ===== 投资 ===== */
  { id: 'invest_low', group: '投资', name: '稳健理财', icon: '🏦',
    desc: '钱包投 10 万，下周回 10.3 万。',
    need: { pocket: 100000 }, special: 'invest_low' },
  { id: 'invest_high', group: '投资', name: '高风险投机', icon: '🎲',
    desc: '钱包投 5 万：55% 赚 30%，45% 亏 15%。',
    need: { pocket: 50000 }, special: 'invest_high' },

  /* ===== 道具（不耗行动点） ===== */
  { id: 'use_aid', group: '道具', name: '用急救箱', icon: '🧰',
    desc: '健康 +25。', special: 'use_aid' },
  { id: 'use_invite', group: '道具', name: '用邀请函', icon: '📨',
    desc: '声望 +6、魅力 +8。', special: 'use_invite' },
  { id: 'buy_chicken', group: '道具', name: '买时光怀表', icon: '⏱️',
    desc: '50 万。可回到本周开始。', need: { cash: 500000 }, special: 'buy_chicken' },
  { id: 'use_chicken', group: '道具', name: '转动怀表', icon: '🌀',
    desc: '回到最近一次的周初。', special: 'use_chicken' },

  /* ===== 金手指 ===== */
  { id: 'foresight', group: '金手指', name: '先知记忆', icon: '⚡',
    desc: '窥探下一场危机的情报（全局 4 次）。', special: 'foresight' }
];

var SPECIAL_ACTIONS = {
  order: 1, upgrade: 1, repay: 1, medical: 1,
  investigate: 1, invest_low: 1, invest_high: 1, foresight: 1,
  transfer_s: 1, transfer_l: 1, buy_chicken: 1,
  use_aid: 1, use_invite: 1, use_chicken: 1,
  develop_gua: 1, develop_guan: 1, develop_lihe: 1,
  hire_staff: 1, fire_staff: 1,
  buy_factory: 1, buy_van: 1, hire_manager: 1, buy_clinic: 1,
  buy_branch: 1, buy_logistics: 1, recovery_course: 1
};

var NO_AP_ACTIONS = {
  foresight: 1, transfer_s: 1, transfer_l: 1,
  use_aid: 1, use_invite: 1, use_chicken: 1
};

/* ---------------------------------------------------------------------------
 * 1.4 产品线（每条 3 级；订单收益 +15%/级；每周维护费 5000/级）
 * ------------------------------------------------------------------------- */
var PRODUCTS = [
  { id: 'gua',  name: '古法果脯', icon: '🍬', costBase: 60000,  desc: '爷爷的看家手艺。' },
  { id: 'guan', name: '果香罐头', icon: '🥫', costBase: 120000, desc: '走商超渠道。' },
  { id: 'lihe', name: '节庆礼盒', icon: '🎁', costBase: 250000, desc: '节日礼品市场。' }
];

/* ---------------------------------------------------------------------------
 * 1.4 产业链 ASSETS（v0.6.0 新增）—— 一步步买资产的核心成长线
 * ---------------------------------------------------------------------------
 *   stall(早点摊) 开局就有：自己进货、自己跑街，周入 2000；
 *   factory(食品厂) 赎回后订单收益 +15%；van(货车) +10%；
 *   manager(经理) 花钱雇：每周自动替你接一单（不耗行动点，周薪 3000）；
 *   clinic(理疗仪)：父亲每周自动 +4 健康——救爸爸的基建；
 *   branch/logistics：躺着收钱的大资产。
 * ------------------------------------------------------------------------- */
var ASSETS = [
  { id: 'stall',     name: '早点摊',     icon: '🏪', cost: 0,       weekly: 2000,   desc: '父亲留下的起点，自己进货自己卖。' },
  { id: 'factory',   name: '建国食品厂', icon: '🏭', cost: 200000,  weekly: 15000,  orderBonus: 0.15, desc: '赎回核心老厂：订单收益 +15%。' },
  { id: 'van',       name: '送货面包车', icon: '🚚', cost: 80000,   weekly: 0,      orderBonus: 0.10, desc: '送货快人一步：订单收益 +10%。' },
  { id: 'manager',   name: '职业经理',   icon: '🧑‍💼', cost: 150000,  weekly: -3000,  autoOrder: true,  desc: '每周自动替你接一单（不耗行动点），周薪 3000。' },
  { id: 'clinic',    name: '康复理疗仪', icon: '🩺', cost: 250000,  weekly: 0,      heal: 4,          desc: '装在家里：父亲每周自动 +4 健康。' },
  { id: 'branch',    name: '城东分厂',   icon: '🏬', cost: 350000,  weekly: 30000,  desc: '第二家厂，每周净入 3 万。' },
  { id: 'logistics', name: '冷库物流园', icon: '🚛', cost: 800000,  weekly: 80000,  desc: '产业顶点，每周净入 8 万。' }
];

/** 拍卖会固定周（48 周长局共 6 场） */
var AUCTION_WEEKS = { 6: 1, 14: 1, 22: 1, 30: 1, 38: 1, 46: 1 };

/* ---------------------------------------------------------------------------
 * 1.5 成就 ACHIEVEMENTS
 * ------------------------------------------------------------------------- */
var ACHIEVEMENTS = [
  { id: 'first_repay', name: '第一桶金的诚意', desc: '第一次还款',
    cond: function (s) { return s.flags.repaidOnce === 1; } },
  { id: 'debt_half', name: '斩断一半锁链', desc: '债务还掉一半',
    cond: function (s) { return s.debt <= CONFIG.START_DEBT / 2; } },
  { id: 'health_full', name: '妙手回春', desc: '父亲健康达到 90',
    cond: function (s) { return s.health >= 90; } },
  { id: 'rep_60', name: '商界新星', desc: '声望达到 60',
    cond: function (s) { return s.reputation >= 60; } },
  { id: 'charm_50', name: '宴会明星', desc: '魅力达到 50',
    cond: function (s) { return s.charm >= 50; } },
  { id: 'truth', name: '真相在手', desc: '查清三叔的全部证据',
    cond: function (s) { return s.investigation >= CONFIG.TRUTH_NEED; } },
  { id: 'equip_max', name: '焕然一新的老厂', desc: '设备满级',
    cond: function (s) { return s.equipment >= CONFIG.MAX_EQUIPMENT; } },
  { id: 'millionaire', name: '账户里的百万', desc: '公司账户达到 100 万',
    cond: function (s) { return s.cash >= 1000000; } },
  { id: 'survive_w12', name: '最难的十周', desc: '撑过第 12 周危机',
    cond: function (s) { return s.week > 12; } },
  { id: 'products_max', name: '匠心工厂', desc: '三条产品线满级',
    cond: function (s) {
      var total = 0, max = 0;
      for (var p in (s.products || {})) { if (s.products.hasOwnProperty(p)) { total += s.products[p]; max += 3; } }
      return max > 0 && total >= max;
    } },
  { id: 'staff_full', name: '知人善任', desc: '员工满 6 人',
    cond: function (s) { return s.staff >= 6; } },
  { id: 'dad_recovered', name: '爸爸康复了', desc: '完成康复疗程，根治父亲的病',
    cond: function (s) { return s.flags.dadRecovered === 1; } },
  { id: 'tycoon', name: '产业大亨', desc: '买下全部产业',
    cond: function (s) {
      if (!s.assets) { return false; }
      for (var a in s.assets) { if (s.assets.hasOwnProperty(a) && !s.assets[a]) { return false; } }
      return true;
    } }
];

/* ---------------------------------------------------------------------------
 * 2. 随机事件库（v0.5.0 文字全部压缩到一两句）
 * ------------------------------------------------------------------------- */
var RANDOM_EVENTS = [
  { id: 'ev_old_friend', title: '老同学找上门',
    text: '同桌阿彪拎着酒来："这五万你拿去周转，赚了再还！"',
    options: [
      { label: '收下这份情', effect: { cash: 20000, flags: { owedFriend: 1 }, log: '借条压在了抽屉最底下。' } },
      { label: '婉拒', effect: { morale: 3, log: '"你小子还是这么犟。"' } }
    ] },
  { id: 'ev_supplier', title: '低价原料',
    text: '供应商老周压低声音："这批果糖浆，市价一半，走不走？"',
    options: [
      { label: '走货', effect: { cash: -12000, inventory: 1, log: '凌晨卸货，便宜一大截。' } },
      { label: '来路不明，算了', effect: { reputation: 2, log: '没碰说不清来路的便宜。' } }
    ] },
  { id: 'ev_inspection', title: '突击检查',
    text: '市场监管突击检查，车间卫生死角被翻了出来。',
    options: [
      { label: '连夜整改', effect: { cash: -8000, morale: -4, reputation: 5, log: '通宵大扫除，检查组点了头。' } },
      { label: '托人打点', effect: { cash: -5000,
          risk: { chance: 0.4,
            win: { log: '检查草草收场，你后背发凉。' },
            lose: { cash: -15000, reputation: -8, log: '吃了罚单，还被报纸点了名。' } } } }
    ] },
  { id: 'ev_rival_dump', title: '对手倾销',
    text: '城东新公司把同类产品打到七折，明摆着要拖死老厂。',
    options: [
      { label: '跟降价', effect: { cash: -8000, reputation: 2, log: '咬牙跟了两周，客流保住了。' } },
      { label: '主打品质', effect: { morale: -6, log: '客人少了些，留下的都成了回头客。' } }
    ] },
  { id: 'ev_worker_hurt', title: '老师傅工伤',
    text: '灌装线出事故，二十年工龄的陈师傅烫伤了手。',
    options: [
      { label: '全额垫付医药费', effect: { cash: -15000, morale: 10, reputation: 4, items: { aid: 1 },
          log: '陈师傅老伴儿把家里的急救箱塞给了你。' } },
      { label: '按最低标准', effect: { morale: -12, log: '工人们眼神变了。' } }
    ] },
  { id: 'ev_viral', title: '意外走红',
    text: '父亲当年教徒弟的旧视频一夜转发破十万。',
    options: [
      { label: '趁热直播', effect: { reputation: 10, cash: 5000, morale: -4, log: '订单电话被打爆。' } },
      { label: '低调处理', effect: { reputation: 3, log: '热度交给了厂里的年轻人。' } }
    ] },
  { id: 'ev_counterfeit', title: '冒牌货',
    text: '夜市出现印着"建国牌"的山寨果脯。',
    options: [
      { label: '律师函维权', effect: { cash: -10000, reputation: 5, log: '批发商连夜下架了假货。' } },
      { label: '上门打假', effect: { morale: -5, cash: 3000, reputation: 2, log: '守了一晚上，扣了假货卖了真货。' } }
    ] },
  { id: 'ev_rent', title: '房东涨租',
    text: '房东拍桌子："附近都涨了！"',
    options: [
      { label: '签长约', effect: { cash: -10000, log: '三年长约锁死了涨幅。' } },
      { label: '搬走', effect: { cash: -3000, morale: -8, log: '搬家折腾了一整周。' } }
    ] },
  { id: 'ev_extortion', title: '职业打假人',
    text: '有人举着手机进厂："标签有问题，赔三万，私了。"',
    options: [
      { label: '花钱消灾', effect: { cash: -15000, log: '他还会再来的。' } },
      { label: '依法硬刚', effect: {
          risk: { chance: 0.5,
            win: { reputation: 6, morale: 5, log: '市监局复核合规，他上了本地新闻。' },
            lose: { cash: -8000, reputation: -3, log: '确实有个小瑕疵，赔了八千。' } } } }
    ] },
  { id: 'ev_intern', title: '返乡大学生',
    text: '学食品的小唐来应聘："我想把老厂做进电商。"',
    options: [
      { label: '招进来', effect: { cash: -5000, morale: 6, flags: { hiredTang: 1 }, items: { invite: 1 },
          log: '她上任就挂上三个平台，还送来一张商务邀请函。' } },
      { label: '婉拒', effect: { morale: -3, log: '姑娘走了，车间安静了一会儿。' } }
    ] },
  { id: 'ev_grave', title: '爷爷的坟前',
    text: '清明将至，父亲病着去不了老家。',
    options: [
      { label: '替父亲去', effect: { morale: 10, reputation: 2, log: '回来那天，父亲气色好了些。' } },
      { label: '走不开', effect: { morale: -5, log: '托人送了纸钱，心里空落落的。' } }
    ] },
  { id: 'ev_tax', title: '会计的"建议"',
    text: '新会计凑过来："账这么走能省税……就是有点擦边。"',
    options: [
      { label: '依法纳税', effect: { cash: -6000, reputation: 3, log: '账目理得干干净净。' } },
      { label: '激进"避税"', effect: { cash: 15000,
          risk: { chance: 0.3,
            win: { log: '胆子换来了利润……暂时。' },
            lose: { cash: -30000, reputation: -10, flags: { dirty: 1 }, log: '税务稽查上门，圈子里传开了。' } } } }
    ] },
  { id: 'ev_flood', title: '暴雨夜',
    text: '台风夜，老仓库开始渗水。',
    options: [
      { label: '全厂抢险', effect: { cash: -10000, morale: 5, log: '干到天亮，原料保住了。' } },
      { label: '只保设备', effect: { inventory: -99, morale: -6, log: '两车原料泡了汤。' } }
    ] },
  { id: 'ev_poach', title: '同行挖角',
    text: '对手开三倍工资挖老师傅。',
    options: [
      { label: '加薪留住', effect: { cash: -10000, morale: 4, log: '"冲你这份心，我不走。"' } },
      { label: '放手', effect: { morale: -6, log: '欢送宴上他敬了你三杯。' } }
    ] },
  { id: 'ev_scam', title: '"内幕消息"',
    text: '酒局上有人拍胸脯："这支票稳翻倍！"',
    options: [
      { label: '投 3 万试试', effect: { cash: -30000,
          risk: { chance: 0.35,
            win: { cash: 60000, log: '居然真涨了，捏着汗清了仓。' },
            lose: { morale: -6, log: '三天后跌成一地鸡毛。' } } } },
      { label: '不信', effect: { morale: 2, log: '半个月后，那"庄家"进去了。' } }
    ] },
  { id: 'ev_hospital_call', title: '催收打到病房',
    text: '催收电话直接打进了父亲的病房。',
    options: [
      { label: '正告对方', effect: { reputation: -2, morale: -4, log: '病房里很安静。' } },
      { label: '报警投诉', effect: { reputation: 3, log: '"别为我分心。"父亲拍拍你的手。' } }
    ] },
  { id: 'ev_charity', title: '慈善晚宴',
    text: '商会晚宴，捐两万以上才能上台亮相。',
    options: [
      { label: '捐', effect: { cash: -20000, reputation: 10, log: '大屏打出"建国食品"时，掌声响起。' } },
      { label: '缺席', effect: { reputation: -3, log: '合影里没有你的位置。' } }
    ] },
  { id: 'ev_leak', title: '内鬼疑云',
    text: '新配方没发布，对手就出了几乎一样的东西。',
    options: [
      { label: '悄悄排查', effect: { morale: -3, investigation: 10, log: '顺着订单记录摸到了线头。' } },
      { label: '开会对质', effect: {
          risk: { chance: 0.5,
            win: { morale: 5, investigation: 15, log: '老员工们帮你看住了每道流程。' },
            lose: { morale: -8, log: '两个年轻人递了辞呈。' } } } }
    ] },
  { id: 'ev_bank_visit', title: '信贷经理的暗示',
    text: '银行经理私下约茶："引入新股东，续贷容易很多。"',
    options: [
      { label: '认真听取', effect: { flags: { bankHint: 1 }, investigation: 5, log: '字里行间，有人想借你上岸。' } },
      { label: '装没听懂', effect: { morale: 2, log: '你把"战略股东"四个字划掉了。' } }
    ] },
  { id: 'ev_father_lucid', title: '父亲清醒的下午',
    text: '难得晴天，父亲拉着你说了一下午创业往事。',
    options: [
      { label: '记在本子上', effect: { morale: 8, health: 3, reputation: 2, log: '他说的三个老客户成了救命订单。' } },
      { label: '赶回厂里', effect: { morale: 2, log: '"忙正事要紧。"你心里五味杂陈。' } }
    ] },
  { id: 'ev_market_fair', title: '农产品展销会',
    text: '市里展销会给老厂留了免费展位。',
    options: [
      { label: '参加', effect: { cash: -6000, reputation: 6, morale: -3, log: '试吃队伍排到了隔壁展位。' } },
      { label: '放弃', effect: { morale: 2, log: '你把精力留给了车间——在赌。' } }
    ] },
  { id: 'ev_uncle_probe', title: '三叔探病',
    text: '三叔拎着果篮看父亲，句句都在打听厂里的账。',
    options: [
      { label: '滴水不漏', effect: { investigation: 8, log: '他袖口的手表是新的。' } },
      { label: '摊牌试探', effect: { morale: -4,
          risk: { chance: 0.4,
            win: { investigation: 15, log: '那一瞬间的慌乱，你全看在眼里。' },
            lose: { reputation: -4, log: '"厂子垮了你负责？"不欢而散。' } } } }
    ] }
];

/* ---------------------------------------------------------------------------
 * 3. 危机节点（48 周长局：6 个危机 × 2 轮，第 4 周起每 4 周一场）
 * ------------------------------------------------------------------------- */
var CRISIS_EVENTS = {
  4: { id: 'crisis_bank', title: '危机：银行抽贷',
    text: '银行要提前收回三百万贷款。消息传开，供应商的电话停了。',
    options: [
      { label: '抵押设备续贷', effect: { cash: 300000, debt: 300000, equipment: -1,
          log: '三百万到账，代价是最老的一条生产线。' } },
      { label: '民间拆借', effect: { cash: 200000, debt: 260000, reputation: -5,
          log: '年化惊人的过桥钱，窟窿堵上了，债更沉了。' } },
      { label: '据理力争', effect: {
          risk: { chance: 0.5,
            win: { reputation: 5, morale: 8, log: '逐级申诉成功，获准分期。' },
            lose: { debt: 400000, reputation: -5, log: '申诉失败，征信添了逾期。' } } } }
    ] },
  8: { id: 'crisis_uncle', title: '危机：三叔逼宫',
    text: '三叔召集家族会议，摆出"重组方案"：由他接管厂子。',
    options: [
      { label: '正面回击', effect: {
          risk: { chance: 0.55, bonus: { reputation: 30 },
            win: { reputation: 8, morale: 8, log: '当众立下军令状，长辈们看你的眼神变了。' },
            lose: { morale: -10, reputation: -5, log: '你在会议上被孤立了。' } } } },
      { label: '虚与委蛇，暗查账', effect: { investigation: 20, morale: -4,
          log: '散会后，你翻开了烂账的第一页。' } },
      { label: '摊牌挪用证据', effect: {
          risk: { chance: 0.6, bonus: { investigation: 60 },
            win: { reputation: 15, morale: 10, flags: { truthPartial: 1 },
              log: '流水甩在桌上：厂里的钱流进了他小舅子的账户。' },
            lose: { reputation: -8, morale: -6, log: '证据链不全，反被咬定"伪造"。' } } } }
    ] },
  12: { id: 'crisis_media', title: '危机：舆论风暴',
    text: '《老字号之死》冲上本地热榜，真假掺半，群情汹涌。',
    options: [
      { label: '发布会自证', effect: { cash: -20000, reputation: 8, morale: 4,
          log: '舆情转向："三代人的厂子，不容易。"' } },
      { label: '冷处理', effect: { reputation: -8, morale: -4, log: '"老字号要凉"的印象留下来了。' } },
      { label: '水军反攻', effect: { cash: -15000,
          risk: { chance: 0.45,
            win: { reputation: 5, flags: { dirty: 1 }, log: '对手也被拖下水。你赢了舆论，却有点不认识自己了。' },
            lose: { reputation: -12, flags: { dirty: 1 }, log: '水军被扒，反噬如潮。' } } } }
    ] },
  16: { id: 'crisis_acquisition', title: '危机：收购要约',
    text: '鼎盛资本出价 800 万买下老厂全部资产与品牌，"帮你们全家解脱"。',
    options: [
      { label: '当场撕掉', effect: { morale: 8, reputation: 5,
          log: '"厂子可以烂在我手里，不姓别家的姓。"' } },
      { label: '周旋换情报', effect: { investigation: 15, morale: -4,
          log: '他们最忌惮的，是你手里的配方。' } },
      { label: '考虑卖厂', effect: { flags: { sellout: 1 },
          log: '签字的手很稳，回家的路很长。' } }
    ] },
  20: { id: 'crisis_surgery', title: '危机：手术窗口',
    text: '医生把你叫到走廊："手术窗口就在这两周，前后要二十万。"',
    options: [
      { label: '全力一搏', effect: { cash: -200000, health: 35, morale: 10,
          log: '手术很成功。那天你在天台哭了一场。' } },
      { label: '保守治疗', effect: { health: 10, log: '"留点钱给厂子。"你们都懂这意味着什么。' } },
      { label: '放弃手术', effect: { health: -5, morale: -15, reputation: -5,
          log: '签字那天，你没敢看父亲的脸。' } }
    ] },
  24: { id: 'crisis_final', title: '危机：股东大会（上半场）',
    text: '第二十四周，股东大会。所有人都看着你这三个季度的答卷。',
    options: [
      { label: '宣布续战计划', effect: { morale: 5,
          log: '"下半场，才刚开始。"你赢得了再干二十四周的机会。' } }
    ] }
};

/* 下半场（25~48 周）：同样的六道关再来一遍，数值不变、剧情递进 */
CRISIS_EVENTS[28] = CRISIS_EVENTS[4];
CRISIS_EVENTS[32] = CRISIS_EVENTS[8];
CRISIS_EVENTS[36] = CRISIS_EVENTS[12];
CRISIS_EVENTS[40] = CRISIS_EVENTS[16];
CRISIS_EVENTS[44] = CRISIS_EVENTS[20];
CRISIS_EVENTS[48] = { id: 'crisis_final2', title: '终局：最后的股东大会',
  text: '第四十八周，真正的终局。四十八周的一切，都摆在这张桌上了。',
  options: [
    { label: '宣布你的答案', effect: { morale: 5,
        log: '你站起身。身后是 48 周的账本、病历和调查笔记。' } }
  ] };

/* ---------------------------------------------------------------------------
 * 3.5 拍卖会（6/14/22/30/38/46 周）
 * ------------------------------------------------------------------------- */
var AUCTION_EVENTS = {
  6: { id: 'auction_6', title: '拍卖会：爷爷的老配方手稿',
    text: '拍卖会上出现了一样让全厂心跳的东西——爷爷亲笔的老配方手稿。',
    options: [
      { label: '举牌：30 万', effect: { cash: -300000,
          risk: { chance: 0.35, bonus: { charm: 40 },
            win: { reputation: 10, morale: 8, items: { aid: 1 },
              log: '一槌定音！手稿归你，还翻出一箱老伙计留下的药材。' },
            lose: { morale: -6, log: '金丝眼镜藏家轻描淡写地压过了你。' } } } },
      { label: '跟：60 万', effect: { cash: -600000,
          risk: { chance: 0.55, bonus: { charm: 40 },
            win: { reputation: 15, morale: 10, cash: 300000,
              log: '手稿到手，还引来一位投资人追加了 30 万。' },
            lose: { morale: -8, log: '60 万只剩一场空欢喜。' } } } },
      { label: '按兵不动', effect: { morale: -3, log: '你把每张报价单记进了小本子。' } }
    ] },
  14: { id: 'auction_14', title: '拍卖会：德国老灌装线',
    text: '退役的德国老灌装线，成色八新，起拍价低得可疑。',
    options: [
      { label: '举牌：40 万', effect: { cash: -400000,
          risk: { chance: 0.4, bonus: { charm: 40 },
            win: { equipment: 1, morale: 8, log: '拿下！老师傅们连夜装进车间（设备+1）。' },
            lose: { morale: -6, cash: 80000, log: '设备有暗伤的传闻吓退了所有人。' } } } },
      { label: '志在必得：80 万', effect: { cash: -800000,
          risk: { chance: 0.65, bonus: { charm: 40 },
            win: { equipment: 1, reputation: 8, morale: 10, log: '整线进厂，半条街来看热闹。' },
            lose: { morale: -10, log: '一个没露面的电话买家拿走了一切。' } } } },
      { label: '放弃', effect: { morale: -2, log: '你算了一整晚的账。' } }
    ] },
  22: { id: 'auction_22', title: '拍卖会：破产同行的家底',
    text: '隔壁破产食品厂整体拍卖：订单、客户名单、设备打包。',
    options: [
      { label: '出价：50 万', effect: { cash: -500000,
          risk: { chance: 0.45, bonus: { charm: 40 },
            win: { reputation: 10, morale: 6, cash: 200000, log: '客户名单第一周就回款 20 万。' },
            lose: { morale: -6, log: '保证金退回来时，你只带走一句"下次再来"。' } } } },
      { label: '豪赌：100 万', effect: { cash: -1000000,
          risk: { chance: 0.7, bonus: { charm: 40 },
            win: { reputation: 15, morale: 12, cash: 600000, items: { invite: 2 },
              log: '你买下了同行的江山，还白得两张邀请函。' },
            lose: { morale: -12, log: '资金链在最后一口价上绷断了。' } } } },
      { label: '不掺和', effect: { morale: -2, log: '你把"现金流"三个字写在手心，攥了一路。' } }
    ] }
};
/* 下半场拍卖：复用同样三件拍品 */
AUCTION_EVENTS[30] = AUCTION_EVENTS[6];
AUCTION_EVENTS[38] = AUCTION_EVENTS[14];
AUCTION_EVENTS[46] = AUCTION_EVENTS[22];

/* ---------------------------------------------------------------------------
 * 4. 先知记忆提示（含下半场复用）
 * ------------------------------------------------------------------------- */
var FORESIGHT_HINTS = {
  4:  '第 4 周银行抽贷。备好抵押物或现金。',
  8:  '第 8 周三叔发难。声望和调查进度是你的武器。',
  12: '第 12 周媒体埋伏。留出发布会的 2 万。',
  16: '第 16 周收购要约。调查进度就是筹码。',
  20: '第 20 周手术窗口。备好 20 万救命钱。',
  24: '第 24 周股东大会。上半场的答卷决定下半场。',
  28: '第 28 周银行又会抽贷。这一次，你已经会玩了。',
  32: '第 32 周三叔卷土重来。证据链更全了。',
  36: '第 36 周媒体再来。身正不怕影子斜。',
  40: '第 40 周新的收购要约。该轮到你开价了。',
  44: '第 44 周最后的手术窗口。别留遗憾。',
  48: '最后一周。你已经知道结局会写成什么样了。'
};

/* ---------------------------------------------------------------------------
 * 5. 结局库（文字压缩）
 * ------------------------------------------------------------------------- */
var ENDINGS = {
  empire_truth: { title: '破晓时刻', rank: 5,
    text: '债务清零的股东大会上，你公布了三叔挪用资金的全部证据。警方带走他时，父亲在轮椅上为你鼓了掌。\n那个年轻人，把塌了的天一砖一瓦垒了回去。\n—— 真结局【破晓时刻】' },
  empire: { title: '力挽狂澜', rank: 4,
    text: '债务清零，订单排到明年。父亲坐在重新开工的车间里，看着新货装箱出厂，笑着笑着红了眼。\n—— 结局【力挽狂澜】' },
  steady: { title: '稳中向好', rank: 3,
    text: '债没还完，但厂子活下来了，父亲的病也稳住了。\n有些胜利不是欢呼出来的，是熬出来的。\n—— 结局【稳中向好】' },
  restart: { title: '东山再起', rank: 2,
    text: '债台还在，你没倒下。和老伙计们约好下周继续。\n家业可以慢慢赚，人心还在。\n—— 结局【东山再起】' },
  sold: { title: '易主之后', rank: 1,
    text: '厂子卖了好价钱，债清了，父亲进了市里的医院。只是路过老厂门口的新招牌时，你站了很久。\n—— 结局【易主之后】' },
  unknown: { title: '隐姓埋名', rank: 1,
    text: '声望扫地后，没人再跟林家做生意。你带着父亲去了南方小城。\n—— 结局【隐姓埋名】' },
  prison: { title: '锒铛入狱', rank: 0,
    text: '为了翻身，你走过太多次灰色地带。这次没有下次了。\n—— 结局【锒铛入狱】。重开一局，做个干净的人试试？' },
  father_lost: { title: '病榻诀别', rank: 0,
    text: '那个周日下午，心电监护仪拉成了直线。账本上还有没还完的债，可这世上最贵的那一笔，你永远付不起了。\n—— 结局【病榻诀别】。下一局，请把医疗费当成最优先级。' },
  crushed: { title: '债台高筑', rank: 0,
    text: '利滚利的债像雪崩压了下来。资产冻结那天，老员工们来送了最后一程。\n—— 结局【债台高筑】。下一局试试尽早还债、少碰投机？' }
};

/* ---------------------------------------------------------------------------
 * 6. delta 格式速查（接手人必读）
 *    cash公司账户 / pocket个人钱包 / debt / health / reputation / morale /
 *    charm / equipment / inventory(可用-99表示清空) / investigation /
 *    items{aid,invite,chicken} / flags / log / risk{chance,win,lose,bonus}
 *    两个账户都不允许为负，不够扣自动借高利贷（缺口×2）。
 * ------------------------------------------------------------------------- */

/* 导出 */
if (typeof module !== 'undefined' && module.exports) { module.exports = { CONFIG: CONFIG, ACTIONS: ACTIONS, SPECIAL_ACTIONS: SPECIAL_ACTIONS, NO_AP_ACTIONS: NO_AP_ACTIONS, ACHIEVEMENTS: ACHIEVEMENTS, PRODUCTS: PRODUCTS, ASSETS: ASSETS, AUCTION_WEEKS: AUCTION_WEEKS, AUCTION_EVENTS: AUCTION_EVENTS, RANDOM_EVENTS: RANDOM_EVENTS, CRISIS_EVENTS: CRISIS_EVENTS, FORESIGHT_HINTS: FORESIGHT_HINTS, ENDINGS: ENDINGS }; }
