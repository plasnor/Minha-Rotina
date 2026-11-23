
/* Minha Rotina - Recompensas */
(() => {
  const KEY = "minhaRotinaRecompensasV1";
  const initial = {
    xp: 0,
    coins: 0,
    ledger: {},
    achievements: [],
    rewards: [
      { id: "r1", name: "1 hora extra de videogame", cost: 100 },
      { id: "r2", name: "Noite especial de filme", cost: 150 }
    ],
    redemptions: []
  };

  let data;
  try {
    data = JSON.parse(localStorage.getItem(KEY));
  } catch {}
  data = { ...initial, ...(data || {}) };
  data.ledger ||= {};
  data.achievements ||= [];
  data.rewards ||= [];
  data.redemptions ||= [];

  const saveRewards = () =>
    localStorage.setItem(KEY, JSON.stringify(data));

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    }[c]));

  const level = () =>
    Math.floor(Math.sqrt(Math.max(0, data.xp) / 100)) + 1;

  const baseXP = {
    study: 40, college: 35, train: 35,
    food: 25, diet: 25, work: 20,
    hair: 20, personal: 20, other: 20
  };

  const achievements = [
    ["first", "Primeiro passo", 1],
    ["ten", "Em movimento", 10],
    ["fifty", "Constância", 50]
  ];

  function updateAchievements() {
    const total = Object.values(data.ledger)
      .filter(item => item.active).length;

    achievements.forEach(([id, name, target]) => {
      if (total >= target && !data.achievements.includes(id))
        data.achievements.push(id);
    });

    if (data.xp >= 1000 &&
        !data.achievements.includes("thousand"))
      data.achievements.push("thousand");
  }

  function credit(kind, id, day, completed, category, priority = 2) {
    const key = `${kind}:${id}:${day}`;
    const previous = data.ledger[key];

    if (completed && !previous?.active) {
      const xp = previous?.xp ||
        Math.max(10, (baseXP[category] || 20) +
          (Number(priority) - 2) * 10);
      const coins = previous?.coins || Math.floor(xp / 2);

      data.ledger[key] = { active: true, xp, coins };
      data.xp += xp;
      data.coins += coins;
    } else if (!completed && previous?.active) {
      previous.active = false;
      data.xp = Math.max(0, data.xp - previous.xp);
      data.coins -= previous.coins;
    }

    updateAchievements();
    saveRewards();
  }

  const originalToggle = toggle;
  toggle = function(id, day) {
    const item = state.events.find(x => x.id == id);
    const before = item?.completed?.includes(day) || false;
    originalToggle(id, day);
    const after = item?.completed?.includes(day) || false;

    if (item && before !== after)
      credit("agenda", id, day, after, item.cat, item.priority);
  };

  const originalRoutineToggle = toggleRoutine;
  toggleRoutine = function(id) {
    const item = routineState.items.find(x => x.id == id);
    const day = today();
    const before = item?.done?.includes(day) || false;
    originalRoutineToggle(id);
    const after = item?.done?.includes(day) || false;

    if (item && before !== after)
      credit("rotina", id, day, after, item.cat);
  };

  function renderRewards() {
    const current = level();
    const start = 100 * (current - 1) ** 2;
    const next = 100 * current ** 2;
    const progress = Math.min(100,
      100 * (data.xp - start) / (next - start));

    document.getElementById("view").innerHTML = `
      <section class="routine-directory-header">
        <div class="eyebrow">SUA EVOLUÇÃO</div>
        <h2>Recompensas<span>.</span></h2>
        <p>Transforme esforço em conquistas.</p>
      </section>

      <section class="reward-profile">
        <div class="reward-top">
          <div>
            <small>SEU NÍVEL</small>
            <div class="reward-level">${current}</div>
          </div>
          <div class="reward-coins">
            🪙 ${data.coins}
            <small>moedas</small>
          </div>
        </div>
        <div class="reward-meter">
          <div style="width:${progress}%"></div>
        </div>
        <small>${data.xp} XP acumulados</small>
      </section>

      <div class="reward-tabs">
        <button onclick="rewardsTab('shop')">Loja</button>
        <button onclick="rewardsTab('badges')">Conquistas</button>
        <button onclick="rewardsTab('history')">Histórico</button>
      </div>
      <div id="reward-panel"></div>
    `;

    rewardsTab("shop");
  }

  window.rewardsTab = function(tab) {
    const panel = document.getElementById("reward-panel");
    if (!panel) return;

    if (tab === "badges") {
      panel.innerHTML = "<h2>Conquistas</h2>" +
        [...achievements, ["thousand", "Mil de XP", 0]]
          .map(([id, name]) => `
            <div class="reward-row">
              <span>${data.achievements.includes(id) ? "🏆" : "🔒"}</span>
              <strong>${name}</strong>
            </div>
          `).join("");
      return;
    }

    if (tab === "history") {
      panel.innerHTML = "<h2>Resgates</h2>" +
        (data.redemptions.slice().reverse().map(r => `
          <div class="reward-row">
            <div>
              <strong>${escapeHTML(r.name)}</strong>
              <small>${new Date(r.at).toLocaleString("pt-BR")}</small>
            </div>
            <span>-${r.cost} 🪙</span>
          </div>
        `).join("") || "<p>Nenhum resgate ainda.</p>");
      return;
    }

    panel.innerHTML = `
      <div class="routine-detail-section">
        <h3>Loja de recompensas</h3>
        <button onclick="addReward()">＋ Criar prêmio</button>
      </div>
      ${data.rewards.map(r => `
        <div class="reward-row">
          <span>🎁</span>
          <div>
            <strong>${escapeHTML(r.name)}</strong>
            <small>${r.cost} moedas</small>
          </div>
          <button class="btn"
            ${data.coins < r.cost ? "disabled" : ""}
            onclick="redeemReward('${r.id}')">
            Resgatar
          </button>
          <button class="iconbtn"
            onclick="deleteReward('${r.id}')">×</button>
        </div>
      `).join("")}
    `;
  };

  window.addReward = function() {
    const name = prompt("Nome da recompensa:");
    if (!name?.trim()) return;

    const cost = Number(prompt("Custo em moedas:", "100"));
    if (!Number.isSafeInteger(cost) || cost < 1)
      return alert("Informe um custo válido.");

    data.rewards.push({
      id: "r" + Date.now(),
      name: name.trim().slice(0, 80),
      cost
    });
    saveRewards();
    rewardsTab("shop");
  };

  window.deleteReward = function(id) {
    if (!confirm("Excluir esta recompensa?")) return;
    data.rewards = data.rewards.filter(r => r.id !== id);
    saveRewards();
    rewardsTab("shop");
  };

  window.redeemReward = function(id) {
    const reward = data.rewards.find(r => r.id === id);
    if (!reward || data.coins < reward.cost) return;

    if (!confirm(`Resgatar ${reward.name}?`)) return;

    data.coins -= reward.cost;
    data.redemptions.push({
      name: reward.name,
      cost: reward.cost,
      at: new Date().toISOString()
    });

    saveRewards();
    renderRewards();
    alert("Recompensa resgatada!");
  };

  const originalShow = show;
  show = function(p) {
    if (p !== "rewards") return originalShow(p);

    page = p;
    nav();
    document.getElementById("title").textContent = "Recompensas";
    document.getElementById("subtitle").textContent = "Sua evolução";
    renderRewards();
  };

  const originalMore = openMore;
  openMore = function() {
    originalMore();
    document.querySelector(".more-list")?.insertAdjacentHTML(
      "afterbegin",
      `<button class="more-entry"
        onclick="closeModal();show('rewards')">
        <span>🏆</span>
        <strong>Recompensas</strong>
        <em>›</em>
      </button>`
    );
  };

  const originalBackup = backup;
  backup = function() {
    const obj = {
      ...state,
      routines: routineState,
      rewards: data
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)],
      { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "minha-rotina-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const originalRestore = restore;
  restore = async function(input) {
    try {
      const obj = JSON.parse(await input.files[0].text());
      if (!Array.isArray(obj.events)) throw Error();

      if (!confirm("Restaurar este backup?")) return;

      state = obj;
      save();

      if (obj.routines?.items) {
        routineState = obj.routines;
        saveRoutines();
      }

      if (obj.rewards) {
        data = obj.rewards;
        saveRewards();
      }

      render();
    } catch {
      alert("Backup inválido.");
    }
  };

  const css = document.createElement("style");
  css.textContent = `
    .reward-profile {
      padding:24px;
      background:linear-gradient(130deg,#30191b,#111);
      border:1px solid #333;
      border-radius:16px;
      margin:20px 0;
    }
    .reward-top {
      display:flex;
      justify-content:space-between;
      align-items:center;
    }
    .reward-level {
      font-size:58px;
      font-weight:800;
    }
    .reward-coins {
      font-size:23px;
      font-weight:800;
      text-align:right;
    }
    .reward-coins small {
      display:block;
      color:#aaa;
      font-size:12px;
    }
    .reward-meter {
      height:7px;
      background:#333;
      border-radius:20px;
      overflow:hidden;
      margin:20px 0 10px;
    }
    .reward-meter div {
      height:100%;
      background:#ef4444;
    }
    .reward-tabs {
      display:flex;
      gap:8px;
      overflow:auto;
      margin:25px 0;
    }
    .reward-tabs button {
      background:#202020;
      border:1px solid #333;
      border-radius:30px;
      padding:11px 16px;
      color:white;
    }
    .reward-row {
      display:flex;
      align-items:center;
      gap:12px;
      padding:18px 0;
      border-bottom:1px solid #292929;
    }
    .reward-row div {
      flex:1;
      min-width:0;
    }
    .reward-row strong {
      font-size:14px;
    }
    .reward-row small {
      display:block;
      color:#999;
      margin-top:5px;
    }
    .reward-row .btn {
      padding:9px 12px;
    }
    .reward-row .btn:disabled {
      opacity:.4;
    }
  `;
  document.head.appendChild(css);
  saveRewards();
})();
