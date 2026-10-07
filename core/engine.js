/**
 * ============================================================================
 *  《重生之我在破败家族力挽狂澜》—— core/engine.js
 * ----------------------------------------------------------------------------
 *  文件职责：
 *    游戏引擎：只负责"规则怎么算"，不碰任何界面（DOM / 小程序 API）。
 *    这让它可以同时跑在三种地方：
 *      · 桌面浏览器（desktop/index.html 用 <script> 引入）
 *      · 微信 / 抖音小程序（utils/ 里 require 引入）
 *      · Node.js（tools/smoke_test.js 用来自动测试）
 *
 *  数据从哪来？
 *    从同目录的 data.js 来（见文件顶部的引入）。改数值/文案去 data.js，
 *    改"规则"（比如利息怎么算、结局怎么判）才需要动这个文件。
 *
 *  核心概念速查：
 *    state        一局游戏的全部进度（纯 JSON，可直接存档/读档）
 *    行动(AP)     每周 3 点，花完点"结束本周"进入结算
 *    delta        效果包（格式见 data.js 第 6 节的速查说明）
 *    事件         每周结算时可能触发，玩家做出选择后才进入下一周
 *    结局         触发失败条件立即结算；撑过 24 周按状态评定结局
 *
 *  @version 0.1.0
 *  @see     docs/CHANGELOG.md  修改后请同步更新变更日志！
 * ============================================================================
 */

/* ---------------------------------------------------------------------------
 * 引入数据（兼容浏览器全局变量 / 小程序 CommonJS 两种方式）
 * 浏览器端：data.js 先于本文件加载，直接用全局变量 DATA_DEFINED
 * 小程序端：走 require 路径
 * ------------------------------------------------------------------------- */
var _data;
if (typeof CONFIG === 'undefined') {
  // 浏览器里 data.js 已用 <script> 加载为全局变量，这里无须 require；
  // Node 测试环境走 require。
  if (typeof require === 'function') {
    _data = require('./data.js');
  }
} else {
  _data = {
    CONFIG: CONFIG, ACTIONS: ACTIONS, SPECIAL_ACTIONS: SPECIAL_ACTIONS,
    NO_AP_ACTIONS: NO_AP_ACTIONS, ACHIEVEMENTS: ACHIEVEMENTS,
    PRODUCTS: PRODUCTS, AUCTION_WEEKS: AUCTION_WEEKS, AUCTION_EVENTS: AUCTION_EVENTS,
    RANDOM_EVENTS: RANDOM_EVENTS, CRISIS_EVENTS: CRISIS_EVENTS,
    FORESIGHT_HINTS: FORESIGHT_HINTS, ENDINGS: ENDINGS
  };
}
var CONFIG        = _data.CONFIG;
var ACTIONS       = _data.ACTIONS;
var SPECIAL_ACTIONS = _data.SPECIAL_ACTIONS;
var NO_AP_ACTIONS = _data.NO_AP_ACTIONS || {};
var ACHIEVEMENTS  = _data.ACHIEVEMENTS || [];
var PRODUCTS      = _data.PRODUCTS || [];
var AUCTION_WEEKS = _data.AUCTION_WEEKS || {};
var AUCTION_EVENTS = _data.AUCTION_EVENTS || {};
var RANDOM_EVENTS = _data.RANDOM_EVENTS;
var CRISIS_EVENTS = _data.CRISIS_EVENTS;
var FORESIGHT_HINTS = _data.FORESIGHT_HINTS;
var ENDINGS       = _data.ENDINGS;

/** 属性上下限（0~100 的都夹在这个区间） */
var STAT_MIN = 0, STAT_MAX = 100;

/* ===========================================================================
 * 一、工具函数
 * ======================================================================== */

/** 把数值夹在 [min, max] 之间，防止状态越界 */
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/** [a, b] 闭区间取随机整数（含两端） */
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

/** 把金额显示成"12.5万"这种可读格式（界面和日志共用） */
function money(n) {
  var sign = n < 0 ? '-' : '';
  var v = Math.abs(Math.round(n));
  if (v >= 10000) { return sign + (v / 10000).toFixed(v % 10000 === 0 ? 0 : 1) + '万'; }
  return sign + v + '元';
}

/* ===========================================================================
 * 二、开局 / 存档
 * ======================================================================== */

/**
 * 创建一局新游戏。
 * 返回的 state 是纯 JSON：所有平台都直接 JSON.stringify 存档。
 */
