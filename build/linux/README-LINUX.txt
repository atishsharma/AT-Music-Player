AT Music Pro — portable Linux build (.tar.gz)

Start the app
  Run ./at-music-pro from this folder (in a terminal, or right-click → Run as a Program).
  Do not start at-music-pro.bin directly: it needs the flags the at-music-pro launcher adds,
  and will crash on start (sandbox error) without them.

Add it to your app menu
  Run ./install.sh once. It adds a menu entry with the app icon and an `at-music-pro`
  command. Keep this folder where it is afterwards; ./install.sh --uninstall removes it again.

Video mode needs ffmpeg from your distribution (e.g. sudo apt install ffmpeg).
