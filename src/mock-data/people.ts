import type {
  GoogleAccountOption,
  JobFunction,
  Participant,
  ParticipantRole,
  PersonRef,
  User,
  WorkspaceMember,
} from "@/types"

import { atDay } from "./anchor"

export interface PersonProfile {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  title: string
  company: string
  isExternal: boolean
  team?: string
  jobFunction?: JobFunction
  /** Set for WID users in the demo workspace. */
  userId?: string
}

const INTERNAL_COMPANY = "WID Demo Workspace"

const profiles = {
  waleed: {
    id: "per_waleed",
    name: "Waleed Ahmed",
    firstName: "Waleed",
    lastName: "Ahmed",
    email: "waleed@wid-demo.com",
    title: "Senior Engineer",
    company: INTERNAL_COMPANY,
    isExternal: false,
    team: "Engineering",
    jobFunction: "engineering",
    userId: "usr_waleed",
  },
  sara: {
    id: "per_sara",
    name: "Sara Ahmed",
    firstName: "Sara",
    lastName: "Ahmed",
    email: "sara.ahmed@wid-demo.com",
    title: "Product Designer",
    company: INTERNAL_COMPANY,
    isExternal: false,
    team: "Product",
    jobFunction: "product",
    userId: "usr_sara",
  },
  ahmed: {
    id: "per_ahmed",
    name: "Ahmed Khan",
    firstName: "Ahmed",
    lastName: "Khan",
    email: "ahmed.khan@wid-demo.com",
    title: "Head of Engineering",
    company: INTERNAL_COMPANY,
    isExternal: false,
    team: "Engineering",
    jobFunction: "management",
    userId: "usr_ahmed",
  },
  ayesha: {
    id: "per_ayesha",
    name: "Ayesha Malik",
    firstName: "Ayesha",
    lastName: "Malik",
    email: "ayesha.malik@wid-demo.com",
    title: "Product Manager",
    company: INTERNAL_COMPANY,
    isExternal: false,
    team: "Product",
    jobFunction: "product",
    userId: "usr_ayesha",
  },
  hamza: {
    id: "per_hamza",
    name: "Hamza Siddiqui",
    firstName: "Hamza",
    lastName: "Siddiqui",
    email: "hamza.siddiqui@wid-demo.com",
    title: "Backend Engineer",
    company: INTERNAL_COMPANY,
    isExternal: false,
    team: "Engineering",
    jobFunction: "engineering",
    userId: "usr_hamza",
  },
  ali: {
    id: "per_ali",
    name: "Ali Hassan",
    firstName: "Ali",
    lastName: "Hassan",
    email: "ali.hassan@wid-demo.com",
    title: "Account Executive",
    company: INTERNAL_COMPANY,
    isExternal: false,
    team: "Sales",
    jobFunction: "sales",
    userId: "usr_ali",
  },
  usman: {
    id: "per_usman",
    name: "Usman Raza",
    firstName: "Usman",
    lastName: "Raza",
    email: "usman.raza@meridianfreight.example",
    title: "Director of Operations",
    company: "Meridian Freight",
    isExternal: true,
  },
  fatima: {
    id: "per_fatima",
    name: "Fatima Noor",
    firstName: "Fatima",
    lastName: "Noor",
    email: "fatima.noor@northstarlabs.example",
    title: "Head of Customer Operations",
    company: "Northstar Labs",
    isExternal: true,
  },
  hira: {
    id: "per_hira",
    name: "Hira Shah",
    firstName: "Hira",
    lastName: "Shah",
    email: "hira.shah@vertexdigital.example",
    title: "VP Product",
    company: "Vertex Digital",
    isExternal: true,
  },
  bilal: {
    id: "per_bilal",
    name: "Bilal Qureshi",
    firstName: "Bilal",
    lastName: "Qureshi",
    email: "bilal.qureshi@atlasproperties.example",
    title: "Operations Manager",
    company: "Atlas Properties",
    isExternal: true,
  },
  maryam: {
    id: "per_maryam",
    name: "Maryam Farooq",
    firstName: "Maryam",
    lastName: "Farooq",
    email: "maryam.farooq@crescenthealth.example",
    title: "Clinical Systems Lead",
    company: "Crescent Health",
    isExternal: true,
  },
} as const satisfies Record<string, PersonProfile>

export type PersonKey = keyof typeof profiles

export const personProfiles: Record<PersonKey, PersonProfile> = profiles

/** All people the demo workspace knows about (internal teammates and external contacts). */
export const people: PersonProfile[] = Object.values(personProfiles)

export function participantOf(key: PersonKey, role?: ParticipantRole): Participant {
  const p: PersonProfile = personProfiles[key]
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: role ?? (p.isExternal ? "guest" : "attendee"),
    isExternal: p.isExternal,
    company: p.isExternal ? p.company : undefined,
    userId: p.userId,
  }
}

export function personRefOf(key: PersonKey): PersonRef {
  const p: PersonProfile = personProfiles[key]
  return { id: p.id, name: p.name, email: p.email }
}

export function personKeyById(id: string): PersonKey | undefined {
  return (Object.keys(personProfiles) as PersonKey[]).find((k) => personProfiles[k].id === id)
}

/** Demo account. Fictional; labelled as demo data in the UI. */
export const currentUser: User = {
  id: "usr_waleed",
  email: "waleed@wid-demo.com",
  firstName: "Waleed",
  lastName: "Ahmed",
  emailType: "company",
  jobFunction: "engineering",
  timezone: "Asia/Karachi",
  onboardingCompleted: true,
  createdAt: atDay(-34, "10:12"),
}

/** The same identity as it exists right after first Google sign-in, before onboarding. */
export const newUserBeforeOnboarding: User = {
  ...currentUser,
  emailType: null,
  jobFunction: null,
  onboardingCompleted: false,
  createdAt: atDay(0, "09:30"),
}

export const users: User[] = [currentUser]

/** Accounts shown in the mock Google account chooser. */
export const googleAccounts: GoogleAccountOption[] = [
  { id: "gacc_work", name: "Waleed Ahmed", email: "waleed@wid-demo.com" },
  { id: "gacc_personal", name: "Waleed Ahmed", email: "waleed.personal@gmail.com" },
]

const MEMBER_ROLES: Partial<Record<PersonKey, WorkspaceMember["role"]>> = {
  waleed: "admin",
  ahmed: "owner",
}

export const workspaceMembers: WorkspaceMember[] = (
  ["waleed", "ahmed", "hamza", "ayesha", "sara", "ali"] as const
).map((key) => {
  const p: PersonProfile = personProfiles[key]
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: MEMBER_ROLES[key] ?? "member",
    team: p.team,
    jobFunction: p.jobFunction,
    isCurrentUser: key === "waleed",
  }
})
