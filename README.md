# Mattermost Quote Reply

Adds a small ❝ button to each message in Mattermost. Clicking it opens the
thread (if not already open) and inserts a markdown blockquote of that
message into the reply textbox, e.g.:

```
> **Jane Doe** wrote:
> This is the original message

```

You can then type your reply below the quote and send as normal.

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