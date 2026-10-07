/**
 * ============================================================================
 *  《重生之我在破败家族力挽狂澜》—— core/data.js
 * ----------------------------------------------------------------------------
 *  文件职责：
 *    这是整个游戏的"数据仓库"。所有剧情文案、数值设定、行动定义、
 *    随机事件、危机节点、结局判定用的文案，全部集中在这一个文件里。
 *
 *  为什么要集中？
 *    - 你（项目接手人）以后 90% 的修改只需要动这个文件：
 *        · 想加一条新事件？往 RANDOM_EVENTS 里照葫芦画瓢加一段即可。
 *        · 想调游戏难度？改 CONFIG 里的数字。
 *        · 想改结局？改 ENDINGS。
 *    - 引擎(engine.js)负责"怎么算"，本文件负责"是什么"，互不干扰。
 *
 *  【原创声明 / 侵权规避红线——请务必阅读】
 *    本文件中的所有文字、数值、剧情均为本项目原创，灵感仅取自
 *    "经营模拟 / 重生逆袭"这一公共题材类型（类型不受著作权保护）。
 *    修改与扩充时请遵守：
 *      1. 禁止从任何现有商业游戏中复制文案、数值表、美术或音频；
 *      2. 禁止使用与其他游戏相同或高度相似的商标名称；
 *      3. 新增内容请保持"自己的话"，拿不准时参考 docs/PUBLISH_GUIDE.md。
 *
 *  @author  项目组（AI 辅助生成，人工负责审校）
 *  @version 0.1.0
 *  @see     docs/CHANGELOG.md  每次修改本文件，请在 CHANGELOG 里补一条记录！
 * ============================================================================
 */

/* ---------------------------------------------------------------------------
 * 0. 全局配置 CONFIG —— 游戏"总开关"，调难度只看这里
 * ------------------------------------------------------------------------ */
var CONFIG = {
  VERSION: '0.4.1',            // 当前数据版本（与 CHANGELOG 保持同步）

  MAX_WEEKS: 24,               // 一局游戏总共多少周（回合数）
  AP_PER_WEEK: 3,              // 每周有多少"行动点"（AP = Action Point）

  START_CASH: 80000,           // 开局【公司账户】资金：老厂的经营底子
  START_POCKET: 50000,         // 开局【个人钱包】：家里的私房钱（0.2.0 双资金体系）
  START_DEBT: 3000000,         // 开局家族负债（元）：三叔留下的大坑（平衡：需让好结局可达）
  START_HEALTH: 55,            // 开局父亲健康度（0~100）
  START_REPUTATION: 20,        // 开局商界声望（0~100）
  START_MORALE: 60,            // 开局全厂士气（0~100）
  START_CHARM: 10,             // 开局魅力值（0~100）：社交场上的通行证

  TRANSFER_FEE: 0.1,           // 公司→个人 转账手续费率（双资金体系的核心张力）
  TRANSFER_S_AMOUNT: 50000,    // 小额转账额度（与 transfer_s 行动的 need 保持一致）
  TRANSFER_L_AMOUNT: 200000,   // 大额转账额度（与 transfer_l 行动的 need 保持一致）
  WEEKLY_POCKET_SALARY: 8000,  // 每周自动发到你个人钱包的"老板周薪"
  CHICKEN_COST: 500000,        // 购买"时光怀表"（回溯道具）的费用——贵到肉疼

  STAFF_HIRE_COST: 8000,       // 招 1 名员工的费用（0.3.0 员工系统）
  STAFF_MAX: 6,                // 员工上限
  STAFF_WEEKLY_WAGE: 1000,     // 每名员工每周工资（公司账户支出）
  PRODUCT_MAINTENANCE: 5000,   // 每条产品线每级每周的维护费（公司账户支出）

  WEEKLY_INTEREST_RATE: 0.005, // 每周债务利息（0.5%，复利，滚起来很疼）
  WEEKLY_WAGE: 12000,          // 每周固定支出：老员工的工资（人不能不给钱）
  MEDICAL_COST: 20000,         // 第 1 周的"支付医疗费"花费（之后每周递增）
  MEDICAL_COST_GROWTH: 1500,   // 医疗费每周上涨额：父亲的病情会越来越重（个人钱包支付）
  MEDICAL_HEAL: 18,            // 支付医疗费后父亲健康的恢复量
  NO_MEDICAL_DAMAGE: 12,       // 本周若一次医疗费都没付，父亲健康下降量

  EVENT_CHANCE: 0.35,          // 普通周触发随机事件的概率（危机周必触发危机）
  FORESIGHT_MAX: 3,            // "先知记忆"可用次数（重生者的金手指，别浪费）

  REPAY_AMOUNT: 150000,        // 每次"偿还欠款"行动的固定还款额（15万）
  INVEST_LOW_AMOUNT: 100000,   // "稳健理财"投入额
  INVEST_LOW_RETURN: 1.03,     // 稳健理财下周返还倍数（+3%，稳）
  INVEST_HIGH_AMOUNT: 50000,   // "高风险投机"投入额

  MAX_EQUIPMENT: 5,            // 设备等级上限
  MAX_INVENTORY: 3,            // 原料库存上限
  TRUTH_NEED: 100,             // 调查进度达到该值 = 查明三叔挪用资金的全貌
  DEBT_CRUSH: 8000000,         // 终局结算时负债超过该值 → "债台高筑"结局
  AUTO_BORROW_MULT: 2          // 现金不够扣时自动借高利贷的惩罚倍率
};

/* ---------------------------------------------------------------------------
 * 1. 行动定义 ACTIONS —— 玩家每周能做的事
 * ---------------------------------------------------------------------------
 *  字段说明（给接手人）：
 *    id      : 引擎识别用英文 id，special 里列出的 id 会走引擎的特殊逻辑
 *    group   : 界面分组（经营/债务/家庭/人脉/暗线/金手指）
 *    name    : 按钮上显示的名字
 *    desc    : 悬浮提示 / 长按说明
 *    need    : 使用前提，目前支持 { cash: 数字 }（现金不足则按钮置灰）
 *    effect  : 通用行动的结算公式（delta 格式，见第 5 节说明）
 *              带 special 的行动不读 effect，由引擎按 CONFIG 计算
 * ------------------------------------------------------------------------- */
