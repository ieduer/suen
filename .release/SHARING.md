# Sharing release source

The previous build copied fonts to sharing/ but omitted the source page in colleague sharing/index.html, leaving the public root 404. The guarded build now copies that exact tracked page into the explicit output. The existing font hash anchors the former deployment; the source page hash is d1ba6739ac36dd6abc68ac0d6c61c16a332563c2c16eeb77cd34e4f36c8f0f00. No other product output or source changes.