function newGame() {
  return {
    ver: CONFIG.VERSION,          // 存档创建时的版本号（将来做存档迁移用）
    week: 1,                      // 当前周数（1 ~ MAX_WEEKS）
    ap: CONFIG.AP_PER_WEEK,       // 本周剩余行动点

    cash: CONFIG.START_CASH,      // 公司账户（经营收支、还债、发工资）
    pocket: CONFIG.START_POCKET,  // 个人钱包（医疗、投机、道具；0.2.0 双资金体系）
    debt: CONFIG.START_DEBT,      // 债务
    health: CONFIG.START_HEALTH,  // 父亲健康
    reputation: CONFIG.START_REPUTATION,  // 声望
    morale: CONFIG.START_MORALE,  // 士气
    charm: CONFIG.START_CHARM,    // 魅力值：社交场上的通行证
    equipment: 1,                 // 设备等级 1~5
    inventory: 0,                 // 原料份数 0~3
    investigation: 0,             // 三叔资金调查进度 0~100

    foresight: CONFIG.FORESIGHT_MAX,  // 先知记忆剩余次数
    pendingIncome: 0,             // 理财到账等"下周结算时进账"的金额（进个人钱包）
    items: { aid: 1, invite: 0, chicken: 0 },  // 道具：急救箱/商务邀请函/时光怀表
    history: [],                  // 每周开局快照（时光怀表回溯用，最多存 2 条）
    products: { gua: 0, guan: 0, lihe: 0 },    // 产品线等级（0.3.0，各 0~3）
    staff: 0,                     // 员工人数（0.3.0，0~6）

    flags: { achievements: {} },  // 剧情标记 + 已解锁成就（ achievements: {id:1} ）
    log: ['【第1周】你回到了一切开始前的那个夏天。老厂账上只有'
          + money(CONFIG.START_CASH) + '，你口袋里揣着 ' + money(CONFIG.START_POCKET)
          + '，而家族的债是 ' + money(CONFIG.START_DEBT) + '。'],
    usedEvents: {},               // 已触发过的一次性事件 id（防止重复）

    pendingEvent: null,           // 待处理的事件对象（玩家选择后清空）
    ended: false,                 // 是否已出结局
    ending: null                  // 结局 id（对应 ENDINGS）
  };
}

/** 存档键名（三个平台统一用它，接手人别随意改，改了老玩家的存档会丢） */
var SAVE_KEY = 'cs_family_save_v1';

/* ===========================================================================
 * 三、行动的可用性判断
 * ======================================================================== */

/**
 * 判断某个行动当前能不能用。
 * 返回 { ok: true } 或 { ok: false, reason: '给玩家看的拒绝理由' }。
 */
function canUseAction(state, actionId) {
  var action = findAction(actionId);
  if (!action) { return { ok: false, reason: '未知行动' }; }

  // 已出结局 / 本周还有事件没处理：一律禁止行动
  if (state.ended) { return { ok: false, reason: '本局已结束' }; }
  if (state.pendingEvent) { return { ok: false, reason: '请先处理当前事件' }; }

  // 行动点检查（转账/道具/金手指这类"银行业务"不耗行动点）
  if (!NO_AP_ACTIONS[actionId]) {
    if (state.ap <= 0) { return { ok: false, reason: '本周行动点已用完，请点击"结束本周"' }; }
  }

  // data.js 里声明的资源门槛：need.cash = 公司账户余额，need.pocket = 个人钱包余额
  if (action.need) {
    if (typeof action.need.cash === 'number' && state.cash < action.need.cash) {
      return { ok: false, reason: '公司账户资金不足（需要 ' + money(action.need.cash) + '）' };
    }
    if (typeof action.need.pocket === 'number' && state.pocket < action.need.pocket) {
      return { ok: false, reason: '个人钱包不足（需要 ' + money(action.need.pocket)
        + '，可先用"转账"从公司账户调钱）' };
    }
  }

  // ---- 特殊行动各自的额外门槛 ----
  switch (actionId) {
    case 'order':      // 接订单永远可以（辛苦钱）
      return { ok: true };
    case 'upgrade':
      if (state.equipment >= CONFIG.MAX_EQUIPMENT) {
        return { ok: false, reason: '设备已是满级' };
      }
      if (state.cash < upgradeCost(state)) {
        return { ok: false, reason: '现金不足（需要 ' + money(upgradeCost(state)) + '）' };
      }
      return { ok: true };
    case 'medical': {
      // 医疗费每周递增（病情加重），门槛是动态的，不能靠静态 need 声明
      var med = medicalCost(state);
      if (state.pocket < med) {
        return { ok: false, reason: '个人钱包不足（本周需要 ' + money(med) + '，可先转账）' };
      }
      return { ok: true };
    }
    case 'repay':
      if (state.debt <= 0) { return { ok: false, reason: '家族已经无债一身轻' }; }
      return { ok: true };
    case 'invest_low':
      if (state.cash < CONFIG.INVEST_LOW_AMOUNT) {
        return { ok: false, reason: '现金不足（需要 ' + money(CONFIG.INVEST_LOW_AMOUNT) + '）' };
      }
      return { ok: true };
    case 'invest_high':
      if (state.cash < CONFIG.INVEST_HIGH_AMOUNT) {
        return { ok: false, reason: '现金不足（需要 ' + money(CONFIG.INVEST_HIGH_AMOUNT) + '）' };
      }
      return { ok: true };
    case 'foresight':
      if (state.foresight <= 0) { return { ok: false, reason: '先知记忆已用尽' }; }
      return { ok: true };
    case 'use_aid':
      if (!(state.items.aid > 0)) { return { ok: false, reason: '没有急救箱了' }; }
      if (state.health >= STAT_MAX) { return { ok: false, reason: '父亲已经很健康，先留着' }; }
      return { ok: true };
    case 'use_invite':
      if (!(state.items.invite > 0)) { return { ok: false, reason: '没有商务邀请函了' }; }
      return { ok: true };
    case 'use_chicken':
      if (!(state.items.chicken > 0)) { return { ok: false, reason: '没有时光怀表（可花 50 万购买）' }; }
      if (state.history.length === 0) { return { ok: false, reason: '还没有可回溯的周（下周起才有记录）' }; }
      return { ok: true };
    case 'develop_gua':
    case 'develop_guan':
    case 'develop_lihe': {
      var pid = actionId.replace('develop_', '');
      var prod = findProduct(pid);
      var lv = state.products[pid] || 0;
      if (lv >= 3) { return { ok: false, reason: prod.name + ' 已是满级' }; }
      if (state.cash < productCost(prod, lv)) {
        return { ok: false, reason: '公司账户资金不足（需要 ' + money(productCost(prod, lv)) + '）' };
      }
      return { ok: true };
    }
    case 'hire_staff':
      if (state.staff >= CONFIG.STAFF_MAX) { return { ok: false, reason: '厂里已经满员（上限 ' + CONFIG.STAFF_MAX + ' 人）' }; }
      return { ok: true };
    case 'fire_staff':
      if (state.staff <= 0) { return { ok: false, reason: '厂里已经没有员工了' }; }
      return { ok: true };
    default:
      return { ok: true };
  }
}