var ACTIONS = [
  /* ===== 经营组：赚钱的主线 ===== */
  { id: 'order', group: '经营', name: '接下订单', icon: '📋',
    desc: '组织生产交付订单。声望和士气越高、设备越好、原料越足，赚得越多。消耗1点士气。',
    special: 'order' },

  { id: 'buy_material', group: '经营', name: '采购原料', icon: '📦',
    desc: '从公司账户花 1.5 万囤一份原料（最多囤3份）。接订单时每份原料额外 +30% 收益。',
    need: { cash: 15000 },
    effect: { cash: -15000, inventory: 1,
      log: '你去批发市场囤了一批便宜原料，仓库又满了些。' } },

  { id: 'upgrade', group: '经营', name: '升级设备', icon: '🏭',
    desc: '花重金升级生产线（费用随等级递增）。设备等级越高，订单收益越高。',
    special: 'upgrade' },

  { id: 'booth', group: '经营', name: '街头试吃', icon: '🍢',
    desc: '摆摊请街坊试吃新品，赚点小钱刷好感。声望 +5，士气 -3。',
    effect: { cash: 2000, reputation: 5, morale: -3,
      log: '你带着新品去夜市摆摊，排队的人绕了两条街。' } },

  /* ===== 产品线组（0.3.0）：多一条线多一成收益，维护费也水涨船高 ===== */
  { id: 'develop_gua', group: '产品线', name: '研发古法果脯', icon: '🍬',
    desc: '重开爷爷的看家手艺（最便宜）。每级 +15% 订单收益，每周维护费 +5000。',
    special: 'develop_gua' },
  { id: 'develop_guan', group: '产品线', name: '研发果香罐头', icon: '🥫',
    desc: '机器灌装走商超（投入中等）。每级 +15% 订单收益，每周维护费 +5000。',
    special: 'develop_guan' },
  { id: 'develop_lihe', group: '产品线', name: '研发节庆礼盒', icon: '🎁',
    desc: '高档礼盒走节日市场（最贵最赚）。每级 +15% 订单收益，每周维护费 +5000。',
    special: 'develop_lihe' },

  /* ===== 员工组（0.3.0）：人手就是产能，工资也是成本 ===== */
  { id: 'hire_staff', group: '员工', name: '招募员工', icon: '🧑‍🏭',
    desc: '从公司账户花 8000 招一名熟手（最多 6 人）。每名 +8% 订单收益，每周工资 +1000。',
    need: { cash: 8000 },
    special: 'hire_staff' },
  { id: 'fire_staff', group: '员工', name: '辞退员工', icon: '📤',
    desc: '让一名员工离开（省下工资，但全厂士气 -8，声望 -2）。',
    special: 'fire_staff' },

  /* ===== 债务组：头顶悬着的剑 ===== */
  { id: 'negotiate', group: '债务', name: '与债主周旋', icon: '🤝',
    desc: '陪笑脸、拖时间：本周债务免息。代价是声望 -4。',
    effect: { reputation: -4, flags: { deferInterest: 1 },
      log: '你在酒桌上陪着债主喝到深夜，利息的事暂时压下了。' } },

  { id: 'repay', group: '债务', name: '偿还欠款', icon: '💸',
    desc: '从公司账户拿 15 万直接还债。每还一笔，债主的脸色都好看一分（声望 +2）。',
    need: { cash: 150000 },
    special: 'repay' },

  /* ===== 转账组：双资金体系（不耗行动点，随时可办） ===== */
  { id: 'transfer_s', group: '转账', name: '转 5 万到钱包', icon: '💳',
    desc: '从公司账户转 5 万到个人钱包，收 10% 手续费（实到 4.5 万）。不耗行动点。',
    need: { cash: 50000 },
    special: 'transfer_s' },

  { id: 'transfer_l', group: '转账', name: '转 20 万到钱包', icon: '🏧',
    desc: '从公司账户转 20 万到个人钱包，收 10% 手续费（实到 18 万）。不耗行动点。',
    need: { cash: 200000 },
    special: 'transfer_l' },

  /* ===== 家庭组：别忘了这一切是为了谁（医疗走个人钱包！） ===== */
  { id: 'care', group: '家庭', name: '陪护父亲', icon: '🫂',
    desc: '在病床前陪父亲说说话。健康 +8，士气 +6。',
    effect: { health: 8, morale: 6,
      log: '父亲精神不错，还念叨着老厂里第一批果脯的味道。' } },

  { id: 'medical', group: '家庭', name: '支付医疗费', icon: '🏥',
    desc: '从个人钱包支付本周的规范治疗（费用随周数上涨，病情会加重）。健康 +18。',
    special: 'medical' },

  /* ===== 人脉组：做生意就是做人（魅力值在这里攒） ===== */
  { id: 'chamber', group: '人脉', name: '拜访商会', icon: '🏛️',
    desc: '混圈子、换名片。声望 +4、魅力 +3，并有机会结识雪中送炭的投资人。',
    effect: { reputation: 4, charm: 3,
      risk: { chance: 0.3,
        win: { cash: 50000, flags: { metInvestor: 1 },
          log: '一位做农产品期货的老板欣赏你的胆识，当场注入了 5 万周转金！' },
        lose: { log: '商会的老家伙们客气而疏远，名片收了一堆，回应寥寥。' } },
      log: '你提着果篮挨个拜访了商会的老前辈。' } },

  { id: 'media', group: '人脉', name: '接受采访', icon: '🎤',
    desc: '给本地电视台讲"老厂新生"的故事。声望 +8、魅力 +2，奔忙让士气 -5。',
    effect: { reputation: 8, charm: 2, morale: -5,
      log: '采访播出后，不少老街坊打电话来订货。' } },

  /* ===== 暗线组：查清家族崩塌的真相 ===== */
  { id: 'investigate', group: '暗线', name: '追查资金流向', icon: '🔍',
    desc: '顺着三叔留下的烂账一点点挖。调查进度 +10~18，集满 100 揭开全部真相。',
    special: 'investigate' },

  /* ===== 投资组：以钱生钱（用个人钱包的钱，亏了不连累厂子） ===== */
  { id: 'invest_low', group: '投资', name: '稳健理财', icon: '🏦',
    desc: '从个人钱包投 10 万买短期理财，下周返还 10.3 万。不刺激，但踏实。',
    need: { pocket: 100000 },
    special: 'invest_low' },

  { id: 'invest_high', group: '投资', name: '高风险投机', icon: '🎲',
    desc: '从个人钱包投 5 万跟风热门题材：55% 概率赚 30%，45% 概率亏 15%。心脏不好勿入。',
    need: { pocket: 50000 },
    special: 'invest_high' },

  /* ===== 道具组：家里攒下的救命家什（不耗行动点） ===== */
  { id: 'use_aid', group: '道具', name: '使用急救箱', icon: '🧰',
    desc: '打开家里的急救箱给父亲做一次深度护理。健康 +25。不耗行动点。',
    special: 'use_aid' },

  { id: 'use_invite', group: '道具', name: '使用商务邀请函', icon: '📨',
    desc: '出席一场高端商务酒会。声望 +6、魅力 +8。不耗行动点。',
    special: 'use_invite' },

  { id: 'buy_chicken', group: '道具', name: '购买时光怀表', icon: '⏱️',
    desc: '花 50 万从古董商手里买下传说中的时光怀表（自动记下每周的开局状态）。',
    need: { cash: 500000 },
    special: 'buy_chicken' },

  { id: 'use_chicken', group: '道具', name: '转动时光怀表', icon: '🌀',
    desc: '回到最近一次记录的周初状态（本周做过的事全部撤销）。有怀表才能用。',
    special: 'use_chicken' },

  /* ===== 金手指：重生者的先知记忆（每周限次开局只有3次） ===== */
  { id: 'foresight', group: '金手指', name: '启动先知记忆', icon: '⚡',
    desc: '闭眼回想上辈子的记忆，提前知晓接下来某场危机的关键情报。（不耗行动点外的资源，但全局限 3 次）',
    special: 'foresight' }
];

