const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/**
 * macOS: Apple Silicon refuses to launch unsigned arm64 code ("app is damaged").
 * Without a Developer ID certificate, an ad-hoc signature is enough to run
 * (users still confirm once via right-click → Open because it isn't notarized).
 */
function adHocSignMac(context) {
    const appName = `${context.packager.appInfo.productFilename}.app`;
    const appPath = path.join(context.appOutDir, appName);
    console.log(`  • ad-hoc signing ${appPath}`);
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
    execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' });
}

/**
 * electron-builder afterPack hook for Linux.
 * 
 * Problem: Chromium's sandbox checks run before any JS executes, so
 * app.commandLine.appendSwitch('no-sandbox') is too late.
 * 
 * Solution: Rename the real binary and create a shell wrapper that
 * passes --no-sandbox to it. This is the same pattern VS Code uses.
 */
exports.default = async function afterPack(context) {
    if (context.electronPlatformName === 'darwin') return adHocSignMac(context);
    if (context.electronPlatformName !== 'linux') return;

    const appOutDir = context.appOutDir;
    const execName = context.packager.executableName; // "at-music-pro"

    const realBinary = path.join(appOutDir, execName);
    const renamedBinary = path.join(appOutDir, `${execName}.bin`);

    // 1. Remove chrome-sandbox (avoids SUID permission errors)
    const sandboxPath = path.join(appOutDir, 'chrome-sandbox');
    if (fs.existsSync(sandboxPath)) {
        console.log('  • removing chrome-sandbox');
        fs.unlinkSync(sandboxPath);
    }

    // 2. Rename the real Electron binary
    if (fs.existsSync(realBinary)) {
        console.log(`  • renaming ${execName} → ${execName}.bin`);
        fs.renameSync(realBinary, renamedBinary);
    }

    // 3. Create a wrapper shell script in its place
    const wrapperScript = `#!/bin/bash
# Wrapper to launch Electron without the SUID sandbox on Linux
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/${execName}.bin" --no-sandbox "$@"
`;

    console.log(`  • creating wrapper script → ${execName}`);
    fs.writeFileSync(realBinary, wrapperScript, { mode: 0o755 });
};