/** 查找行动定义 */
function findAction(actionId) {
  for (var i = 0; i < ACTIONS.length; i++) {
    if (ACTIONS[i].id === actionId) { return ACTIONS[i]; }
  }
  return null;
}

/** 升级设备到下一级的花费：1→2 花6万，2→3 花12万…… */
function upgradeCost(state) { return 60000 * state.equipment; }

/** 本周的医疗费：基础费用 + 每周递增（父亲的病情会加重，0.2.0 起） */
function medicalCost(state) {
  return CONFIG.MEDICAL_COST + (state.week - 1) * (CONFIG.MEDICAL_COST_GROWTH || 0);
}

/* ---------------------------------------------------------------------------
 * 产品线（0.3.0）：研发费用 = costBase × 下一级等级；总等级提供订单加成与维护费
 * ------------------------------------------------------------------------ */
function findProduct(pid) {
  for (var i = 0; i < PRODUCTS.length; i++) {
    if (PRODUCTS[i].id === pid) { return PRODUCTS[i]; }
  }
  return null;
}

/** 把某条产品线从 lv 级升到 lv+1 级的研发费 */
function productCost(prod, lv) { return prod.costBase * (lv + 1); }

/** 产品线总等级（订单加成、维护费共用） */
function productLevels(state) {
  var total = 0;
  for (var p in state.products) { if (state.products.hasOwnProperty(p)) { total += state.products[p]; } }
  return total;
}

/* ===========================================================================
 * 四、执行行动
 * ======================================================================== */

/**
 * 执行一个行动。会直接修改 state（小程序/桌面端执行后立即存档即可）。
 * 返回 { logs: [本周新增日志...] }。
 */
function performAction(state, actionId) {
  var check = canUseAction(state, actionId);
  if (!check.ok) { return { logs: [], error: check.reason }; }

  var action = findAction(actionId);
  var logs = [];

  // 扣行动点（转账/道具/金手指这类不耗）
  if (!NO_AP_ACTIONS[actionId]) { state.ap--; }

  // 特殊行动走引擎内部逻辑，其余走通用 delta
  if (SPECIAL_ACTIONS[actionId]) {
    logs = doSpecialAction(state, actionId);
  } else {
    logs = applyDelta(state, action.effect, logs);
  }

  maybeFail(state, logs);               // 行动可能把健康打到 0，需检查
  checkAchievements(state, logs);       // 行动后顺手检查成就
  state.log = state.log.concat(logs);   // 日志并入存档，读档后历史不丢
  return { logs: logs };
}

