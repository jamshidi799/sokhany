(function () {
  const DONE_ATTR = "data-mm-quote-done";

  // React controls the textbox's value via its own setter, so a plain
  // `el.value = x` gets silently overwritten. This forces it through
  // the native setter and fires an 'input' event so React notices.
  function setNativeValue(element, value) {
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    descriptor.set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function getSelectionTextForPost(postEl) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return "";
    const text = sel.toString();
    if (!text.trim()) return "";

    // Only use the selection if it actually overlaps this post's
    // content — otherwise a leftover selection from elsewhere on the
    // page (or another message) could get quoted by mistake.
    const withinPost = (node) => !!node && postEl.contains(node);
    if (!withinPost(sel.anchorNode) && !withinPost(sel.focusNode)) return "";

    return text;
  }

  function getPostPermalink(postEl) {
    // Mattermost renders a timestamp element per post that links to its
    // permalink, e.g. https://.../<team>/pl/<postId>. Clicking that link
    // (even from inside another message) makes Mattermost jump to and
    // highlight the original post — this is what gives us Telegram-like
    // "tap the quote to go to the original message" navigation.
    const link = postEl.querySelector('a[href*="/pl/"]');
    return link ? link.href : null;
  }

  function getPostText(postEl) {
    // Try selectors from most-specific to least-specific. Stop at the
    // first match — do NOT fall back to a broad container like
    // '.post-message', since that can also capture the username,
    // "update your status" reminder, and timestamp link.
    const candidates = [
      '[data-testid="postContent"] .post-message__text',
      ".post-message__text",
      '[data-testid="postContent"]',
    ];

    let textEl = null;
    for (const sel of candidates) {
      textEl = postEl.querySelector(sel);
      if (textEl) break;
    }
    if (!textEl) return "";

    // Soft safety net: only bail out if we can positively confirm the
    // text element belongs to a *different* post id than the one we
    // clicked on. If either side has no id (format differs from the
    // id="post_<id>" convention), skip this check rather than wrongly
    // discarding valid text.
    const clickedId = postEl.id;
    const textOwnerId = textEl.closest('[id^="post_"]')?.id;
    if (clickedId && textOwnerId && clickedId !== textOwnerId) {
      return "";
    }

    // Work on a clone so we don't touch the live DOM, and drop anything
    // that isn't part of the actual message content (edited tag,
    // reactions, embedded previews, header/username, timestamp link,
    // status reminder, our own quote button, etc.).
    const clone = textEl.cloneNode(true);
    clone
      .querySelectorAll(
        [
          ".post-edited__indicator",
          ".reaction",
          ".attachment",
          ".post-image__column",
          ".mm-quote-reply-btn",
          ".post__header",
          ".post__link",
          ".status-wrapper",
          "time",
          "a.post-header__link", // permalink/timestamp link
        ].join(", "),
      )
      .forEach((el) => el.remove());

    // Mattermost/CommonMark's "lazy continuation" rule merges a plain
    // line right after a quoted line into the SAME <blockquote>, even
    // without a leading '>'. So a <blockquote> can contain more than
    // just the originally-quoted text. Treat only its first paragraph
    // as the real quote and unwrap any later paragraphs back into the
    // normal flow, since those are almost always the person's own new
    // content that got visually absorbed by mistake.
    clone.querySelectorAll("blockquote").forEach((bq) => {
      const paragraphs = bq.querySelectorAll(":scope > p");
      if (paragraphs.length > 1) {
        paragraphs[0].remove();
        while (bq.firstChild) {
          bq.parentNode.insertBefore(bq.firstChild, bq);
        }
        bq.remove();
      } else {
        bq.remove();
      }
    });

    // Custom/standard emoji render as <img> tags. innerText can't read
    // image content, and some browsers leave behind an invisible
    // "object replacement" character in its place, which then shows up
    // as a broken-glyph box once quoted. Swap each emoji image for its
    // alt text (the ":shortcode:" or literal emoji character) instead.
    clone.querySelectorAll("img").forEach((img) => {
      const alt =
        img.getAttribute("alt") || img.getAttribute("aria-label") || "";
      img.replaceWith(document.createTextNode(alt));
    });

    return clone.innerText.trim();
  }

  function stripInvisibleChars(text) {
    // U+FFFC OBJECT REPLACEMENT CHARACTER and other stray control/format
    // characters can survive image removal in some browsers and render
    // as a broken-glyph box once quoted.
    return text.replace(/[\uFFFC\u200B-\u200F\uFEFF]/g, "");
  }

  function cleanLeadingArtifacts(text) {
    // Remove stray leftover markup (e.g. an empty "[]" left behind when
    // the timestamp/permalink link was stripped out) from the start of
    // the text.
    return text.replace(/^\s*\[\]\s*/, "").replace(/^\s*\n/, "");
  }

  function stripExistingQuoteLines(text) {
    // If the message being quoted already contains a quote block (e.g.
    // it was itself created with this same "quote reply" feature),
    // drop those lines and keep only the person's actual new content.
    const kept = text
      .split("\n")
      .filter((line) => !line.trim().startsWith(">"));
    return kept.join("\n").trim();
  }

  // Maximum number of characters to quote from a message. Longer
  // messages get cut off and marked with an ellipsis. Adjust to taste.
  const MAX_QUOTE_LENGTH = 100;

  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    // Cut at the last whitespace before the limit so we don't chop a
    // word in half; fall back to a hard cut if there's no whitespace.
    const slice = text.slice(0, maxLength);
    const lastSpace = slice.lastIndexOf(" ");
    const cut = lastSpace > maxLength * 0.5 ? slice.slice(0, lastSpace) : slice;
    return cut.trimEnd() + " …";
  }

  function buildQuote(text, permalink) {
    const cleaned = stripExistingQuoteLines(text);
    const source = cleanLeadingArtifacts(cleaned || text); // fall back if stripping left nothing
    const truncated = truncateText(source, MAX_QUOTE_LENGTH);

    const lines = truncated.split("\n");
    const quoted = lines
      .map((line) => {
        // Wrap each line's text in a markdown link to the original
        // message's permalink, so the quoted text itself is clickable
        // (Telegram-style jump to original), rather than adding a
        // separate "jump to message" line.
        const content = permalink ? `[${line}](${permalink})` : line;
        return `> ${content}`;
      })
      .join("\n");

    return `${quoted}\n\n`;
  }

  function findTextbox(postEl) {
    const inThread = postEl.closest("#rhsContainer, .sidebar-right__body");
    if (inThread) {
      return document.querySelector("#reply_textbox");
    }
    return document.querySelector("#post_textbox");
  }

  function waitFor(selector, timeout = 4000) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        reject(new Error("timeout waiting for " + selector));
      }, timeout);
    });
  }

  function insertQuote(postEl) {
    const selected = getSelectionTextForPost(postEl);
    const text = selected || getPostText(postEl);
    if (!text) return;
    const permalink = getPostPermalink(postEl);
    const quote = buildQuote(text, permalink);

    const alreadyInThread = postEl.closest(
      "#rhsContainer, .sidebar-right__body",
    );

    const doInsert = () => {
      const box = findTextbox(postEl);
      if (!box) return;
      const existing = box.value || "";
      box.focus();
      setNativeValue(box, existing ? existing + quote : quote);
      const end = box.value.length;
      box.setSelectionRange(end, end);
    };

    if (alreadyInThread) {
      doInsert();
      return;
    }

    // Not in the thread view yet: click Mattermost's own reply control
    // to open the thread, then wait for the RHS reply box to mount.
    const replyBtn = postEl.querySelector(
      '[aria-label="Reply"], .icon--reply, .CommentIcon',
    );
    if (replyBtn) {
      (replyBtn.closest("button, a") || replyBtn).click();
    }
    waitFor("#reply_textbox")
      .then(doInsert)
      .catch(() => {
        console.warn("[mm-quote-reply] could not find reply textbox");
      });
  }

  function createButton(postEl) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mm-quote-reply-btn";
    btn.title = "Quote reply";
    btn.setAttribute("aria-label", "Quote reply");
    btn.textContent = "❝";
    btn.addEventListener("mousedown", (e) => {
      // Prevent the default focus-shift behavior, which would otherwise
      // collapse any text the user has selected in the message before
      // our click handler gets a chance to read it.
      e.preventDefault();
    });
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      insertQuote(postEl);
    });
    return btn;
  }

  function injectButtons(root) {
    // Iterate on the generic .post class (reliable for showing the
    // button) — the id^="post_" check in getPostText below is used as
    // an extra safety net, not as the primary anchor.
    const posts = root.querySelectorAll(`div.post:not([${DONE_ATTR}])`);
    posts.forEach((postEl) => {
      // Adjust this selector if the hover-controls container has a
      // different class in your Mattermost version.
      const controls = postEl.querySelector(
        ".post-menu, .post__header .col__reply, .post-menu__content",
      );
      if (!controls) return; // not mounted yet, try again on next mutation
      postEl.setAttribute(DONE_ATTR, "1");
      controls.appendChild(createButton(postEl));
    });
  }

  injectButtons(document);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length) {
        injectButtons(document);
        break;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