/** 引擎按特殊逻辑处理的行动 id 集合（改行动名没关系，别乱改 id） */
var SPECIAL_ACTIONS = {
  order: 1, upgrade: 1, repay: 1, medical: 1,
  investigate: 1, invest_low: 1, invest_high: 1, foresight: 1,
  transfer_s: 1, transfer_l: 1, buy_chicken: 1,
  use_aid: 1, use_invite: 1, use_chicken: 1,
  develop_gua: 1, develop_guan: 1, develop_lihe: 1,
  hire_staff: 1, fire_staff: 1
};

/** 不消耗行动点的行动（银行业务/道具使用/金手指，点了立刻结算） */
var NO_AP_ACTIONS = {
  foresight: 1, transfer_s: 1, transfer_l: 1,
  use_aid: 1, use_invite: 1, use_chicken: 1
};

/* ---------------------------------------------------------------------------
 * 1.4 产品线定义 PRODUCTS —— 每条产品线可研发 3 级（0.3.0 新增）
 * ---------------------------------------------------------------------------
 *  costBase：每一级的研发费用 = costBase × 下一级等级（1级6万，2级12万…按 base 定）
 *  接订单收入 = 基础公式 × (1 + 0.15 × 产品线总等级)
 *  每周结算扣"产线维护费" = 5000 × 总等级（厂子越大越烧钱）
 * ------------------------------------------------------------------------- */
var PRODUCTS = [
  { id: 'gua',  name: '古法果脯', icon: '🍬', costBase: 60000,
    desc: '爷爷当年的看家手艺，重开这条线最便宜。' },
  { id: 'guan', name: '果香罐头', icon: '🥫', costBase: 120000,
    desc: '机器灌装、走商超渠道，投入大回报稳。' },
  { id: 'lihe', name: '节庆礼盒', icon: '🎁', costBase: 250000,
    desc: '高档礼盒走节日礼品市场，最贵也最赚钱。' }
];

/** 拍卖会固定周（0.3.0 新增）：非危机周的"大事件" */
var AUCTION_WEEKS = { 6: 1, 14: 1, 22: 1 };

/* ---------------------------------------------------------------------------
 * 1.5 成就定义 ACHIEVEMENTS —— 里程碑播报
 * ---------------------------------------------------------------------------
 *  cond(state) 返回 true 即解锁（引擎在每周结算/事件后自动检查）。
 *  name/desc 全部原创；解锁时日志播报 🏆，结局页汇总展示。
 * ------------------------------------------------------------------------- */
var ACHIEVEMENTS = [
  { id: 'first_repay', name: '第一桶金的诚意', desc: '第一次偿还欠款',
    cond: function (s) { return s.flags.repaidOnce === 1; } },
  { id: 'debt_half', name: '斩断一半锁链', desc: '把家族债务还掉一半',
    cond: function (s) { return s.debt <= CONFIG.START_DEBT / 2; } },
  { id: 'health_full', name: '妙手回春', desc: '父亲健康达到 90',
    cond: function (s) { return s.health >= 90; } },
  { id: 'rep_60', name: '商界新星', desc: '声望达到 60',
    cond: function (s) { return s.reputation >= 60; } },
  { id: 'charm_50', name: '宴会明星', desc: '魅力值达到 50',
    cond: function (s) { return s.charm >= 50; } },
  { id: 'truth', name: '真相在手', desc: '查清三叔挪用资金的全部证据',
    cond: function (s) { return s.investigation >= CONFIG.TRUTH_NEED; } },
  { id: 'equip_max', name: '焕然一新的老厂', desc: '设备升到满级',
    cond: function (s) { return s.equipment >= CONFIG.MAX_EQUIPMENT; } },
  { id: 'millionaire', name: '账户里的百万', desc: '公司账户资金达到 100 万',
    cond: function (s) { return s.cash >= 1000000; } },
  { id: 'survive_w12', name: '最难的十周', desc: '撑过第 12 周的舆论风暴',
    cond: function (s) { return s.week > 12; } },
  { id: 'products_max', name: '匠心工厂', desc: '三条产品线全部研发到满级',
    cond: function (s) {
      var total = 0, max = 0;
      for (var p in (s.products || {})) { if (s.products.hasOwnProperty(p)) { total += s.products[p]; max += 3; } }
      return max > 0 && total >= max;
    } },
  { id: 'staff_full', name: '知人善任', desc: '厂里的员工达到 6 人',
    cond: function (s) { return s.staff >= 6; } }
];