/** 特殊行动的具体规则（数值公式集中在这里，调平衡主要改这里和 CONFIG） */
function doSpecialAction(state, actionId, logs) {
  logs = logs || [];

  switch (actionId) {

    /* 接订单：收入 = (基础2万 + 声望×600 + 士气×100)
       × (1 + 原料×0.3) × (1 + (设备-1)×0.25) × (1 + 魅力×0.4%)
       × (1 + 产品线总等级×0.15) × (1 + 员工×0.08)，每单消耗1份原料、6点士气 */
    case 'order': {
      var gain = (20000 + state.reputation * 600 + state.morale * 100);
      if (state.inventory > 0) {
        gain = gain * (1 + 0.3 * state.inventory);
        state.inventory--;
      }
      gain = Math.round(gain * (1 + 0.25 * (state.equipment - 1)) * (1 + state.charm * 0.004));
      gain = Math.round(gain * (1 + 0.15 * productLevels(state)) * (1 + 0.08 * (state.staff || 0)));
      state.cash += gain;
      state.morale = clamp(state.morale - 6, STAT_MIN, STAT_MAX);
      logs.push('📦 全厂赶工交付订单，进账 ' + money(gain) + '。');
      break;
    }

    /* 升级设备：花费见 upgradeCost()，满级5 */
    case 'upgrade': {
      var cost = upgradeCost(state);
      state.cash -= cost;
      state.equipment = clamp(state.equipment + 1, 1, CONFIG.MAX_EQUIPMENT);
      state.morale = clamp(state.morale + 5, STAT_MIN, STAT_MAX);
      logs.push('🏭 新生产线投产（设备 Lv.' + state.equipment + '），花了 ' + money(cost) + '。工人们干劲更足了。');
      break;
    }

    /* 还债：固定还 CONFIG.REPAY_AMOUNT（从公司账户扣） */
    case 'repay': {
      var pay = Math.min(CONFIG.REPAY_AMOUNT, state.debt, state.cash);
      state.cash -= pay;
      state.debt -= pay;
      state.reputation = clamp(state.reputation + 2, STAT_MIN, STAT_MAX);
      state.flags.repaidOnce = 1;        // 成就"第一桶金的诚意"用
      logs.push('💸 偿还欠款 ' + money(pay) + '，剩余债务 ' + money(state.debt) + '。债主的脸色缓和了几分。');
      break;
    }

    /* 支付医疗费：从个人钱包扣（费用每周递增），本周标记，结算时不再扣健康 */
    case 'medical': {
      var cost = medicalCost(state);
      state.pocket -= cost;
      state.health = clamp(state.health + CONFIG.MEDICAL_HEAL, STAT_MIN, STAT_MAX);
      state.flags.paidMedicalThisWeek = 1;
      logs.push('🏥 从钱包支付医疗费 ' + money(cost) + '，父亲的情况明显好转。');
      break;
    }

    /* 追查资金流向：+10~18，攒满 100 触发"真相在手" */
    case 'investigate': {
      var inc = randInt(10, 18);
      state.investigation = clamp(state.investigation + inc, STAT_MIN, 100);
      logs.push('🔍 你又翻出一截资金链（调查进度 +' + inc + '，当前 ' + state.investigation + '%）。');
      if (state.investigation >= CONFIG.TRUTH_NEED && !state.flags.truthReady) {
        state.flags.truthReady = 1;
        logs.push('📌 证据链闭合：三叔通过空壳公司挪走了厂里 800 万。真相在你手里了。');
      }
      break;
    }

    /* 稳健理财：从个人钱包投，下周返还也进钱包 */
    case 'invest_low': {
      state.pocket -= CONFIG.INVEST_LOW_AMOUNT;
      state.pendingIncome += Math.round(CONFIG.INVEST_LOW_AMOUNT * CONFIG.INVEST_LOW_RETURN);
      logs.push('🏦 从钱包存了 ' + money(CONFIG.INVEST_LOW_AMOUNT) + ' 进短期理财，下周到账。');
      break;
    }

    /* 高风险投机：从个人钱包投，55% 赚 30%，45% 亏 15% */
    case 'invest_high': {
      state.pocket -= CONFIG.INVEST_HIGH_AMOUNT;
      if (Math.random() < 0.55) {
        var got = Math.round(CONFIG.INVEST_HIGH_AMOUNT * 1.3);
        state.pendingIncome += got;
        logs.push('🎲 投机得手！下周将回款 ' + money(got) + '。你有点不敢相信。');
      } else {
        var back = Math.round(CONFIG.INVEST_HIGH_AMOUNT * 0.85);
        state.pendingIncome += back;
        logs.push('🎲 这波栽了，下周只能回来 ' + money(back) + '。你锤了下桌子。');
      }
      break;
    }

    /* ---- 0.2.0 双资金体系：公司账户 → 个人钱包（收手续费） ---- */
    case 'transfer_s': {
      var feeS = Math.round(CONFIG.TRANSFER_S_AMOUNT * CONFIG.TRANSFER_FEE);
      state.cash -= CONFIG.TRANSFER_S_AMOUNT;
      state.pocket += CONFIG.TRANSFER_S_AMOUNT - feeS;
      logs.push('💳 转了 ' + money(CONFIG.TRANSFER_S_AMOUNT) + ' 到个人钱包，手续费 ' + money(feeS) + '。');
      break;
    }
    case 'transfer_l': {
      var feeL = Math.round(CONFIG.TRANSFER_L_AMOUNT * CONFIG.TRANSFER_FEE);
      state.cash -= CONFIG.TRANSFER_L_AMOUNT;
      state.pocket += CONFIG.TRANSFER_L_AMOUNT - feeL;
      logs.push('🏧 转了 ' + money(CONFIG.TRANSFER_L_AMOUNT) + ' 到个人钱包，手续费 ' + money(feeL) + '——肉疼。');
      break;
    }

    /* ---- 0.2.0 道具系统 ---- */
    case 'buy_chicken': {
      state.cash -= CONFIG.CHICKEN_COST;
      state.items.chicken++;
      logs.push('⏱️ 你花 ' + money(CONFIG.CHICKEN_COST) + ' 请回了传说中的时光怀表。从下周起，每一周的开始都会被它记住。');
      break;
    }
    case 'use_aid': {
      state.items.aid--;
      state.health = clamp(state.health + 25, STAT_MIN, STAT_MAX);
      logs.push('🧰 你打开陈师傅送的急救箱，给父亲做了一次深度护理（健康 +25）。');
      break;
    }
    case 'use_invite': {
      state.items.invite--;
      state.charm = clamp(state.charm + 8, STAT_MIN, STAT_MAX);
      state.reputation = clamp(state.reputation + 6, STAT_MIN, STAT_MAX);
      logs.push('📨 你出席了一场商务酒会，举杯之间谈笑风生（声望 +6，魅力 +8）。');
      break;
    }
    case 'use_chicken': {
      var snap = state.history.pop();          // 取出最近一次的周初快照
      restoreSnapshot(state, snap);
      logs.push('🌀 怀表逆时针飞转——你回到了第 ' + state.week + ' 周的开始。这一次，什么都还来得及。');
      break;
    }

    /* ---- 0.3.0 产品线：研发（从公司账户扣，每条线最多 3 级） ---- */
    case 'develop_gua':
    case 'develop_guan':
    case 'develop_lihe': {
      var pid = actionId.replace('develop_', '');
      var prod = findProduct(pid);
      var lv = state.products[pid] || 0;
      var cost = productCost(prod, lv);
      state.cash -= cost;
      state.products[pid] = lv + 1;
      logs.push(prod.icon + ' 「' + prod.name + '」研发到 ' + (lv + 1) + ' 级，花了 ' + money(cost) + '。订单收益 +15%。');
      break;
    }

    /* ---- 0.3.0 员工：招聘/辞退 ---- */
    case 'hire_staff': {
      state.cash -= CONFIG.STAFF_HIRE_COST;
      state.staff++;
      logs.push('🧑‍🏭 新师傅入伙！厂里现有 ' + state.staff + ' 名员工（订单收益 +8%，周工资 +1000）。');
      break;
    }
    case 'fire_staff': {
      state.staff--;
      state.morale = clamp(state.morale - 8, STAT_MIN, STAT_MAX);
      state.reputation = clamp(state.reputation - 2, STAT_MIN, STAT_MAX);
      logs.push('📤 一名员工默默收拾了工具箱。剩下的工人们看着他的背影，没说话（士气 -8，声望 -2）。');
      break;
    }

    /* 先知记忆：揭示下一个危机的提示（不耗行动点） */
    case 'foresight': {
      state.foresight--;
      var nextWeek = nextCrisisWeek(state);
      var hint = FORESIGHT_HINTS[nextWeek] || '上辈子的记忆到这里就模糊了……剩下的路，要靠你自己。';
      state.morale = clamp(state.morale + 3, STAT_MIN, STAT_MAX);
      logs.push('⚡ 你闭上眼，上辈子的记忆翻涌而来——');
      logs.push('🔮 ' + hint);
      break;
    }
  }
  return logs;
}

