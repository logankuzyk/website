/**
 * Standalone decode check for the built Docker image — run by the `media` CI job:
 *
 *   docker run --rm -v "$PWD/scripts/verify-image-decode.mjs:/verify.mjs" \
 *     --entrypoint node <image> /verify.mjs
 *
 * Exits non-zero if the image's `sharp` can't decode 10-bit AVIF or HEVC HEIC — i.e. it
 * isn't linked to the system libvips (see Dockerfile). Self-contained on purpose: the
 * runner image has no repo source, only `node_modules`.
 */
import { createRequire } from 'node:module'

const require = createRequire('/app/')
const sharp = require('sharp')

// Same tiny fixtures as src/utilities/imageDecodeProbe.ts (kept in sync by hand).
const FIXTURES = {
  'AVIF (10-bit)':
    'AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAABGgAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAeAAAAFoAAAAQcGl4aQAAAAADCgoKAAAADGF2MUOBAEwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAABIm1kYXQSAAoGGBm72WJCMo0CEZACSSSRQLRe9LvtV0XMXT7PDIQCt4wLc0vUI4crRna6SLQhQkj5exLMa3KBlFMKDuWvEkkoNZRoI1hsaU+6XMSVCPAm9/ue8NMg+K+SZBdZRDEUgEfTAVxGbKrazqKzDBqhQ3OAMbfhMLDxYIATKNsFdpHyje3IWTfX9YqF3sYc7sECa5dLGLsldHrYeHP3N1KLAY3MvYP7fHLkAzzLWeyA2YPNxax4EooYyOlm0RZOGBALr+hzAIv/axLiZm6brltgqs7jSSqI82FC2YsKoxvlvYNf3fM8sEnfhnd8aHV/vPRywdPhgbRaHSHoqo85gLIyfu4Cq7Boz/cN0c0225vQpRcpQ9d7JVnxsvQ=',
  HEIC: 'AAAAHGZ0eXBoZWljAAAAAG1pZjFoZWljbWlhZgAAAb5tZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAANGlsb2MAAAAAREAAAgABAAAAAAHiAAEAAAAAAAAAFAACAAAAAAH2AAEAAAAAAAAAuAAAADhpaW5mAAAAAAACAAAAFWluZmUCAAAAAAEAAGh2YzEAAAAAFWluZmUCAAABAAIAAEV4aWYAAAAA/WlwcnAAAADdaXBjbwAAAHZodmNDAQNwAAAAAAAAAAAAHvAA/P34+AAADwMgAAEAGEABDAH//wNwAAADAJAAAAMAAAMAHroCQCEAAQAqQgEBA3AAAAMAkAAAAwAAAwAeoCCBBZbq5Ka5uAhoMCAAAAMAIAAAAwAhIgABAAZEAcFzwIkAAAATY29scm5jbHgAAQANAAaAAAAAFGlzcGUAAAAAAAAAQAAAAEAAAAAoY2xhcAAAAEAAAAABAAAAMAAAAAEAAAAAAAAAAv////AAAAACAAAAEHBpeGkAAAAAAwgICAAAABhpcG1hAAAAAAAAAAEAAQWBAgMFhAAAABppcmVmAAAAAAAAAA5jZHNjAAIAAQABAAAA1G1kYXQAAAAQKAGvWOYB3ff/+C/r9IlNwAAAAABJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAEwIDAAEAAAABAAAAaYcEAAEAAABmAAAAAAAAADhjAADoAwAAOGMAAOgDAAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgBAABAAAAQAAAAAOgBAABAAAAMAAAAAAAAAA=',
}

let failed = false
for (const [label, b64] of Object.entries(FIXTURES)) {
  try {
    await sharp(Buffer.from(b64, 'base64')).resize(8).toBuffer()
    console.log(`ok   ${label}`)
  } catch (err) {
    failed = true
    console.error(`FAIL ${label}: ${err instanceof Error ? err.message : err}`)
  }
}
process.exit(failed ? 1 : 0)
