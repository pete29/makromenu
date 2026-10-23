import { liveQuery, type Table } from 'dexie'
import type { Invite } from 'dexie-cloud-addon'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { defaultProfiles, profileId, slotOf } from './defaults'

// Two accounts share one plan through a Dexie Cloud realm: the owner creates it, moves their data
// into it and invites the other person, who accepts in the app. Everything either of them adds
// afterwards goes to that realm too.

/** Marks our realm among others an account could be a member of. */
const HOUSEHOLD = 'makromenu-household'

/** Tables with the plan's data, all shared together. */
const DATA_TABLES = [db.recipes, db.recipeImages, db.mealPlan, db.shoppingChecks, db.profiles] as Table[]

/**
 * Our shared realm, if the logged-in user belongs to it. An invited user already syncs the realm
 * and its members before accepting, but until then their data must stay private.
 */
async function findHousehold() {
  const userId = db.cloud.currentUserId
  const [realms, mine] = await Promise.all([db.realms.toArray(), db.members.where('userId').equals(userId).toArray()])
  return realms.find(
    (r) => r.represents === HOUSEHOLD && mine.some((m) => m.realmId === r.realmId && (m.accepted || !m.invite)),
  )
}

let currentRealmId: string | undefined
liveQuery(findHousehold).subscribe((realm) => (currentRealmId = realm?.realmId))

/** The shared realm's id, or undefined while the plan is private. */
export const householdRealmId = () => currentRealmId

// Without a realmId, Dexie Cloud puts a new object in its creator's private realm, where the other
// person wouldn't see it. One hook here instead of passing the realm to every add() in the app.
for (const table of DATA_TABLES) {
  table.hook('creating', (_key, obj: { realmId?: string }) => {
    if (currentRealmId && !obj.realmId) obj.realmId = currentRealmId
  })
}

type Realm = NonNullable<Awaited<ReturnType<typeof findHousehold>>>
const membersOf = (realmId: string) => db.members.where('realmId').equals(realmId).toArray()
type Member = Awaited<ReturnType<typeof membersOf>>[number]

export interface Household {
  realm: Realm
  members: Member[]
}

/** The shared plan with its members; null when there is none, undefined while loading. */
export function useHousehold(): Household | null | undefined {
  return useLiveQuery(async () => {
    const realm = await findHousehold()
    if (!realm) return null
    return { realm, members: await membersOf(realm.realmId) }
  }, [])
}

/** Id of the shared realm for building profile ids: null when private, undefined while loading. */
export function useHouseholdRealmId(): string | null | undefined {
  return useLiveQuery(async () => (await findHousehold())?.realmId ?? null, [])
}

const FULL_ACCESS = { manage: '*' } as const

/**
 * Creates the shared plan: moves all of the logged-in user's data into a new realm, gives them
 * full access and invites `email` with full access too. Dexie Cloud also e-mails the invite.
 */
export async function shareHousehold(email: string): Promise<void> {
  const me = db.cloud.currentUser.value
  if (!me.isLoggedIn || !me.userId) throw new Error('Not logged in')
  await db.transaction('rw', [db.realms, db.members, ...DATA_TABLES], async () => {
    const realmId = await db.realms.add({ name: 'Wspólny plan', represents: HOUSEHOLD } as Realm)
    // A realm's owner still has to be a member to get its data.
    await db.members.add({ realmId, userId: me.userId, email: me.email, name: me.name, permissions: FULL_ACCESS } as Member)
    await db.members.add({ realmId, email, invite: true, permissions: FULL_ACCESS } as Member)

    for (const table of [db.recipes, db.recipeImages, db.mealPlan, db.shoppingChecks] as Table[]) {
      await table.toCollection().modify({ realmId })
    }
    // Private profile ids can't be shared, so profiles get ids tied to the realm and meals follow.
    const stored = await db.profiles.toArray()
    const profiles = defaultProfiles().map((d) => stored.find((p) => p.id === d.id) ?? d)
    await db.profiles.bulkDelete(stored.map((p) => p.id))
    await db.profiles.bulkAdd(profiles.map((p) => ({ ...p, id: profileId(slotOf(p.id), realmId), realmId })))
    await db.mealPlan.toCollection().modify((m) => {
      m.profileIds = m.profileIds.map((id) => profileId(slotOf(id), realmId))
    })
  })
}

/** Invites another e-mail to an existing shared plan, e.g. when the first invite was rejected. */
export async function inviteToHousehold(realmId: string, email: string): Promise<void> {
  await db.members.add({ realmId, email, invite: true, permissions: FULL_ACCESS } as Member)
}

/** Objects in the user's private realm (its id is the user id), i.e. not part of the shared plan. */
async function countPrivate(userId: string): Promise<number> {
  const counts = await Promise.all(DATA_TABLES.map((t) => t.filter((o) => o.realmId === userId).count()))
  return counts.reduce((a, n) => a + n, 0)
}

/**
 * Joins the shared plan. The account's own data would otherwise show up next to the shared plan
 * (two plans, two sets of recipes), so it is deleted after the user confirms.
 */
export async function acceptInvite(invite: Invite, confirmDelete: () => boolean): Promise<boolean> {
  const userId = db.cloud.currentUserId
  const own = await countPrivate(userId)
  if (own > 0 && !confirmDelete()) return false
  await db.transaction('rw', DATA_TABLES, async () => {
    for (const table of DATA_TABLES) await table.filter((o) => o.realmId === userId).delete()
  })
  await invite.accept()
  return true
}