/* ---------------------------------------------------------------------------
 * 2. 随机事件库 RANDOM_EVENTS —— 普通周的小插曲
 * ---------------------------------------------------------------------------
 *  每条事件 = { id, title, text, options: [ { label, effect } ] }
 *  effect 就是第 5 节说的 delta 格式，可以带 risk（概率分支）。
 *  加新事件：整块复制一条改文案改数值，id 不要和现有的重复。
 * ------------------------------------------------------------------------- */
var RANDOM_EVENTS = [

  { id: 'ev_old_friend', title: '老同学找上门',
    text: '高中同桌阿彪拎着两瓶酒来找我："一帆，我看好你！这五万你拿去周转，赚了再还！"',
    options: [
      { label: '收下这份情', effect: { cash: 20000, flags: { owedFriend: 1 },
          log: '阿彪的钱到账了。你把借条压在抽屉最底下。' } },
      { label: '婉拒，不能连累他', effect: { morale: 3,
          log: '阿彪叹了口气："你小子还是这么犟。"' } }
    ] },

  { id: 'ev_supplier', title: '供应商的推销',
    text: '跑原料的老周压低声音："这批果糖浆，市价一半给你，厂里关系的货，走不走？"',
    options: [
      { label: '走货！便宜要占', effect: { cash: -12000, inventory: 1,
          log: '老周的车凌晨卸了货，比市价便宜了一大截。' } },
      { label: '来路不明，算了', effect: { reputation: 2,
          log: '你想了想，还是没碰这种说不清来路的便宜。' } }
    ] },

  { id: 'ev_inspection', title: '突击检查',
    text: '市场监管部门突击检查车间。车间的卫生死角被翻了出来。',
    options: [
      { label: '连夜整改', effect: { cash: -8000, morale: -4, reputation: 5,
          log: '全厂通宵大扫除，检查组临走时点了点头。' } },
      { label: '托人打点蒙混', effect: { cash: -5000,
          risk: { chance: 0.4,
            win: { log: '关系网起了作用，检查草草收场……但你后背发凉。' },
            lose: { cash: -15000, reputation: -8,
              log: '事情捅到了台上，吃了一张罚单，报纸角落还点了个名。' } } } }
    ] },

  { id: 'ev_rival_dump', title: '对手倾销',
    text: '城东新开的食品公司把同类产品打到七折，明摆着要拖死老厂。',
    options: [
      { label: '跟着降价硬刚', effect: { cash: -8000, reputation: 2,
          log: '你咬牙跟了两周价格战，客流总算保住了。' } },
      { label: '不跟，主打品质', effect: { morale: -6,
          log: '流失了些客人，但留下来的都成了回头客。' } }
    ] },

  { id: 'ev_worker_hurt', title: '老师傅工伤',
    text: '灌装线出事故，干了二十年的陈师傅手被烫伤住院了。',
    options: [
      { label: '全额垫付医药费', effect: { cash: -15000, morale: 10, reputation: 4, items: { aid: 1 },
          log: '你垫了医药费还送去营养品。陈师傅老伴儿硬把家里的急救箱塞给你："厂里用得上！"' } },
      { label: '按最低标准处理', effect: { morale: -12,
          log: '厂里安安静静，但工人们眼神变了。' } }
    ] },

  { id: 'ev_viral', title: '意外走红',
    text: '有人拍了父亲当年在车间教徒弟的旧视频，一夜之间转发破了十万。',
    options: [
      { label: '趁热打铁做直播', effect: { reputation: 10, cash: 5000, morale: -4,
          log: '仓促搭的直播间挤满了人，老厂的订单电话被打爆。' } },
      { label: '低调处理', effect: { reputation: 3,
          log: '你把热度匀给了厂里的年轻人去打理。' } }
    ] },

  { id: 'ev_counterfeit', title: '冒牌货出没',
    text: '夜市上出现了印着"建国牌"的山寨果脯，包装几乎一样。',
    options: [
      { label: '请律师发函维权', effect: { cash: -10000, reputation: 5,
          log: '律师函发出去，几家批发商连夜下架了假货。' } },
      { label: '自己上门打假', effect: { morale: -5, cash: 3000, reputation: 2,
          log: '你带着伙计守了一晚上，扣了假货还卖了自家的货。' } }
    ] },

  { id: 'ev_rent', title: '房东要涨租',
    text: '厂区房东拍着桌子："附近都涨了，你们老厂不涨，我亏本！"',
    options: [
      { label: '签长约认了', effect: { cash: -10000,
          log: '你签了三年长约，把涨幅锁死在能承受的范围。' } },
      { label: '搬去更偏的库房', effect: { cash: -3000, morale: -8,
          log: '搬家折腾了整整一周，老师傅们嘀咕了不少。' } }
    ] },

  { id: 'ev_extortion', title: '"职业打假人"',
    text: '一个自称"打假卫士"的人举着手机进厂："你这个标签，赔偿我三万，私了。"',
    options: [
      { label: '花钱消灾', effect: { cash: -15000,
          log: '对方拿着钱走了。你总觉得，他还会再来。' } },
      { label: '依法硬刚到底', effect: {
          risk: { chance: 0.5,
            win: { reputation: 6, morale: 5,
              log: '你请市监局现场复核，标签合规。对方灰溜溜走了，还上了本地新闻。' },
            lose: { cash: -8000, reputation: -3,
              log: '标签确实有个小瑕疵，补了货、道了歉，赔了八千。' } } } }
    ] },

  { id: 'ev_intern', title: '返乡大学生',
    text: '读食品专业的姑娘小唐来应聘："我想把咱们老厂的牌子做进电商。"',
    options: [
      { label: '招进来', effect: { cash: -5000, morale: 6, flags: { hiredTang: 1 }, items: { invite: 1 },
          log: '小唐上任第一周就把产品挂上了三个网购平台，还把她表哥的商务邀请函送给了你。' } },
      { label: '厂里养不起闲人', effect: { morale: -3,
          log: '姑娘走了，车间里安静了一会儿。' } }
    ] },

  { id: 'ev_grave', title: '回老宅上坟',
    text: '清明快到了。爷爷的坟在老家山上，父亲病着，去不了。',
    options: [
      { label: '替父亲去上坟', effect: { morale: 10, reputation: 2,
          log: '你在爷爷坟前说了很久的话。回来那天，父亲的气色好了一些。' } },
      { label: '厂里事多，走不开', effect: { morale: -5,
          log: '你托人送了纸钱。夜里加班，总觉得心里空落落的。' } }
    ] },

  { id: 'ev_tax', title: '会计的"建议"',
    text: '新来的会计凑过来："账上这么走，一年能省不少税……就是有点擦边。"',
    options: [
      { label: '依法合规纳税', effect: { cash: -6000, reputation: 3,
          log: '你让人把账目重新理了一遍，干干净净。' } },
      { label: '激进"避税"', effect: { cash: 15000,
          risk: { chance: 0.3,
            win: { log: '胆子换来了利润……暂时。' },
            lose: { cash: -30000, reputation: -10, flags: { dirty: 1 },
              log: '税务稽查上门，补税加罚款。这事在圈子里传开了。' } } } }
    ] },

  { id: 'ev_flood', title: '暴雨夜',
    text: '台风夜暴雨如注，老仓库开始渗水，原料眼看要泡汤。',
    options: [
      { label: '全厂抢险', effect: { cash: -10000, morale: 5,
          log: '全员淋着雨干到天亮，原料保住了，一伙人在食堂吃了顿热面。' } },
      { label: '先保设备，原料认命', effect: { inventory: -99, morale: -6,
          log: '设备无恙，但两车原料泡了汤，账面损失不小。' } }
    ] },

  { id: 'ev_poach', title: '同行挖角',
    text: '对手公司开三倍工资，挖你的老师傅带团队。',
    options: [
      { label: '咬牙加薪留下他', effect: { cash: -10000, morale: 4,
          log: '陈师傅留下来时红着眼眶："老板，冲你这份心，我不走。"' } },
      { label: '留不住就放手', effect: { morale: -6,
          log: '欢送宴上，老师傅敬了你三杯。' } }
    ] },

  { id: 'ev_scam', title: '"内幕消息"',
    text: '酒局上有人拍胸脯："这支票，内有消息，稳翻倍！兄弟带上你。"',
    options: [
      { label: '信一次，投 3 万', effect: { cash: -30000,
          risk: { chance: 0.35,
            win: { cash: 60000, log: '居然真涨了……你捏着一把汗清了仓。' },
            lose: { morale: -6, log: '三天后，那支票跌成了一地鸡毛。' } } } },
      { label: '天上不掉馅饼', effect: { morale: 2,
          log: '你笑着敬了杯酒，岔开了话题。半个月后消息传来，那"庄家"进去了。' } }
    ] },

  { id: 'ev_hospital_call', title: '催收电话打到病房',
    text: '催收的电话直接打进了父亲住院的病房，父亲在电话那头沉默。',
    options: [
      { label: '正告对方', effect: { reputation: -2, morale: -4,
          log: '你压着火跟对方周旋了很久。挂了电话，病房里很安静。' } },
      { label: '报警并投诉', effect: { reputation: 3,
          log: '投诉受理了，催收收敛了不少。父亲拍拍你的手："别为我分心。"' } }
    ] },

  { id: 'ev_charity', title: '慈善晚宴',
    text: '商会组织乡村振兴慈善晚宴，凡捐两万以上的企业上台亮相。',
    options: [
      { label: '捐！不能缺席', effect: { cash: -20000, reputation: 10,
          log: '大屏上打出"建国食品"时，台下响起了掌声。' } },
      { label: '无力出席', effect: { reputation: -3,
          log: '晚宴的照片里，同行们济济一堂，没有你的位置。' } }
    ] },

  { id: 'ev_leak', title: '内鬼疑云',
    text: '新品配方还没发布，对手就出了几乎一样的东西。厂里有内鬼。',
    options: [
      { label: '内部悄悄排查', effect: { morale: -3, investigation: 10,
          log: '你顺着订单记录查了几天，摸到了一点线头。' } },
      { label: '开会当面对质', effect: {
          risk: { chance: 0.5,
            win: { morale: 5, investigation: 15,
              log: '老员工们自发动了起来，帮你看住了每一道流程。' },
            lose: { morale: -8, log: '人心惶惶，两个年轻人递了辞呈。' } } } }
    ] },

  { id: 'ev_bank_visit', title: '信贷经理的暗示',
    text: '银行的信贷经理私下约你喝茶："如果引入新的战略股东，续贷会容易很多。"',
    options: [
      { label: '认真听取建议', effect: { flags: { bankHint: 1 }, investigation: 5,
          log: '你把他的话记在了本子上。字里行间，有人想借你的厂子上岸。' } },
      { label: '茶喝了，话没接', effect: { morale: 2,
          log: '你装作没听懂。回去的路上，你把"战略股东"四个字划掉了。' } }
    ] },

  { id: 'ev_father_lucid', title: '父亲清醒的下午',
    text: '难得的晴天，父亲精神好了些，拉着你讲老厂创业时的事，讲了整整一下午。',
    options: [
      { label: '听完，并记在本子上', effect: { morale: 8, health: 3, reputation: 2,
          log: '父亲说的三个老客户，后来都成了你的救命订单。' } },
      { label: '听了一会儿，赶回厂里', effect: { morale: 2,
          log: '你走时，父亲说："忙正事要紧。"你心里五味杂陈。' } }
    ] },

  { id: 'ev_market_fair', title: '农产品展销会',
    text: '市里办农产品展销会，老厂可以申请一个免费展位。',
    options: [
      { label: '参加，主打新品', effect: { cash: -6000, reputation: 6, morale: -3,
          log: '展销会上，你们摊位前排起了试吃长队。' } },
      { label: '放弃，全力保生产', effect: { morale: 2,
          log: '你选择把精力留给车间。订单重要，但曝光同样重要——你在赌。' } }
    ] },

  { id: 'ev_uncle_probe', title: '三叔来探病',
    text: '三叔林振海拎着果篮来医院看父亲，字里行间都在问厂子的账。',
    options: [
      { label: '滴水不漏', effect: { investigation: 8,
          log: '你笑着打太极。他走后，你注意到他袖口的手表是新的。' } },
      { label: '当面摊牌试探', effect: { morale: -4,
          risk: { chance: 0.4,
            win: { investigation: 15, log: '他愣了一下。那一瞬间的慌乱，你全看在眼里。' },
            lose: { reputation: -4, log: '他反打一耙："厂子垮了你负责？"探病不欢而散。' } } } }
    ] }
];

