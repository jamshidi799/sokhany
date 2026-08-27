# Mattermost Quote Reply

Adds a small ❝ **Quote reply** button to each message’s hover menu in
Mattermost (second from the right, next to the usual emoji / reply / **…**
controls). Clicking it inserts a markdown blockquote of that message into
the composer, with the quoted text linked to the original post so others
can jump to it.

Example of what gets inserted:

```
> [This is the original message](https://chat.example.com/team/pl/abc123)

```

Type your reply below the quote and send as usual.

## How to use

1. Hover a message. The ❝ button appears in the post’s action bar.
2. Click ❝.
   - If you had **no text selected**, the whole message is quoted (up to
     100 characters; longer text is cut at a word boundary and ends with
     `…`).
   - If you **selected text inside that message** first, only the
     selection is quoted. A leftover selection in another message is
     ignored.
3. The quote is written into the relevant composer and the cursor is
   placed after it so you can type immediately.
4. Send the post like any other Mattermost message.

Clicking a quoted line in the resulting post follows the permalink and
Mattermost highlights the original message.

## Where it works

| You are in | Quote goes into |
| --- | --- |
| A channel (center pane) | The channel composer (`Write to …`) |
| A thread in the right-hand sidebar | That thread’s reply box |
| **Threads** (`/threads`) with a thread selected | That thread’s reply box |

You can quote from the root post or from any reply in the thread.

## Other cases

- **Composer already has text.** The new quote is appended after whatever
  is already in the box, so you can stack several quotes or keep a draft.
- **Message that is itself a quote-reply.** Nested `>` quote lines are
  stripped; only the author’s new text is quoted.
- **Emoji.** Custom and standard emoji are quoted as their alt text
  (`:shortcode:` or the emoji character), not as broken image placeholders.
- **Attachments / images / reactions.** Those are left out of the quote;
  only the message text is used.
- **Empty or unreadable posts.** If there is no quotable text, nothing is
  inserted.
- **Cross-thread or cross-team reply.** Because each quoted line is a
  permalink to the original post, you can quote a message, copy the
  generated text from the composer, and paste it in another thread,
  channel, or team. Recipients can click the quote and jump to the
  source.

After installing, reload Mattermost (or the extension) once so the button
shows up on messages that were already on screen.

## Install (unpacked, for your own use)

1. Open `manifest.json` and replace
   `https://your-mattermost-domain.example.com/*` with your actual
   Mattermost URL (e.g. `https://chat.mycompany.com/*`). You can list
   multiple entries in the `matches` array if you use more than one
   instance.

   The default value is: `https://chat.platform.sotoon.ir/*`

### Chrome / Edge / Brave / other Chromium browsers

2. Go to `chrome://extensions` (or `edge://extensions`, etc.).
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `mattermost-quote-reply` folder.
5. Open Mattermost and hover over a message — you should see the ❝ button
   next to the existing reply/emoji/... controls.

### Firefox

2. Go to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select `manifest.json` inside the
   `mattermost-quote-reply` folder.
   - This load lasts until you close Firefox. For a permanent install
     you'd need to sign the extension via Mozilla's add-on tooling, or
     set `xpinstall.signatures.required` to `false` in a Developer
     Edition / Nightly build.
   - The manifest already includes a `browser_specific_settings.gecko.id`
     — feel free to change `mattermost-quote-reply@example.com` to
     something unique to you, but it's not required for local testing.
4. Open Mattermost and test the same way as above.

## Notes

- This only works on pages matching the `matches` pattern in
  `manifest.json` — update it to your domain before loading.
- The extension only touches the DOM in the tab; it doesn't talk to the
  Mattermost API or send any data anywhere.