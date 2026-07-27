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
    },
    {
      art: '🦥🏃', text: '法師在跑步機上睡著了。', sub: '跑步機還開著，而且他正在往後滑。',
      choices: [
        { icon: '🔌', label: '拔插頭', ok: true, res: '跑步機停了。法師滑到底、撞上牆、繼續睡。' },
        { icon: '⏫', label: '調快速度', res: '你為什麼要這樣做。他現在在時速 18 公里的狀態下睡覺。' },
        { icon: '🥤', label: '遞運動飲料', res: '他沒有醒，但飲料被跑步機帶走了。' }
      ]
    },
    {
      art: '🦥🚂', text: '法師睡在鐵軌上。', sub: '遠方傳來汽笛聲。你有大約十秒。',
      choices: [
        { icon: '🚩', label: '揮紅旗攔車', ok: true, res: '火車停了。司機下來看了一眼，說「他睡得真好」，然後也不忍心叫醒他。' },
        { icon: '🧲', label: '用磁鐵吸火車', res: '你舉起一塊冰箱磁鐵面對一列 400 噸的火車。勇氣可嘉。' },
        { icon: '🎬', label: '拍成短影音', res: '影片很紅。留言區都在問法師後來怎麼了。你也想知道。' }
      ]
    },
    {
      art: '🦥🕊️', text: '一隻鴿子叼走了法師的法杖。', sub: '沒有法杖，他連睡覺都不專業了。',
      choices: [
        { icon: '🍞', label: '灑麵包屑', ok: true, res: '鴿子放下法杖去吃麵包。所有問題都可以用碳水化合物解決。' },
        { icon: '🏹', label: '射下來', res: '你射中了法杖。法杖斷了。鴿子飛走了。你什麼都沒得到。' },
        { icon: '📢', label: '大喊「還來」', res: '鴿子聽不懂中文。這是牠唯一的優點。' }
      ]
    },
    {
      art: '🦥🚪', text: '法師的鬍子卡在門縫裡。', sub: '他睡著時鬍子會自己亂跑，這是設定。',
      choices: [
        { icon: '🚪', label: '把門打開', ok: true, res: '門一開，鬍子就出來了。有時候問題真的就這麼簡單。' },
        { icon: '✂️', label: '剪掉鬍子', res: '法師的力量來自鬍子。現在他是一個普通的、在睡覺的中年人。' },
        { icon: '💪', label: '用力拉', res: '你把法師連人帶鬍子拉過門縫。他變成了一條法師。' }
      ]
    },
    {
      art: '🦥🌵', text: '法師在沙漠正中央睡著了。', sub: '四面八方看起來完全一樣。',
      choices: [
        { icon: '🧭', label: '指南針', ok: true, res: '你確認了方向，把他拖去綠洲。全程他沒有醒過。' },
        { icon: '🕶️', label: '太陽眼鏡', res: '他現在是一個戴著墨鏡在沙漠裡睡覺的人。有型，但還是會渴死。' },
        { icon: '🏖️', label: '沙灘椅', res: '你把場景升級成了度假。問題完全沒有解決，但氣氛好多了。' }
      ]
    },
    {
      art: '🦥🪨', text: '法師睡在懸崖邊緣。', sub: '他正在翻身。往外的那一邊。',
      choices: [
        { icon: '🧗', label: '用繩子綁住他', ok: true, res: '他翻下去了，然後被繩子拉住，在半空中繼續睡。' },
        { icon: '📸', label: '先拍張照', res: '照片構圖很好。你會用它當作追思會的遺照。' },
        { icon: '🎺', label: '吹喇叭叫醒他', res: '他嚇了一跳。往外那一邊。' }
      ]
    },
    {
      art: '🦥🛗', text: '電梯纜繩斷了。', sub: '法師在裡面。他按了「地下三樓」，現在要去地下三十樓。',
      choices: [
        { icon: '🪂', label: '從上面丟降落傘進去', ok: true, res: '降落傘在電梯裡打開了。物理上不合理，但他活下來了。' },
        { icon: '🛗', label: '狂按樓層鍵', res: '這是人類面對墜落電梯的本能。本能是錯的。' },
        { icon: '🙏', label: '祈禱', res: '你的神回覆了：「他自己按的。」' }
      ]
    },
    {
      art: '🦥☕', text: '有人在熟睡的法師頭上放了一杯咖啡。', sub: '很滿。而且是熱的。',
      choices: [
        { icon: '☕', label: '把咖啡拿走', ok: true, res: '你拿走了咖啡。你自己喝掉了。這是你應得的。' },
        { icon: '🍬', label: '加糖', res: '你把糖倒進去。杯子滿出來了。現在是甜的燙傷。' },
        { icon: '🥁', label: '打鼓', res: '你在一杯放在人頭上的熱咖啡旁邊打鼓。我們無法為你辯護。' }
      ]
    },
    {
      art: '🦥🌿', text: '法師被藤蔓整個纏住了。', sub: '藤蔓還在長。他還在睡。',
      choices: [
        { icon: '🐐', label: '放一隻山羊', ok: true, res: '山羊把藤蔓吃光了。牠也吃了法師的一隻襪子，但這是合理的代價。' },
        { icon: '🔥', label: '放火燒', res: '藤蔓燒掉了。法師也燒掉了。技術上你確實解開了藤蔓。' },
        { icon: '💧', label: '澆水', res: '你替敵人補充了水分。做得好。' }
      ]
    },
    {
      art: '🦥🎹', text: '一架鋼琴正從天上掉下來。', sub: '沒有人知道它為什麼在天上。',
      choices: [
        { icon: '🛒', label: '用推車把他推走', ok: true, res: '鋼琴砸在他原本的位置，發出一個很漂亮的和弦。他翻了個身。' },
        { icon: '☂️', label: '撐傘', res: '傘的設計目的是擋雨。這是一架鋼琴。' },
        { icon: '🎼', label: '看樂譜', res: '你在鋼琴落下的三秒內研究了譜。是升 F 小調。可惜。' }
      ]
    },
    {
      art: '🦥🦥', text: '法師的分身也睡著了。', sub: '兩個一起躺在正在漲潮的沙灘上。',
      choices: [
        { icon: '🚣', label: '划一艘船過去', ok: true, res: '你把兩個都撈上船。船很擠，但他們都不介意，因為都在睡。' },
        { icon: '🪞', label: '拿鏡子', res: '現在有四個。' },
        { icon: '➗', label: '除以二', res: '你把分身除以二。現在有半個法師和半個法師。情況沒有改善。' }
      ]
    },
    {
      art: '🦥🌊', text: '法師在夢遊，正走向瀑布。', sub: '他走得很慢，但方向非常堅定。',
      choices: [
        { icon: '🚧', label: '放路障', ok: true, res: '他撞上路障，轉了個彎，往回走了。夢遊的人不會質疑路障。' },
        { icon: '📣', label: '大聲叫醒他', res: '他醒了。他很不高興。你變成了一隻蝸牛（第二次）。' },
        { icon: '🏄', label: '給他衝浪板', res: '你為他的死亡加上了一項極限運動。' }
      ]
    },
    {
      art: '🦥🫠', text: '一隻史萊姆正在吃法師的鞋。', sub: '牠已經吃到腳踝了。',
      choices: [
        { icon: '🧂', label: '灑鹽', ok: true, res: '史萊姆縮成一顆小球滾走了。法師少了一隻鞋，但腳還在。' },
        { icon: '🍽️', label: '拿叉子', res: '你決定跟史萊姆一起吃。這不是它的本意，也不是我們的。' },
        { icon: '👟', label: '再買一雙鞋', res: '你買了新鞋。史萊姆吃完舊的，開始吃新的。你成了牠的供應商。' }
      ]
    },
    {
      art: '🦥🛋️', text: '法師在你家沙發上睡了三個月。', sub: '他沒有要走的意思。你也不好意思說。',
      choices: [
        { icon: '🧾', label: '把房租單放他手上', ok: true, res: '他閉著眼睛簽了名，還加了小費。原來只是沒有人提。' },
        { icon: '☕', label: '每天煮咖啡給他', res: '第 91 天。他問可不可以換拿鐵。' },
        { icon: '🚪', label: '直接趕出去', res: '他睡著被拖出門，睡著在門口，睡著被鄰居收留。你只是把問題外包了。' },
        { icon: '🔥', label: '燒掉沙發', res: '沙發沒了。他改睡地板，而且說地板比較好。' }
      ]
    },
    {
      art: '🦥☄️', text: '一顆隕石正朝這裡飛來。', sub: '天文台說還有四十秒。他們也睡了一下才發現。',
      choices: [
        { icon: '🕳️', label: '往下挖', ok: true, res: '你挖了一個洞把他推下去。隕石在頭頂爆炸。他睡得比剛才更沉。' },
        { icon: '🧤', label: '戴手套接住', res: '手套是防燙的，不是防隕石的。這是一個常見的誤會。' },
        { icon: '📄', label: '買保險', res: '四十秒內你簽完了所有文件。理賠條款排除天災。' }
      ]
    },
    {
      art: '🦥⚡', text: '法師像鳥一樣睡在高壓電線上。', sub: '不要問他怎麼上去的。',
      choices: [
        { icon: '🐦', label: '在旁邊放一隻鳥', ok: true, res: '鳥停在他旁邊。法師在夢裡確認了「這裡可以睡」，繼續睡。他一路都沒有觸地，所以沒事。' },
        { icon: '🪜', label: '架梯子把他接下來', res: '梯子接地了。法師接梯子。電流找到了它一直在找的那條路。' },
        { icon: '💧', label: '灑水降溫', res: '你用水連接了高壓電和一個睡著的人。這是本作最短的一關。' }
      ]
    },
    {
      art: '🦥🛸', text: '一道光把法師吸上了太空船。', sub: '他在光束裡緩緩上升，姿勢完全沒變。',
      choices: [
        { icon: '⚓', label: '用鉤爪把他勾回來', ok: true, res: '你把他勾了回來。外星人試了三次，最後放棄，飛走了。' },
        { icon: '👽', label: '跟外星人打招呼', res: '他們很有禮貌地揮手，然後繼續把他吸上去。' },
        { icon: '📱', label: '錄影上傳', res: '影片被判定為造假。法師被判定為不存在。' }
      ]
    },
    {
      art: '🦥⏰', text: '法師終於醒了。', sub: '這是他八年來第一次睜開眼睛。全世界都在等你的決定。',
      choices: [
        { icon: '🛏️', label: '請他繼續睡', ok: true, res: '他說了聲「也是」，然後躺回去。世界恢復和平。這才是正確答案。' },
        { icon: '🎉', label: '開派對慶祝', res: '他被吵到。他把派對變成了一場雨。' },
        { icon: '📋', label: '給他待辦清單', res: '他看了一眼清單，然後看了一眼你，然後把你變成清單。' },
        { icon: '📷', label: '拍下這歷史一刻', res: '閃光燈。他閉上眼睛。再也沒有睜開過。你毀掉了唯一的機會。' }
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
