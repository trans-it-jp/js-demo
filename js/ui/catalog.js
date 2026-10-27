/*!
 * js-demo / ui — catalog.js
 * トップページの目録を、想定学年か分野でまとめ直し、前提概念で絞り込む。
 *
 * 作りの前提:
 *   HTML には題材のカードが**ふつうの一覧として**書いてある。
 *   JavaScript が動かないときは、その一覧がそのまま読める（見出しも絞り込みも付かない）。
 *   まとめ直すときもカードそのものは作り直さず、置き場所を move するだけ。
 *
 *   想定学年は card の data-stage（小学校 primary / 中学校 lower /
 *   高校 upper / 大学・社会人 adult）で持つ。見出しの文言は i18n から引く。
 *   分野はカードに書いてある文字をそのまま見出しに使う。題材ごとに違う言葉を
 *   使うので、辞書に写すと二重管理になるため。
 *
 *   前提概念は card の data-concepts（統制語彙の ID を空白で区切る）で持つ。
 *   概念は**絞り込み**として使い、見出しで群を作らない。公開3題では重なる概念が
 *   1 つだけで、群にすると 1 件きりの群が並ぶため（planning/LEARNING-DESIGN.md 9章）。
 *
 *   選んだ概念は URL に残す（?concept=coord）。URL は誰でも書き換えられるので、
 *   カードに実際にある概念だけを受け取り、知らない値は捨てる。
 *
 * select と conceptsIn は DOM に触らない純粋な関数なので、Node からも検証できる。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  /* 想定学年の並び順。若い順に出す。 */
  var STAGE_ORDER = ["primary", "lower", "upper", "adult"];

  /* 絞り込みを URL へ載せるときの名前。 */
  var PARAM = "concept";

  function t(key, vars) {
    return (JsDemo.I18n && JsDemo.I18n.t) ? JsDemo.I18n.t(key, vars) : key;
  }

  /**
   * 選ばれた概念を前提にするものだけ残す。
   * @param {Array} items  { concepts: string[] } を持つ並び
   * @param {string} concept  空（または null）なら全部返す
   */
  function select(items, concept) {
    if (!concept) { return items.slice(); }
    return items.filter(function (item) {
      return (item.concepts || []).indexOf(concept) >= 0;
    });
  }

  /**
   * 並びに出てくる概念を、出現順に重複なく集める。
   * 絞り込みの選択肢と、URL から受け取ってよい値の一覧を兼ねる。
   */
  function conceptsIn(items) {
    var seen = {};
    var out = [];
    items.forEach(function (item) {
      (item.concepts || []).forEach(function (id) {
        if (seen[id]) { return; }
        seen[id] = true;
        out.push(id);
      });
    });
    return out;
  }

  function fieldOf(card) {
    /* カードの「分野」の値。dt と dd が交互に並ぶので、dt の次を読む。 */
    var terms = card.querySelectorAll(".demo-card__meta dt");
    for (var i = 0; i < terms.length; i += 1) {
      if (terms[i].dataset.key === "field") {
        var dd = terms[i].nextElementSibling;
        return dd ? dd.textContent.trim() : "";
      }
    }
    return "";
  }

  function conceptsOf(card) {
    var raw = (card.dataset.concepts || "").trim();
    return raw ? raw.split(/\s+/) : [];
  }

  /** URL から絞り込みを読む。一覧に無い値は捨てる。 */
  function conceptFromUrl(search, allowed) {
    var text = String(search || "");
    if (text.charAt(0) === "?") { text = text.slice(1); }
    var value = "";
    text.split("&").forEach(function (pair) {
      var index = pair.indexOf("=");
      if (index < 0) { return; }
      try {
        if (decodeURIComponent(pair.slice(0, index)) !== PARAM) { return; }
        value = decodeURIComponent(pair.slice(index + 1).replace(/\+/g, " "));
      } catch (error) { /* 壊れた encoding は捨てる */ }
    });
    return allowed.indexOf(value) >= 0 ? value : "";
  }

  function create(options) {
    var host = document.getElementById(options.list);
    var controls = document.getElementById(options.controls);
    if (!host || !controls) { return null; }

    var filterHost = options.filter ? document.getElementById(options.filter) : null;
    var status = options.status ? document.getElementById(options.status) : null;

    /* 最初の並びを覚えておく。まとめ直しはここから作り直す。 */
    var items = Array.prototype.slice
      .call(host.querySelectorAll(".demo-card"))
      .map(function (card) {
        return {
          card: card,
          stage: card.dataset.stage || "adult",
          field: fieldOf(card),
          concepts: conceptsOf(card)
        };
      });
    var original = host.cloneNode(false);
    var available = conceptsIn(items);

    var mode = options.initial || "stage";
    var concept = filterHost
      ? conceptFromUrl(global.location && global.location.search, available)
      : "";

    function groupsFor(shown) {
      var keys = [];
      var buckets = {};
      shown.forEach(function (item) {
        var key = mode === "stage" ? item.stage : item.field;
        if (!buckets[key]) { buckets[key] = []; keys.push(key); }
        buckets[key].push(item);
      });

      if (mode === "stage") {
        keys.sort(function (a, b) {
          return STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b);
        });
      }
      return keys.map(function (key) {
        return {
          key: key,
          label: mode === "stage" ? t("catalog.stage." + key) : key,
          items: buckets[key]
        };
      });
    }

    function pressed(host2, attribute, value) {
      Array.prototype.forEach.call(
        host2.querySelectorAll("button[" + attribute + "]"),
        function (button) {
          var own = button.getAttribute(attribute);
          button.setAttribute("aria-pressed", String(own === value));
        }
      );
    }

    /** いまの URL を書き換える。履歴は増やさない。 */
    function syncUrl() {
      if (!global.history || !global.history.replaceState) { return; }
      var url = global.location.pathname +
        (concept ? "?" + PARAM + "=" + encodeURIComponent(concept) : "") +
        global.location.hash;
      global.history.replaceState(null, "", url);
    }

    function render() {
      var shown = select(items, concept);
      var parent = host.parentNode;
      var holder = document.createDocumentFragment();

      groupsFor(shown).forEach(function (group) {
        var section = document.createElement("section");
        section.className = "catalog-group";

        var heading = document.createElement("h3");
        heading.className = "catalog-group__title";
        heading.textContent = group.label;
        section.appendChild(heading);

        var list = original.cloneNode(false);
        list.removeAttribute("id");
        group.items.forEach(function (item) { list.appendChild(item.card); });
        section.appendChild(list);
        holder.appendChild(section);
      });

      /* 前のまとめを片付けてから入れ替える。カードは使い回す。 */
      var previous = parent.querySelectorAll(".catalog-group");
      Array.prototype.forEach.call(previous, function (node) {
        node.parentNode.removeChild(node);
      });
      host.textContent = "";
      host.hidden = true;
      parent.insertBefore(holder, host.nextSibling);

      pressed(controls, "data-mode", mode);
      if (filterHost) { pressed(filterHost, "data-concept", concept); }
      if (status) {
        status.textContent = concept
          ? t("catalog.filtered", {
              premise: t("catalog.premise." + concept),
              count: shown.length
            })
          : t("catalog.showingAll", { count: shown.length });
      }
    }

    function buildFilter() {
      if (!filterHost || available.length === 0) { return; }

      /* 「すべて」を先に置く。選択を外す口を常に見せておく。 */
      [""].concat(available).forEach(function (id) {
        var button = document.createElement("button");
        button.type = "button";
        button.setAttribute("data-concept", id);
        button.textContent = id ? t("catalog.concept." + id) : t("catalog.all");
        if (id) {
          /* 短い名札だけでは何の前提か分からないので、文は title で補う。 */
          button.title = t("catalog.premise." + id);
        }
        button.addEventListener("click", function () {
          concept = (concept === id) ? "" : id;
          syncUrl();
          render();
        });
        filterHost.insertBefore(button, status || null);
      });
      filterHost.hidden = false;
    }

    Array.prototype.forEach.call(
      controls.querySelectorAll("button[data-mode]"),
      function (button) {
        button.addEventListener("click", function () {
          mode = button.dataset.mode;
          render();
        });
      }
    );

    controls.hidden = false;
    buildFilter();
    /* 知らない値が URL に残っていると、表示と URL が食い違ったまま共有される。
       param が付いていたときだけ、受け取った値で書き直しておく。 */
    if (global.location && global.location.search) { syncUrl(); }
    render();

    return {
      show: function (next) { mode = next; render(); },
      filter: function (next) {
        concept = available.indexOf(next) >= 0 ? next : "";
        syncUrl();
        render();
      }
    };
  }

  JsDemo.Catalog = {
    create: create,
    select: select,
    conceptsIn: conceptsIn
  };
})(typeof window !== "undefined" ? window : globalThis);
