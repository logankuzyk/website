// @vitest-environment node
import { ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'

import { svgHasDimensions, validateSvgDimensions } from '@/collections/Assets/hooks/validateSvgDimensions'

const svgNamespace = 'xmlns="http://www.w3.org/2000/svg"'

describe('svgHasDimensions', () => {
  it('accepts a viewBox', () => {
    expect(svgHasDimensions(`<svg ${svgNamespace} viewBox="0 0 100 50"><rect/></svg>`)).toBe(true)
  })

  it('accepts absolute width and height', () => {
    expect(svgHasDimensions(`<svg ${svgNamespace} width="100" height="50"></svg>`)).toBe(true)
    expect(svgHasDimensions(`<svg ${svgNamespace} width="100px" height='5.5in'></svg>`)).toBe(true)
  })

  it('rejects zero or font-relative sizes', () => {
    expect(svgHasDimensions(`<svg ${svgNamespace} width="0" height="0"></svg>`)).toBe(false)
    expect(svgHasDimensions(`<svg ${svgNamespace} width="10em" height="5rem"></svg>`)).toBe(false)
  })

  it('rejects an unusable viewBox, even when width/height are present', () => {
    for (const viewBox of ['', 'foo', '0 0 0 0', '0 0 10', '0 0 -5 5', '0 0 10 0']) {
      expect(svgHasDimensions(`<svg ${svgNamespace} viewBox="${viewBox}"></svg>`), viewBox).toBe(false)
    }
    expect(svgHasDimensions(`<svg ${svgNamespace} viewBox="0,0,10.5,5"></svg>`)).toBe(true)
  })

  it('rejects an SVG with neither', () => {
    expect(svgHasDimensions(`<svg ${svgNamespace}><rect/></svg>`)).toBe(false)
  })

  it('rejects relative or partial dimensions without a viewBox', () => {
    expect(svgHasDimensions(`<svg ${svgNamespace} width="100%" height="100%"></svg>`)).toBe(false)
    expect(svgHasDimensions(`<svg ${svgNamespace} width="100"></svg>`)).toBe(false)
  })

  it('ignores a prolog, comments and a nested svg when finding the root', () => {
    const svg = `<?xml version="1.0"?><!-- <svg viewBox="0 0 1 1"> --><!DOCTYPE svg><svg ${svgNamespace}><svg viewBox="0 0 1 1"/></svg>`
    expect(svgHasDimensions(svg)).toBe(false)
    expect(svgHasDimensions(`<?xml version="1.0"?>\n<svg ${svgNamespace} viewBox="0 0 1 1"/>`)).toBe(true)
  })

  it('does not mistake data-* or stroke-width attributes for dimensions', () => {
    expect(svgHasDimensions(`<svg ${svgNamespace} data-width="1" data-height="1" stroke-width="2"></svg>`)).toBe(false)
  })

  it('rejects content with no svg root', () => {
    expect(svgHasDimensions('hello')).toBe(false)
  })
})

describe('validateSvgDimensions hook', () => {
  const run = (file?: { data: Buffer; mimetype: string; name: string }, operation = 'create') =>
    (validateSvgDimensions as (args: never) => Promise<void>)({ operation, req: { file } } as never)

  const svgFile = (svg: string) => ({
    data: Buffer.from(svg),
    mimetype: 'image/svg+xml',
    name: 'bg.svg',
  })

  it('lets a valid SVG through', async () => {
    await expect(run(svgFile(`<svg ${svgNamespace} viewBox="0 0 1 1"/>`))).resolves.toBeUndefined()
  })

  it('rejects an SVG with no dimensions using a field-level ValidationError on `file`', async () => {
    const err = await run(svgFile(`<svg ${svgNamespace}/>`)).catch((caught) => caught)
    expect(err).toBeInstanceOf(ValidationError)
    expect(err.data.errors[0]).toMatchObject({
      path: 'file',
      message: 'SVG needs a viewBox or width/height',
    })
  })

  it('also checks a replacement file on update', async () => {
    const err = await run(svgFile(`<svg ${svgNamespace}/>`), 'update').catch((caught) => caught)
    expect(err).toBeInstanceOf(ValidationError)
    await expect(run(svgFile(`<svg ${svgNamespace} viewBox="0 0 1 1"/>`), 'update')).resolves.toBeUndefined()
  })

  it('ignores requests without a file, and other operations', async () => {
    await expect(run(undefined)).resolves.toBeUndefined()
    await expect(run(undefined, 'update')).resolves.toBeUndefined()
    await expect(run(svgFile(`<svg ${svgNamespace}/>`), 'delete')).resolves.toBeUndefined()
  })

  it('leaves non-SVG files to the mimeTypes check', async () => {
    await expect(
      run({ data: Buffer.from('x'), mimetype: 'image/png', name: 'a.png' }),
    ).resolves.toBeUndefined()
  })
})
