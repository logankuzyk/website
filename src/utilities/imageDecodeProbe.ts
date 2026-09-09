import sharp from 'sharp'

/**
 * Tiny committed fixtures (base64) that exercise the two decoders the npm-bundled `sharp`
 * binary lacks but the app relies on:
 *
 *  - `probe-10bit.avif` — 120×90, 10-bit AV1. Needs a libaom/dav1d built with
 *    high-bit-depth support. macOS/npm prebuilt sharp fails this; the Docker image's
 *    system libvips (see Dockerfile) passes it.
 *  - `probe.heic` — 64×48, HEVC. Needs libde265.
 *
 * Used by the startup guard in `payload.config.ts` and by the int test.
 */
const PROBE_AVIF_10BIT_B64 =
  'AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAABGgAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAeAAAAFoAAAAQcGl4aQAAAAADCgoKAAAADGF2MUOBAEwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAABIm1kYXQSAAoGGBm72WJCMo0CEZACSSSRQLRe9LvtV0XMXT7PDIQCt4wLc0vUI4crRna6SLQhQkj5exLMa3KBlFMKDuWvEkkoNZRoI1hsaU+6XMSVCPAm9/ue8NMg+K+SZBdZRDEUgEfTAVxGbKrazqKzDBqhQ3OAMbfhMLDxYIATKNsFdpHyje3IWTfX9YqF3sYc7sECa5dLGLsldHrYeHP3N1KLAY3MvYP7fHLkAzzLWeyA2YPNxax4EooYyOlm0RZOGBALr+hzAIv/axLiZm6brltgqs7jSSqI82FC2YsKoxvlvYNf3fM8sEnfhnd8aHV/vPRywdPhgbRaHSHoqo85gLIyfu4Cq7Boz/cN0c0225vQpRcpQ9d7JVnxsvQ='

const PROBE_HEIC_B64 =
  'AAAAHGZ0eXBoZWljAAAAAG1pZjFoZWljbWlhZgAAAb5tZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAANGlsb2MAAAAAREAAAgABAAAAAAHiAAEAAAAAAAAAFAACAAAAAAH2AAEAAAAAAAAAuAAAADhpaW5mAAAAAAACAAAAFWluZmUCAAAAAAEAAGh2YzEAAAAAFWluZmUCAAABAAIAAEV4aWYAAAAA/WlwcnAAAADdaXBjbwAAAHZodmNDAQNwAAAAAAAAAAAAHvAA/P34+AAADwMgAAEAGEABDAH//wNwAAADAJAAAAMAAAMAHroCQCEAAQAqQgEBA3AAAAMAkAAAAwAAAwAeoCCBBZbq5Ka5uAhoMCAAAAMAIAAAAwAhIgABAAZEAcFzwIkAAAATY29scm5jbHgAAQANAAaAAAAAFGlzcGUAAAAAAAAAQAAAAEAAAAAoY2xhcAAAAEAAAAABAAAAMAAAAAEAAAAAAAAAAv////AAAAACAAAAEHBpeGkAAAAAAwgICAAAABhpcG1hAAAAAAAAAAEAAQWBAgMFhAAAABppcmVmAAAAAAAAAA5jZHNjAAIAAQABAAAA1G1kYXQAAAAQKAGvWOYB3ff/+C/r9IlNwAAAAABJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAEwIDAAEAAAABAAAAaYcEAAEAAABmAAAAAAAAADhjAADoAwAAOGMAAOgDAAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgBAABAAAAQAAAAAOgBAABAAAAMAAAAAAAAAA='

export const decodeProbeFixtures: Record<string, Buffer> = {
  'AVIF (10-bit)': Buffer.from(PROBE_AVIF_10BIT_B64, 'base64'),
  HEIC: Buffer.from(PROBE_HEIC_B64, 'base64'),
}

export type DecodeProbeResult = { format: string; ok: boolean; error?: string }

/**
 * Try a trivial decode + downscale of each fixture. Never throws — returns one result per
 * fixture so the caller can log or assert.
 */
export async function probeImageDecoders(): Promise<DecodeProbeResult[]> {
  const results: DecodeProbeResult[] = []
  for (const [format, bytes] of Object.entries(decodeProbeFixtures)) {
    try {
      await sharp(bytes).resize(8).toBuffer()
      results.push({ format, ok: true })
    } catch (err) {
      results.push({ format, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return results
}