/* ---------------------------------------------------------------------------
 * 3. 危机节点 CRISIS_EVENTS —— 固定周数的大事件（剧情骨架）
 * ---------------------------------------------------------------------------
 *  每一局都按固定周数触发：第4/8/12/16/20/24周。
 *  结构与随机事件一致，但文案更长、选择更重、影响更大。
 * ------------------------------------------------------------------------- */
var CRISIS_EVENTS = {
  4: { id: 'crisis_bank', title: '危机：银行抽贷',
    text: '周一早上，银行客户经理站在办公室门口，脸色为难："上级行调整政策，你家的存量贷款……要提前收回三百万。"\n消息传开，供应商的电话立刻停了。',
    options: [
      { label: '抵押老设备续贷', effect: { cash: 300000, debt: 300000, equipment: -1,
          log: '你签了抵押合同。三百万到账，代价是那条最老的生产线。' } },
      { label: '民间拆借渡劫', effect: { cash: 200000, debt: 260000, reputation: -5,
          log: '你借了年化惊人的过桥钱。窟窿暂时堵上了，债却更沉了。' } },
      { label: '硬顶，据理力争', effect: {
          risk: { chance: 0.5,
            win: { reputation: 5, morale: 8,
              log: '你带着完税证明和订单簿逐级申诉，银行同意分期归还。' },
            lose: { debt: 400000, reputation: -5,
              log: '申诉失败，逾期记录上了征信。债务又厚了一层。' } } } }
    ] },

  8: { id: 'crisis_uncle', title: '危机：三叔逼宫',
    text: '三叔召集家族会议，会议桌上摆着一份"重组方案"：由他接管厂子，"体面地"清算。\n"一帆，"他敲着桌子，"你还年轻，别把最后一点家底赔进去。"',
    options: [
      { label: '召开家族会议正面回击', effect: {
          risk: { chance: 0.55, bonus: { reputation: 30 },
            win: { reputation: 8, morale: 8,
              log: '你当众立下军令状：三个月内让厂子现金流转正。长辈们看你的眼神变了。' },
            lose: { morale: -10, reputation: -5,
              log: '几位叔公心向稳妥，你在会议上被孤立了。' } } } },
      { label: '虚与委蛇，暗查他的账', effect: { investigation: 20, morale: -4,
          log: '你笑着让他"再给点时间"。散会后，你翻开了那些烂账的第一页。' } },
      { label: '提前摊牌挪用证据', effect: {
          risk: { chance: 0.6, bonus: { investigation: 60 },
            win: { reputation: 15, morale: 10, flags: { truthPartial: 1 },
              log: '你甩出资金流水：厂子的钱经由空壳公司流进了他小舅子的账户。全场哗然。' },
            lose: { reputation: -8, morale: -6,
              log: '证据链不完整，反被他咬定"伪造"。会后，两个供货商暂停了合作。' } } } }
    ] },

  12: { id: 'crisis_media', title: '危机：舆论风暴',
    text: '本地论坛一篇《老字号之死：建国食品欠债内幕》冲上热榜。真假掺半，群情汹涌。',
    options: [
      { label: '开发布会自证清白', effect: { cash: -20000, reputation: 8, morale: 4,
          log: '你带着老照片、老员工和完税记录开发布会。舆情渐渐转向："三代人的厂子，不容易。"' } },
      { label: '冷处理，让时间说话', effect: { reputation: -8, morale: -4,
          log: '你没回应。热度退去时，"老字号要凉"的印象也留下来了。' } },
      { label: '找水军反攻对手', effect: { cash: -15000,
          risk: { chance: 0.45,
            win: { reputation: 5, flags: { dirty: 1 },
              log: '对手也被拖下了水。你赢了舆论，却有点不认识自己了。' },
            lose: { reputation: -12, flags: { dirty: 1 },
              log: '水军被扒，反噬如潮。你的名字和"操纵舆论"绑在了一起。' } } } }
    ] },

  16: { id: 'crisis_acquisition', title: '危机：鸿门宴收购',
    text: '城东的巨鳄"鼎盛资本"递来收购要约：出价 800 万买下老厂全部资产与品牌，"帮你们全家解脱"。',
    options: [
      { label: '当场撕掉要约', effect: { morale: 8, reputation: 5,
          log: '你把要约书撕成两半："厂子可以烂在我手里，不姓别家的姓。"全厂肃然。' } },
      { label: '假意周旋换情报', effect: { investigation: 15, morale: -4,
          log: '你赴了那场鸿门宴。推杯换盏间，你确认了：他们最忌惮的是你手里的配方。' } },
      { label: '认真考虑卖厂', effect: { flags: { sellout: 1 },
          log: '你在合同上签了字。签字的手，很稳；回家的路，很长。' } }
    ] },

  20: { id: 'crisis_surgery', title: '危机：父亲的手术窗口',
    text: '主治医生把你叫到走廊："手术窗口就在这两周。费用加康复，前前后后要二十万。做不做？"',
    options: [
      { label: '卖房卖车，全力一搏', effect: { cash: -200000, health: 35, morale: 10,
          log: '手术很成功。推出来时父亲朝你比了个大拇指。那天你在医院天台哭了一场。' } },
      { label: '保守治疗，稳字当头', effect: { health: 10,
          log: '父亲摆摆手："留点钱给厂子。"你们都懂这个决定意味着什么。' } },
      { label: '拒绝手术', effect: { health: -5, morale: -15, reputation: -5,
          log: '你选择了放弃。签字那天，你没敢看父亲的脸。' } }
    ] },

  24: { id: 'crisis_final', title: '终局：股东大会',
    text: '第二十四周，股东大会。老厂的去留、家族的债务、父亲的药费，全部摆在这张桌上。\n所有人都看着你：这三个月，你已经证明了些什么。',
    options: [
      { label: '宣布你的计划', effect: { morale: 5,
          log: '你站起身，身后是这三个月的账本、病历和调查笔记。故事在这里迎来结局。' } }
    ] }
};