/** 找出"下一个尚未度过的"危机周；都过完了返回 null */
function nextCrisisWeek(state) {
  var weeks = [];
  for (var w in CRISIS_EVENTS) { if (CRISIS_EVENTS.hasOwnProperty(w)) { weeks.push(parseInt(w, 10)); } }
  weeks.sort(function (a, b) { return a - b; });
  for (var i = 0; i < weeks.length; i++) {
    if (weeks[i] >= state.week) { return weeks[i]; }
  }
  return null;
}

/* ===========================================================================
 * 五、delta 应用器：把效果包写进状态（事件、普通行动共用）
 * ======================================================================== */

/**
 * 把 delta（格式见 data.js 第 6 节）应用到 state。
 * logs 是日志数组，新增的句子会被 push 进去并返回。
 * 支持 risk 嵌套（概率分支），bonus 用于"满足条件提高胜率"。
 */
function applyDelta(state, delta, logs) {
  if (!delta) { return logs; }

  // 概率分支：掷骰子决定走 win 还是 lose
  if (delta.risk) {
    var chance = delta.risk.chance;
    var bonus = delta.risk.bonus || {};
    // bonus 里每个"满足条件的键"给胜率 +0.3（现在只有 investigation 用得到）
    if (bonus.investigation && state.investigation >= bonus.investigation) {
      chance += 0.3;
    }
    var branch = (Math.random() < chance) ? delta.risk.win : delta.risk.lose;
    if (branch) {
      if (branch.log) { logs.push(branch.log); }
      // 复制一份去掉 log 再递归应用，防止死循环
      var sub = {};
      for (var k in branch) { if (k !== 'log') { sub[k] = branch[k]; } }
      applyDelta(state, sub, logs);
    }
    return logs;
  }

  // 普通数值字段：白名单式处理，写错字段名不会悄悄生效
  // （0.2.0 起支持双资金：cash=公司账户，pocket=个人钱包）
  var NUM_KEYS = ['cash', 'pocket', 'debt', 'health', 'reputation', 'morale',
                  'charm', 'equipment', 'inventory', 'investigation', 'foresight'];
  for (var i = 0; i < NUM_KEYS.length; i++) {
    var key = NUM_KEYS[i];
    if (typeof delta[key] === 'number') {
      // inventory 允许特殊值 -99：表示"清空全部库存"（暴雨事件在用）
      if (key === 'inventory' && delta[key] <= -99) { state.inventory = 0; continue; }
      state[key] = state[key] + delta[key];
    }
  }

  // 范围修正
  state.health = clamp(state.health, STAT_MIN, STAT_MAX);
  state.reputation = clamp(state.reputation, STAT_MIN, STAT_MAX);
  state.morale = clamp(state.morale, STAT_MIN, STAT_MAX);
  state.charm = clamp(state.charm, STAT_MIN, STAT_MAX);
  state.equipment = clamp(state.equipment, 1, CONFIG.MAX_EQUIPMENT);
  state.inventory = clamp(state.inventory, 0, CONFIG.MAX_INVENTORY);
  state.investigation = clamp(state.investigation, STAT_MIN, 100);

  // 道具增减（delta.items 形如 { aid: 1 }；上限各 9 个）
  if (delta.items) {
    if (!state.items) { state.items = {}; }
    for (var it in delta.items) {
      if (delta.items.hasOwnProperty(it)) {
        state.items[it] = clamp((state.items[it] || 0) + delta.items[it], 0, 9);
      }
    }
  }

  // 两个账户都不允许为负：事件/危机的支出可能超过余额，
  // 这里统一"自动借高利贷"兜底，借入额是缺口的 2 倍（惩罚性）
  if (state.cash < 0) {
    var gap = -state.cash;
    var loan = gap * CONFIG.AUTO_BORROW_MULT;
    state.debt += loan;
    state.cash = 0;
    state.morale = clamp(state.morale - 5, STAT_MIN, STAT_MAX);
    logs.push('⚠️ 公司账户告负！被迫借入 ' + money(loan) + ' 高利贷填补 ' + money(gap) + ' 的缺口。');
  }
  if (state.pocket < 0) {
    var gapP = -state.pocket;
    var loanP = gapP * CONFIG.AUTO_BORROW_MULT;
    state.debt += loanP;
    state.pocket = 0;
    state.morale = clamp(state.morale - 5, STAT_MIN, STAT_MAX);
    logs.push('⚠️ 个人钱包见了底！被迫借了 ' + money(loanP) + ' 高利贷填补 ' + money(gapP) + ' 的亏空。');
  }

  // 剧情标记
  if (delta.flags) {
    for (var f in delta.flags) { if (delta.flags.hasOwnProperty(f)) { state.flags[f] = delta.flags[f]; } }
  }

  // 日志
  if (delta.log) { logs.push(delta.log); }
  return logs;
}

