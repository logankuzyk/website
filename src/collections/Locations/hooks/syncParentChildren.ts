import type { CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload'

type LocationDoc = { id: string; parent?: string | { id: string } | null; children?: (string | { id: string })[] }

function resolveId(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'object' && value?.id ? value.id : String(value)
}

async function getAncestorIds(
  payload: { findByID: (args: { collection: 'locations'; id: string; depth?: number }) => Promise<{ parent?: string | LocationDoc | null }> },
  collection: 'locations',
  locationId: string,
): Promise<Set<string>> {
  const ancestors = new Set<string>()
  let currentId: string | null = locationId

  while (currentId) {
    const doc = (await payload.findByID({
      collection,
      id: currentId,
      depth: 0,
    })) as { parent?: string | LocationDoc | null }
    const parentId = resolveId(doc?.parent)
    if (!parentId) break
    ancestors.add(parentId)
    currentId = parentId
  }

  return ancestors
}

async function getDescendantIds(
  payload: { find: (args: { collection: 'locations'; where: { parent: { in: string[] } }; depth?: number }) => Promise<{ docs: { id: string }[] }> },
  collection: 'locations',
  locationId: string,
): Promise<Set<string>> {
  const descendants = new Set<string>()
  let toProcess = [locationId]

  while (toProcess.length > 0) {
    const { docs } = await payload.find({
      collection,
      where: { parent: { in: toProcess } },
      depth: 0,
    })
    toProcess = []
    for (const doc of docs) {
      if (doc.id && !descendants.has(doc.id)) {
        descendants.add(doc.id)
        toProcess.push(doc.id)
      }
    }
  }

  return descendants
}

export const preventCircularReference: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const collection = 'locations'
  const docId = operation === 'create' ? null : (originalDoc?.id ?? data?.id)
  const newParentId = resolveId(data?.parent)
  const newChildIds = (data?.children as (string | LocationDoc)[] | undefined)
    ?.map((c) => resolveId(c))
    .filter((id): id is string => Boolean(id)) ?? []

  if (newParentId && docId) {
    const ancestors = await getAncestorIds(req.payload as never, collection, docId)
    if (ancestors.has(newParentId)) {
      throw new Error(
        `Cannot set parent: would create a circular reference. The selected parent is an ancestor of this location.`,
      )
    }
  }

  if (newChildIds.length > 0 && docId) {
    const descendants = await getDescendantIds(req.payload as never, collection, docId)
    for (const childId of newChildIds) {
      if (descendants.has(childId)) {
        throw new Error(
          `Cannot add child: would create a circular reference. The selected location is a descendant of this location.`,
        )
      }
    }
  }

  if (operation === 'create' && newParentId && newChildIds.length > 0) {
    for (const childId of newChildIds) {
      const ancestors = await getAncestorIds(req.payload as never, collection, childId)
      if (ancestors.has(newParentId)) {
        throw new Error(
          `Cannot add child: would create a circular reference. The selected child is an ancestor of the parent.`,
        )
      }
    }
  }

  return data
}

export const syncParentChildren: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
}) => {
  if (context?.skipHooks) return doc

  const docId = doc?.id != null ? String(doc.id) : null
  if (!docId) return doc

  const collection = 'locations'
  const prevParentId = resolveId(previousDoc?.parent)
  const currParentId = resolveId(doc.parent)
  const prevChildIds = (previousDoc?.children as (string | LocationDoc)[] | undefined)
    ?.map((c) => resolveId(c))
    .filter((id): id is string => Boolean(id)) ?? []
  const currChildIds = (doc.children as (string | LocationDoc)[] | undefined)
    ?.map((c) => resolveId(c))
    .filter((id): id is string => Boolean(id)) ?? []

  const prevChildSet = new Set(prevChildIds)
  const currChildSet = new Set(currChildIds)

  for (const childId of currChildIds) {
    if (!prevChildSet.has(childId)) {
      await req.payload.update({
        collection,
        id: childId,
        data: { parent: docId },
        req,
        context: { ...context, skipHooks: true },
        overrideAccess: false,
      })
    }
  }

  for (const childId of prevChildIds) {
    if (!currChildSet.has(childId)) {
      await req.payload.update({
        collection,
        id: childId,
        data: { parent: null },
        req,
        context: { ...context, skipHooks: true },
        overrideAccess: false,
      })
    }
  }

  if (prevParentId !== currParentId && docId) {
    if (prevParentId) {
      const prevParent = (await req.payload.findByID({
        collection,
        id: prevParentId,
        depth: 0,
      })) as { children?: (string | LocationDoc)[] }
      const prevChildren = (prevParent?.children ?? [])
        .map((c) => resolveId(c))
        .filter((id): id is string => Boolean(id) && id !== docId)
      await req.payload.update({
        collection,
        id: prevParentId,
        data: { children: prevChildren },
        req,
        context: { ...context, skipHooks: true },
        overrideAccess: false,
      })
    }
    if (currParentId) {
      const currParent = (await req.payload.findByID({
        collection,
        id: currParentId,
        depth: 0,
      })) as { children?: (string | LocationDoc)[] }
      const currChildren = (currParent?.children ?? [])
        .map((c) => resolveId(c))
        .filter((id): id is string => Boolean(id))
      if (!currChildren.includes(docId)) {
        currChildren.push(docId)
        await req.payload.update({
          collection,
          id: currParentId,
          data: { children: currChildren },
          req,
          context: { ...context, skipHooks: true },
          overrideAccess: false,
        })
      }
    }
  }

  return doc
}