/* ---------------------------------------------------------------------------
 * 3.5 拍卖会 AUCTION_EVENTS —— 固定周（6/14/22）开放的大事件（0.3.0 新增）
 * ---------------------------------------------------------------------------
 *  与城里的藏家们竞价抢一件老物件：出价越高越可能赢，魅力值提高胜率。
 *  拍品与回报全部原创；胜率用 risk.chance + bonus.charm 机制实现。
 * ------------------------------------------------------------------------- */
var AUCTION_EVENTS = {
  6: { id: 'auction_6', title: '拍卖会：爷爷的老配方手稿',
    text: '城里秋季拍卖会上出现了一件让全厂心跳加速的东西——爷爷当年亲笔的老配方手稿。\n台下的藏家们摩拳擦掌。主持人的槌子悬在半空。',
    options: [
      { label: '举牌：30 万', effect: { cash: -300000,
          risk: { chance: 0.35, bonus: { charm: 40 },
            win: { reputation: 10, morale: 8, items: { aid: 1 },
              log: '一槌定音！手稿归你了。当晚全厂传阅，老师傅们红了眼眶（声望+10，士气+8，还翻出一箱老伙计留下的急救药材）。' },
            lose: { morale: -6,
              log: '一位戴金丝眼镜的藏家轻描淡写地压过了你。30 万打了水漂，权当认识了一圈人。' } } } },
      { label: '狠心跟：60 万', effect: { cash: -600000,
          risk: { chance: 0.55, bonus: { charm: 40 },
            win: { reputation: 15, morale: 10, cash: 300000,
              log: '你咬牙举牌到最后！手稿到手，还吸引来一位愿意赞助 30 万的投资人。（声望+15，士气+10，回款 30 万）' },
            lose: { morale: -8,
              log: '对手是来真的。你被压到最后一口价，60 万只剩一场空欢喜。' } } } },
      { label: '按兵不动', effect: { morale: -3,
          log: '你握紧拳头坐在最后一排，把每一张报价单都记进了小本子。' } }
    ] },
  14: { id: 'auction_14', title: '拍卖会：德国老灌装线',
    text: '冬日拍卖专场：一套退役的德国老灌装线，成色八新，起拍价低得可疑。\n厂里的老师傅们听完眼睛都亮了。',
    options: [
      { label: '举牌：40 万', effect: { cash: -400000,
          risk: { chance: 0.4, bonus: { charm: 40 },
            win: { equipment: 1, morale: 8,
              log: '拿下！老师傅们连夜把设备装进车间（设备等级 +1）。' },
            lose: { morale: -6, cash: 80000,
              log: '设备有暗伤的传闻吓退了你，也吓退了别人——你转手把保证金里能退的 8 万拿了回来。' } } } },
      { label: '志在必得：80 万', effect: { cash: -800000,
          risk: { chance: 0.65, bonus: { charm: 40 },
            win: { equipment: 1, reputation: 8, morale: 10,
              log: '整套生产线进了厂！安装那天，半条街的人都来看热闹（设备+1，声望+8，士气+10）。' },
            lose: { morale: -10,
              log: '一个电话竞价的人从头到尾没露面，却拿走了你志在必得的一切。80 万，买了个教训。' } } } },
      { label: '放弃竞拍', effect: { morale: -2,
          log: '你算了一整晚的账，最终在拍卖会开始前离开了会场。' } }
    ] },
  22: { id: 'auction_22', title: '拍卖会：破产同行的一批订单设备',
    text: '压轴专场：隔壁破产食品厂整体拍卖——订单合同、客户名单、包装设备打包装在一起。\n买下它，就等于接手他的江山；买不起，就是看别人东山再起。',
    options: [
      { label: '出价：50 万', effect: { cash: -500000,
          risk: { chance: 0.45, bonus: { charm: 40 },
            win: { reputation: 10, morale: 6, cash: 200000,
              log: '你接过了那本客户名单。第一周就回款 20 万——同行三十年的信誉，比设备值钱。' },
            lose: { morale: -6,
              log: '对家的法务更硬。50 万保证金退回来时，你只带走了一句"下次再来"。' } } } },
      { label: '豪赌：100 万', effect: { cash: -1000000,
          risk: { chance: 0.7, bonus: { charm: 40 },
            win: { reputation: 15, morale: 12, cash: 600000, items: { invite: 2 },
              log: '全场哗然——你把同行的江山买了下来！合同回款 60 万，还白得两张客户递来的商务邀请函。' },
            lose: { morale: -12,
              log: '资金链在最后一口价上绷断了。100 万换来一场空，厂里安静了整整一周。' } } } },
      { label: '不掺和', effect: { morale: -2,
          log: '你远远看完了整场拍卖。回家的路上，你把"现金流"三个字写在手心，攥了一路。' } }
    ] }
};