/* ===========================================================================
 * 六、周结算 endWeek：利息、工资、医疗、事件、推进周数
 * ======================================================================== */

/**
 * 结束本周（玩家点"结束本周"按钮时调用）。
 * 返回 { logs: [...], event: 事件对象或null }。
 * 若 event 非 null：本周停住，等玩家 resolveEvent() 后才进入下一周。
 */
function endWeek(state) {
  var logs = [];
  if (state.ended) { return { logs: logs, event: null }; }

  /* 1) 理财等"下周到账"的钱 */
  if (state.pendingIncome > 0) {
    state.cash += state.pendingIncome;
    logs.push('💰 上周的投资到账 ' + money(state.pendingIncome) + '。');
    state.pendingIncome = 0;
  }

  /* 2) 债务利息（0.5% 复利；"与债主周旋"过则本周免息） */
  if (state.debt > 0) {
    if (state.flags.deferInterest) {
      delete state.flags.deferInterest;
      logs.push('🤝 这周债主没催利息。但你知道，人情是有价的。');
    } else {
      var interest = Math.round(state.debt * CONFIG.WEEKLY_INTEREST_RATE);
      state.debt += interest;
      logs.push('📈 债务利息 +' + money(interest) + '，总债务 ' + money(state.debt) + '。');
    }
  }

  /* 3) 工资 + 老板周薪 */
  var wageTotal = CONFIG.WEEKLY_WAGE + (state.staff || 0) * (CONFIG.STAFF_WEEKLY_WAGE || 0);
  state.cash -= wageTotal;
  logs.push('🏭 发放周工资 ' + money(wageTotal) + '（含员工 ' + (state.staff || 0) + ' 人）。');
  state.pocket += CONFIG.WEEKLY_POCKET_SALARY;
  logs.push('👖 你的老板周薪 ' + money(CONFIG.WEEKLY_POCKET_SALARY) + ' 进了个人钱包。');

  /* 3.5) 产品线维护费（0.3.0）：厂子越大，每周烧钱越多 */
  var maint = productLevels(state) * (CONFIG.PRODUCT_MAINTENANCE || 0);
  if (maint > 0) {
    state.cash -= maint;
    logs.push('🍬 产品线维护费 ' + money(maint) + '（产线等级 ' + productLevels(state) + '）。');
  }

  /* 4) 医疗：本周没付医疗费 → 父亲健康下降 */
  if (!state.flags.paidMedicalThisWeek) {
    state.health = clamp(state.health - CONFIG.NO_MEDICAL_DAMAGE, STAT_MIN, STAT_MAX);
    logs.push('😔 这周没安排规范治疗，父亲的咳嗽又重了（健康 -' + CONFIG.NO_MEDICAL_DAMAGE + '）。');
  } else {
    delete state.flags.paidMedicalThisWeek;
  }

  /* 5) 现金告负 → 自动借高利贷（债滚债，惩罚性） */
  if (state.cash < 0) {
    var hole = -state.cash;
    var borrow = hole * CONFIG.AUTO_BORROW_MULT;
    state.debt += borrow;
    state.cash = 0;
    state.morale = clamp(state.morale - 8, STAT_MIN, STAT_MAX);
    logs.push('⚠️ 公司账户见底！你被迫借了 ' + money(borrow) + ' 的高利贷填补 ' + money(hole) + ' 的亏空。');
  }

  /* 5.5) 本周成就检查（还债/满血/百万账户等里程碑在这结算） */
  checkAchievements(state, logs);

  /* 5.5) 现金断裂/健康归零的即时检查（防止带着坏状态进事件） */
  if (maybeFail(state, logs)) {
    state.log = state.log.concat(logs);
    return { logs: logs, event: null };
  }

  /* 6) 事件：危机周必触发 → 拍卖周次之 → 普通周按概率抽 */
  var crisis = CRISIS_EVENTS[state.week];
  if (crisis) {
    state.pendingEvent = crisis;
    logs.push('🚨 【' + crisis.title + '】');
    state.log = state.log.concat(logs);
    return { logs: logs, event: crisis };
  }
  var auction = AUCTION_EVENTS[state.week];
  if (auction) {
    state.pendingEvent = auction;
    logs.push('🔨 【' + auction.title + '】');
    state.log = state.log.concat(logs);
    return { logs: logs, event: auction };
  }
  if (Math.random() < CONFIG.EVENT_CHANCE) {
    var ev = pickRandomEvent(state);
    if (ev) {
      state.pendingEvent = ev;
      logs.push('❗ 【' + ev.title + '】');
      state.log = state.log.concat(logs);   // 修复：事件周的结算日志也要并入存档
      return { logs: logs, event: ev };
    }
  }

  /* 7) 无事件：直接推进到下一周 */
  state.log = state.log.concat(logs);
  return { logs: logs, event: null, advanced: advanceWeek(state) };
}

