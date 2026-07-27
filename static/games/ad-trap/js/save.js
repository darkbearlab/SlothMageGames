/* ===========================================================
   選對道具救法師 — Save the Mage
   廣告裡那種「選一個道具，選錯主角就當場去世」的關卡
   =========================================================== */
'use strict';

const SAVE = (() => {
  const SCENES = [
    {
      art: '🦥🔥', text: '法師的袍子著火了。', sub: '他本人還在睡，完全沒發現。',
      choices: [
        { icon: '🪣', label: '水桶', ok: true, res: '一桶水下去，火滅了。法師翻了個身，繼續睡。' },
        { icon: '🪵', label: '木柴', res: '你往火上加了木柴。現在是營火了。' },
        { icon: '🌬️', label: '風扇', res: '風助火勢。這是常識。' }
      ]
    },
    {
      art: '🦥🕳️', text: '法師掉進洞裡了。', sub: '洞很深，他睡得很沉。',
      choices: [
        { icon: '🪜', label: '梯子', ok: true, res: '你放了梯子下去。他睡著爬了上來——不要問怎麼做到的。' },
        { icon: '🪨', label: '石頭', res: '你往洞裡丟石頭。洞變淺了，但法師也變扁了。' },
        { icon: '💧', label: '水', res: '你灌水進去。他浮起來了，但現在是濕的法師。' }
      ]
    },
    {
      art: '🦥🦁', text: '一頭獅子在盯著法師看。', sub: '距離大約三公尺。',
      choices: [
        { icon: '🥩', label: '牛排', ok: true, res: '獅子選了牛排。任何生物都會選牛排。' },
        { icon: '🌶️', label: '辣椒', res: '獅子吃了辣椒，然後更生氣了。' },
        { icon: '📯', label: '喇叭', res: '你吹了喇叭。獅子醒得比法師還快。' }
      ]
    },
    {
      art: '🦥🌊', text: '海水正在漲。', sub: '法師睡在一塊快被淹沒的石頭上。',
      choices: [
        { icon: '🛟', label: '救生圈', ok: true, res: '救生圈套上去，法師漂走了。至少他還在睡。' },
        { icon: '🧂', label: '鹽', res: '你往海裡加鹽。海變更鹹了，僅此而已。' },
        { icon: '🥄', label: '湯匙', res: '你想用湯匙把海舀乾。三小時後你放棄了。' }
      ]
    },
    {
      art: '🦥❄️', text: '法師快被凍成冰塊了。', sub: '睫毛上已經結霜。',
      choices: [
        { icon: '🧣', label: '圍巾', ok: true, res: '你幫他圍上圍巾。他的鼾聲變得比較溫暖。' },
        { icon: '🍦', label: '冰淇淋', res: '你給了他冰淇淋。這是什麼邏輯。' },
        { icon: '💨', label: '冷氣', res: '你打開冷氣。法師現在是一件家具了。' }
      ]
    },
    {
      art: '🦥🐝', text: '一整群蜜蜂正朝法師飛過來。', sub: '他睡在蜂蜜罐旁邊。',
      choices: [
        { icon: '🍯', label: '把蜂蜜移開', ok: true, res: '你把蜂蜜搬走，蜜蜂就跟著走了。問題根本不是法師。' },
        { icon: '🧴', label: '噴髮膠', res: '蜜蜂現在髮型很挺，而且更生氣了。' },
        { icon: '🪅', label: '棍子', res: '你打了蜂窩。你知道這句成語是怎麼來的了。' }
      ]
    },
    {
      art: '🦥🗿', text: '一顆巨石正滾下山坡。', sub: '法師就睡在正下方。',
      choices: [
        { icon: '🪤', label: '在前面挖坑', ok: true, res: '巨石掉進坑裡卡住了。法師的睡姿沒有變過。' },
        { icon: '🛡️', label: '舉盾牌', res: '盾牌很勇敢。盾牌現在是一張紙。' },
        { icon: '🤲', label: '用手接', res: '你決定用手接一顆巨石。我們尊重你的勇氣。' }
      ]
    },
    {
      art: '🦥👻', text: '一隻幽靈飄進了房間。', sub: '它看起來想帶走什麼。',
      choices: [
        { icon: '🕯️', label: '點蠟燭', ok: true, res: '幽靈被燭光嚇跑了。順帶一提，法師還在睡。' },
        { icon: '📷', label: '拍照', res: '你拍了照片。現在幽靈想要肖像權。' },
        { icon: '🎺', label: '吹小號', res: '幽靈嚇一跳，法師還是沒醒。你成功嚇到了鬼。' }
      ]
    },
    {
      art: '🦥⏰', text: '鬧鐘響了。', sub: '這是整個遊戲裡最危險的一關。',
      choices: [
        { icon: '🔇', label: '按掉鬧鐘', ok: true, res: '你按掉了鬧鐘。法師的人生被拯救了。' },
        { icon: '☕', label: '端咖啡', res: '他醒了。他很不高興。他把你變成了一隻蝸牛。' },
        { icon: '📢', label: '再放一個鬧鐘', res: '你為什麼要這樣做。' }
      ]
    },
    {
      art: '🦥📱', text: '法師的手機跳出一則廣告。', sub: '「只有 1% 的人能通過這關！」',
      choices: [
        { icon: '❌', label: '關掉廣告', ok: true, res: '你關掉了廣告。這是本作唯一真正的勝利。' },
        { icon: '⬇️', label: '點下載', res: '下載了 480MB。打開之後是三消遊戲。廣告裡那關不存在。' },
        { icon: '💳', label: '課金', res: '你買了 6 顆寶石。廣告裡那關依然不存在。' }
      ]
    }
  ];

  let idx = 0, done = [], onEnd = null, wrongs = 0;
  const $ = id => document.getElementById(id);

  function load(i) {
    idx = i;
    wrongs = 0;
    render();
  }

  function render() {
    const sc = SCENES[idx];
    $('sceneArt').textContent = sc.art;
    $('sceneArt').classList.remove('shake');
    $('sceneText').textContent = sc.text;
    $('sceneSub').textContent = sc.sub;
    const box = $('choices');
    box.innerHTML = sc.choices.map((c, i) =>
      `<button class="choice" data-i="${i}"><span>${c.icon}</span><small>${c.label}</small></button>`).join('');
    box.querySelectorAll('.choice').forEach(b => b.onclick = () => choose(+b.dataset.i));
  }

  function choose(i) {
    const sc = SCENES[idx];
    const c = sc.choices[i];
    const btn = document.querySelector(`.choice[data-i="${i}"]`);
    if (!btn || btn.disabled) return;
    if (c.ok) {
      btn.classList.add('right');
      document.querySelectorAll('.choice').forEach(b => b.disabled = true);
      $('sceneSub').textContent = c.res;
      $('sceneArt').textContent = sc.art.replace('🦥', '😌');
      if (onEnd) setTimeout(() => onEnd('win', wrongs), 900);
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      wrongs++;
      $('sceneArt').classList.remove('shake');
      void $('sceneArt').offsetWidth;
      $('sceneArt').classList.add('shake');
      $('sceneSub').textContent = c.res;
    }
  }

  function init(endCb) { onEnd = endCb; }

  return {
    SCENES, init, load, choose,
    get index() { return idx; },
    get wrongs() { return wrongs; }
  };
})();