/* ---------------------------------------------------------------------------
 * 4. 先知记忆 FORESIGHT_HINTS —— 金手指提示文案
 *    用"启动先知记忆"时，引擎按"下一个将到来的危机周"取提示。
 * ------------------------------------------------------------------------- */
var FORESIGHT_HINTS = {
  4:  '银行会在第 4 周突然抽贷。手头宽裕些，或者准备好可抵押的设备，别到时抓瞎。',
  8:  '三叔会在第 8 周发难。声望和调查进度，是你在家族会议上的两种武器。',
  12: '第 12 周有媒体埋伏。身正不怕影子斜——发布会的 2 万块钱，提前留出来。',
  16: '第 16 周的收购要约是鸿门宴。调查进度越高，你的筹码越重。',
  20: '第 20 周是父亲的手术窗口。请把 20 万救命钱，提前一分不少地备好。',
  24: '最后一周，全员都在看你。你已经知道结局会写什么样了，对吧？'
};

/* ---------------------------------------------------------------------------
 * 5. 结局库 ENDINGS —— 一切的终点
 * ---------------------------------------------------------------------------
 *  判定逻辑在 engine.js 的 evaluateEnding()，此处只存文案。
 *  rank 越大结局越好（用于结算界面配色/评语）。
 * ------------------------------------------------------------------------- */