/** 从随机事件池里挑一条（避开重复触发过的一次性事件） */
function pickRandomEvent(state) {
  var pool = [];
  for (var i = 0; i < RANDOM_EVENTS.length; i++) {
    var ev = RANDOM_EVENTS[i];
    if (!state.usedEvents[ev.id]) { pool.push(ev); }
  }
  if (pool.length === 0) { return null; }          // 全触发过了就不再出事件
  var chosen = pool[randInt(0, pool.length - 1)];
  state.usedEvents[chosen.id] = 1;                  // 每条事件一局最多出现一次
  return chosen;
}

/**
 * 玩家在事件弹窗里做出选择后调用。
 * 应用选项效果 → 进入下一周 → 可能结算结局。
 * 返回 { logs: [...] }。
 */
function resolveEvent(state, optionIndex) {
  var logs = [];
  if (!state.pendingEvent) { return { logs: logs, error: '当前没有待处理的事件' }; }

  var ev = state.pendingEvent;
  var opt = ev.options[optionIndex];
  state.pendingEvent = null;

  if (!opt) { return { logs: logs, error: '无效的选项' }; }
  applyDelta(state, opt.effect, logs);
  checkAchievements(state, logs);       // 事件选项也可能触发成就

  // 事件可能直接把健康打到 0 → 立即结算，不再推进周数
  if (maybeFail(state, logs)) {
    state.log = state.log.concat(logs);
    return { logs: logs };
  }

  advanceWeek(state);
  state.log = state.log.concat(logs);
  return { logs: logs };
}

/** 推进到下一周：重置行动点；若超出总周数则评定最终结局 */
function advanceWeek(state) {
  pushSnapshot(state);              // 每周开始前记快照（时光怀表回溯用）
  state.week++;
  state.ap = CONFIG.AP_PER_WEEK;
  state.log.push('—— 第 ' + state.week + ' 周 ——');
  if (state.week > CONFIG.MAX_WEEKS) {
    evaluateEnding(state);
  }
  return true;
}

/* ---------------------------------------------------------------------------
 * 周初快照（时光怀表回溯机制，0.2.0 新增）
 * ------------------------------------------------------------------------ */
