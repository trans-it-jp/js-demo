/*!
 * js-demo / ui — catalog.js
 * トップページの目録を、想定学年か分野でまとめ直す。
 *
 * 作りの前提:
 *   HTML には題材のカードが**ふつうの一覧として**書いてある。
 *   JavaScript が動かないときは、その一覧がそのまま読める（見出しが付かないだけ）。
 *   まとめ直すときもカードそのものは作り直さず、置き場所を move するだけ。
 *
 *   想定学年は card の data-stage（小学校 primary / 中学校 lower /
 *   高校 upper / 大学・社会人 adult）で持つ。見出しの文言は i18n から引く。
 *   分野はカードに書いてある文字をそのまま見出しに使う。題材ごとに違う言葉を
 *   使うので、辞書に写すと二重管理になるため。
 */
(function (global) {
  "use strict";

  var JsDemo = global.JsDemo || (global.JsDemo = {});

  /* 想定学年の並び順。若い順に出す。 */
  var STAGE_ORDER = ["primary", "lower", "upper", "adult"];

  function t(key) {
    return (JsDemo.I18n && JsDemo.I18n.t) ? JsDemo.I18n.t(key) : key;
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

  function create(options) {
    var host = document.getElementById(options.list);
    var controls = document.getElementById(options.controls);
    if (!host || !controls) { return null; }

    /* 最初の並びを覚えておく。まとめ直しはここから作り直す。 */
    var cards = Array.prototype.slice.call(host.querySelectorAll(".demo-card"));
    var original = host.cloneNode(false);

    function groupsFor(mode) {
      var keys = [];
      var buckets = {};
      cards.forEach(function (card) {
        var key = mode === "stage"
          ? (card.dataset.stage || "adult")
          : fieldOf(card);
        if (!buckets[key]) { buckets[key] = []; keys.push(key); }
        buckets[key].push(card);
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
          cards: buckets[key]
        };
      });
    }

    function show(mode) {
      var parent = host.parentNode;
      var holder = document.createDocumentFragment();

      groupsFor(mode).forEach(function (group) {
        var section = document.createElement("section");
        section.className = "catalog-group";

        var heading = document.createElement("h3");
        heading.className = "catalog-group__title";
        heading.textContent = group.label;
        section.appendChild(heading);

        var list = original.cloneNode(false);
        list.removeAttribute("id");
        group.cards.forEach(function (card) { list.appendChild(card); });
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

      Array.prototype.forEach.call(
        controls.querySelectorAll("button[data-mode]"),
        function (button) {
          button.setAttribute("aria-pressed",
                              String(button.dataset.mode === mode));
        }
      );
    }

    Array.prototype.forEach.call(
      controls.querySelectorAll("button[data-mode]"),
      function (button) {
        button.addEventListener("click", function () {
          show(button.dataset.mode);
        });
      }
    );

    controls.hidden = false;
    show(options.initial || "stage");
    return { show: show };
  }

  JsDemo.Catalog = { create: create };
})(window);