var ENDINGS = {
  empire_truth: { title: '破晓时刻', rank: 5,
    text: '股东大会上，你不仅宣布了债务清零，还当众公布了三叔挪用资金的完整证据链。警方带走他时，父亲在轮椅上为你鼓了掌。\n老厂的牌子重新挂上了镀金的边。人们说起林家，会说：那个年轻人，把塌了的天，一砖一瓦地垒了回去。\n—— 真结局【破晓时刻】达成。你救回了厂子，也救回了"家"这个字。' },

  empire: { title: '力挽狂澜', rank: 4,
    text: '债务清零，订单排到了明年。父亲坐在重新开工的车间里，看着第一批新货装箱出厂，笑着笑着就红了眼眶。\n你没查清三叔的每一笔烂账，但那已经不重要了——日子往前走，比什么都强。\n—— 结局【力挽狂澜】达成。' },

  steady: { title: '稳中向好', rank: 3,
    text: '债没有还完，但厂子活下来了，父亲的病也稳住了。你在账本最后一页写下下个季度的计划。\n有些胜利不是欢呼出来的，是熬出来的。\n—— 结局【稳中向好】达成。' },

  restart: { title: '东山再起', rank: 2,
    text: '债台还在，但你没有倒下。你和留下的老伙计们在食堂吃了顿饭，约好下周继续。\n家业可以慢慢赚，人心散了就真的什么都没了——好在，人心还在。\n—— 结局【东山再起】达成。' },

  sold: { title: '易主之后', rank: 1,
    text: '厂子卖了个好价钱，债还清了，父亲也接进了市里的医院。\n只是路过老厂门口时，看见"鼎盛食品"的新招牌，你站了很久。\n钱保住了，家没了。\n—— 结局【易主之后】达成。' },

  unknown: { title: '隐姓埋名', rank: 1,
    text: '声望扫地之后，没人再愿意跟林家做生意。你带着父亲去了南方的小城，改了手机号。\n菜市场里，偶尔有人多看你两眼——大概只是觉得面熟吧。\n—— 结局【隐姓埋名】达成。' },

  prison: { title: '锒铛入狱', rank: 0,
    text: '为了翻身，你走过了太多次灰色地带。这一次，没有下次了。\n宣判那天，父亲没能到场。你在里面给阿彪写了封信：替我看看厂子。\n—— 结局【锒铛入狱】达成。重开一局，做个干净的人试试？' },

  father_lost: { title: '病榻诀别', rank: 0,
    text: '那个周日下午，心电监护仪拉成了直线。\n账本上还写着没还完的债和没做完的订单，可这世上最贵的那一笔，你已经永远付不起了。\n厂子的灯还亮着，可"家"这个字，缺了一半。\n—— 结局【病榻诀别】达成。这一局，请把医疗费当成最优先级。' },

  crushed: { title: '债台高筑', rank: 0,
    text: '利滚利的债像雪崩一样压了下来。资产冻结令贴在厂门口那天，老员工们自发来送了最后一程。\n你带走了父亲，也带走了一句承诺：会回来的。\n—— 结局【债台高筑】达成。下一局试试尽早还债、别碰投机？' }
};

/* ---------------------------------------------------------------------------
 * 6. 结算所需的 delta 格式说明（给接手人的速查）
 * ---------------------------------------------------------------------------
 *  一个 delta（效果包）就是一个普通对象，键和含义如下：
 *    cash          公司账户增减    pocket     个人钱包增减（0.2.0 双资金）
 *    debt          债务增减        health     父亲健康增减
 *    reputation    声望增减        morale     士气增减
 *    charm         魅力增减        equipment  设备等级增减
 *    inventory     原料份数增减    investigation 调查进度增减
 *    items         道具增减对象，如 { aid: 1 }（aid急救箱/invite邀请函/chicken怀表）
 *    flags         要写入的剧情标记对象，如 { owedFriend: 1 }
 *    log           结算后写入本周日志的一句文案
 *    risk          概率分支 { chance, win:{delta}, lose:{delta}, bonus:{...} }
 *                  bonus 内的键表示"满足该状态时走 win 分支的概率加成"，
 *                  例如 { investigation: 60 } 表示调查≥60时胜率+30%。
 *  数值范围：health/reputation/morale/charm 自动夹在 0~100；
 *  两个账户都不允许为负——不够扣时引擎会自动"借高利贷"并加重债务。
 * ------------------------------------------------------------------------- */

/* 导出：兼容三种环境——桌面浏览器(script标签)、Node(测试)、小程序(CommonJS) */
if (typeof module !== 'undefined' && module.exports) { module.exports = { CONFIG: CONFIG, ACTIONS: ACTIONS, SPECIAL_ACTIONS: SPECIAL_ACTIONS, NO_AP_ACTIONS: NO_AP_ACTIONS, ACHIEVEMENTS: ACHIEVEMENTS, PRODUCTS: PRODUCTS, AUCTION_WEEKS: AUCTION_WEEKS, AUCTION_EVENTS: AUCTION_EVENTS, RANDOM_EVENTS: RANDOM_EVENTS, CRISIS_EVENTS: CRISIS_EVENTS, FORESIGHT_HINTS: FORESIGHT_HINTS, ENDINGS: ENDINGS }; }