/** 记录"本周开局"的关键状态（最多保留 2 条，防存档膨胀） */
function pushSnapshot(state) {
  var snap = {
    week: state.week,
    cash: state.cash, pocket: state.pocket, debt: state.debt,
    health: state.health, reputation: state.reputation, morale: state.morale,
    charm: state.charm, equipment: state.equipment, inventory: state.inventory,
    investigation: state.investigation, pendingIncome: state.pendingIncome,
    products: JSON.parse(JSON.stringify(state.products || {})),   // 0.3.0
    staff: state.staff || 0                                        // 0.3.0
  };
  state.history.push(snap);
  if (state.history.length > 2) { state.history.shift(); }
}

/** 把快照写回状态（撤销本周做过的一切；成就保留、剧情标记保留） */
function restoreSnapshot(state, snap) {
  if (!snap) { return; }
  state.week = snap.week;
  state.cash = snap.cash;
  state.pocket = snap.pocket;
  state.debt = snap.debt;
  state.health = snap.health;
  state.reputation = snap.reputation;
  state.morale = snap.morale;
  state.charm = snap.charm;
  state.equipment = snap.equipment;
  state.inventory = snap.inventory;
  state.investigation = snap.investigation;
  state.pendingIncome = snap.pendingIncome;
  state.products = JSON.parse(JSON.stringify(snap.products || { gua: 0, guan: 0, lihe: 0 }));
  state.staff = snap.staff || 0;
  state.pendingEvent = null;
  state.ended = false;
  state.ending = null;
  state.ap = CONFIG.AP_PER_WEEK;
}

/* ---------------------------------------------------------------------------
 * 成就系统（0.2.0 新增）：在行动/事件/结算后自动检查
 * ------------------------------------------------------------------------ */
/** 遍历成就表，把新达成的写进 flags.achievements 并播报 */
function checkAchievements(state, logs) {
  if (state.ended || !state.flags.achievements) { return; }
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    var a = ACHIEVEMENTS[i];
    if (!state.flags.achievements[a.id]) {
      var ok = false;
      try { ok = a.cond(state); } catch (e) { ok = false; }
      if (ok) {
        state.flags.achievements[a.id] = 1;
        logs.push('🏆 成就达成【' + a.name + '】：' + a.desc);
      }
    }
  }
}

/* ===========================================================================
 * 七、结局判定
 * ======================================================================== */

/**
 * 检查"立即失败"类条件（健康归零 / 现金断裂时自动借贷已兜底）。
 * 返回 true 表示本局已结束。
 */
function maybeFail(state, logs) {
  if (state.ended) { return true; }
  if (state.health <= 0) {
    setEnding(state, 'father_lost', logs);
    return true;
  }
  return false;
}

/** 终局评定：按优先级从上到下，第一条命中的生效 */
function evaluateEnding(state, logs) {
  if (state.ended) { return; }
  var truth = state.investigation >= CONFIG.TRUTH_NEED || state.flags.truthReady;
  var dirty = state.flags.dirty || 0;

  if (state.flags.sellout)                                  { setEnding(state, 'sold', logs); return; }
  if (state.health <= 0)                                    { setEnding(state, 'father_lost', logs); return; }
  if (dirty >= 3)                                           { setEnding(state, 'prison', logs); return; }
  if (state.debt <= 0 && truth && state.health >= 70 && state.reputation >= 60) {
                                                              setEnding(state, 'empire_truth', logs); return; }
  if (state.debt <= 0 && state.health >= 60)                { setEnding(state, 'empire', logs); return; }
  if (state.debt <= 2000000 && state.health >= 40)          { setEnding(state, 'steady', logs); return; }
  if (state.debt > CONFIG.DEBT_CRUSH)                       { setEnding(state, 'crushed', logs); return; }
  if (state.reputation < 20)                                { setEnding(state, 'unknown', logs); return; }
  setEnding(state, 'restart', logs);
}

/** 写入结局状态并补一条日志 */
function setEnding(state, endingId, logs) {
  state.ended = true;
  state.ending = endingId;
  var e = ENDINGS[endingId] || { title: endingId };
  var line = '🏁 结局达成：【' + e.title + '】';
  if (logs) { logs.push(line); }
  state.log.push(line);
}

/* ===========================================================================
 * 八、导出（浏览器全局 / Node require / 小程序 module.exports 三兼容）
 * ======================================================================== */
var Engine = {
  SAVE_KEY: SAVE_KEY,
  newGame: newGame,
  canUseAction: canUseAction,
  performAction: performAction,
  endWeek: endWeek,
  resolveEvent: resolveEvent,
  evaluateEnding: evaluateEnding,
  money: money,
  findAction: findAction,
  upgradeCost: upgradeCost,
  nextCrisisWeek: nextCrisisWeek,
  checkAchievements: checkAchievements,
  pushSnapshot: pushSnapshot,
  restoreSnapshot: restoreSnapshot,
  medicalCost: medicalCost,
  productLevels: productLevels,
  findProduct: findProduct,
  productCost: productCost
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Engine;      // Node / 小程序
}
if (typeof window !== 'undefined') {
  window.Engine = Engine;       // 桌面浏览器
}
