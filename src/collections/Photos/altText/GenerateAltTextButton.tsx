'use client'

import { Button, toast, useConfig, useDocumentInfo, useForm } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React, { useCallback, useState } from 'react'

type Props = {
  /** Whether Workers AI is configured, resolved on the server (see the `ui` field in Photos.ts). */
  enabled?: boolean
}

export const GenerateAltTextButton: React.FC<Props> = ({ enabled }) => {
  const { id } = useDocumentInfo()
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  // Read at click time through the form's getters instead of subscribing to field state, so
  // typing in the form never re-renders this button.
  const { dispatchFields, getField } = useForm()
  const [loading, setLoading] = useState(false)

  const handleClick = useCallback(async () => {
    const field = getField('alt')
    const current = typeof field?.value === 'string' ? field.value.trim() : ''
    // Ask before replacing anything a person wrote: saved hand-written text, or unsaved typing.
    const isHandWritten =
      current !== '' &&
      (getField('altSource')?.value === 'manual' || field?.value !== field?.initialValue)
    if (
      isHandWritten &&
      !window.confirm('Replace the hand-written alt text with a generated description?')
    ) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        formatAdminURL({ apiRoute: api, path: `/photos/${id}/alt-text`, serverURL }),
        { method: 'POST', credentials: 'include' },
      )
      const body = (await res.json().catch(() => null)) as {
        alt?: unknown
        error?: unknown
      } | null

      if (!res.ok || typeof body?.alt !== 'string') {
        throw new Error(
          typeof body?.error === 'string' ? body.error : `Request failed (HTTP ${res.status})`,
        )
      }

      // The endpoint has already saved this, so mirror it into the form as the new baseline:
      // dispatching directly (rather than `useField().setValue`) leaves `modified` untouched.
      dispatchFields({ type: 'UPDATE', initialValue: body.alt, path: 'alt', value: body.alt })
      dispatchFields({ type: 'UPDATE', initialValue: 'ai', path: 'altSource', value: 'ai' })
      toast.success('Alt text regenerated.')
    } catch (err) {
      toast.error(
        `Could not regenerate alt text: ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setLoading(false)
    }
  }, [api, dispatchFields, getField, id, serverURL])

  // Nothing to describe until the photo exists (create view, bulk upload).
  if (!enabled || !id) return null

  return (
    // `field-type` gives this the same bottom spacing as a real field; the negative top margin
    // pulls it up under the alt input it belongs to.
    <div
      className="field-type"
      style={{ marginTop: 'calc(var(--spacing-field, var(--base)) * -0.5)' }}
    >
      <Button
        buttonStyle="secondary"
        disabled={loading}
        margin={false}
        onClick={handleClick}
        size="small"
      >
        {loading ? 'Generating alt text…' : 'Regenerate alt text'}
      </Button>
    </div>
  )
}
