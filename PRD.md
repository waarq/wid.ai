You are a **Senior Product Designer + Senior Frontend Engineer + Frontend Architect** specializing in building polished, production-grade SaaS products with:

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Lucide
* Framer Motion
* Zustand
* React Hook Form
* Zod
* TanStack Query
* modern App Router architecture
* performance-first frontend engineering
* accessible, responsive and reusable UI systems

Your task is to design and generate a **complete, immediately runnable frontend prototype** for:

# PRODUCT

**WID** (short for **Wrote It Down**)

WID is an AI meeting intelligence platform inspired by products such as Fathom.

The product captures meetings, turns conversations into structured notes, transcripts, decisions and action items, and makes the information searchable and useful after the meeting.

The product should feel like a serious, modern, venture-backed SaaS company preparing for commercial launch.

It must **not** feel like:

* a generic AI dashboard
* a ChatGPT wrapper
* a template generated from shadcn/ui
* a collection of disconnected screens
* a developer demo
* a fake Fathom copy

The experience should feel like a real product.

---

# PRIMARY PRODUCT PROMISE

WID turns meetings into something useful immediately.

The product should communicate:

> **Your meetings, understood.**

Supporting positioning:

> WID captures your conversations, understands what happened, and turns meetings into decisions, action items and searchable knowledge.

The core product loop is:

```text
Meeting
   ↓
Capture
   ↓
Transcript
   ↓
Understand
   ↓
Summary
   ↓
Decisions
   ↓
Action Items
   ↓
Follow-up
   ↓
Searchable Meeting Memory
```

The user should never feel that the transcript itself is the final product.

The transcript is evidence.

The useful output is:

* what happened
* what was decided
* what needs to happen next
* who owns what
* what remains unresolved
* what changed
* what needs attention

---

# IMPORTANT PRODUCT PRINCIPLE

Do not build WID as a simple "AI meeting recorder."

Build it as:

> **A meeting intelligence workspace that converts conversations into reliable, traceable work.**

Every important AI-generated insight should eventually be traceable back to its meeting and timestamp.

Example:

```text
Decision

Launch moved to October 15.

Source:
Product Planning

01:15

[Jump to conversation]
```

This principle must be reflected throughout the UI architecture.

---

# CORE PRODUCT EXPERIENCE

The complete user journey should be:

```text
Landing Page
      ↓
Sign Up / Sign In
      ↓
Google Account Selection
      ↓
Google Calendar Connection
      ↓
Email Type
      ↓
Onboarding
      ↓
Meeting Capture Preferences
      ↓
Sharing Preferences
      ↓
Understanding / Personalization
      ↓
Job Function
      ↓
Zoom Integration
      ↓
Portal
      ↓
My Calls
      ↓
Meeting Intelligence
```

The user should be able to complete this entire journey without dead ends.

---

# IMPORTANT CAPTURE PRINCIPLE

WID should **not automatically schedule, join, record or capture every calendar meeting by default**.

The user explicitly wants:

> **"Take notes on all my calendar meetings, but don't automate it. I'll capture manually."**

Therefore:

* Calendar is connected for context.
* Calendar meetings are displayed.
* WID knows which meetings exist.
* WID does NOT automatically start recording.
* WID does NOT automatically join meetings.
* WID does NOT silently capture meetings.
* The user manually chooses when to capture.

The UI should clearly communicate this.

Example:

```text
Your calendar is connected.

WID can see your upcoming meetings,
but nothing will be recorded automatically.

You decide when to capture.

[Got it]
```

---

# CAPTURE MODEL

WID should support a conceptual capture architecture that can later be connected to real backend/capture infrastructure.

Frontend states:

```text
Upcoming
Ready
Capturing
Paused
Processing
Transcribing
Understanding
Ready
Failed
```

Example:

```text
○ Ready to capture

[Start capture]
```

During capture:

```text
● Capturing

00:17:42

[Pause] [Stop]
```

After capture:

```text
Processing your meeting...

✓ Recording uploaded
✓ Transcript generated
● Understanding conversation
○ Extracting decisions
○ Finding action items
```

Eventually:

```text
Meeting ready

[Open meeting]
```

---

# PRODUCT AREAS

The authenticated WID portal should contain:

```text
My Calls
Team Calls
Playlist
Alerts
Deals
Settings
Profile
```

The primary navigation should be:

```text
Home / My Calls
My Calls
Team Calls
Playlist
Alerts
Deals

----------------

Settings
Profile
```

Use icons plus labels.

Do not overcomplicate navigation.

---

# LANDING WEBSITE

Create a complete premium SaaS marketing website.

Routes:

```text
/
 /features
 /how-it-works
 /pricing
 /about
 /contact
```

The landing page must explain WID within seconds.

---

# LANDING PAGE NAVIGATION

Desktop navbar:

```text
WID

Product
Solutions
How it works
Pricing

Log in
Get started
```

Mobile:

```text
WID
☰
```

Mobile navigation should use a proper drawer/sheet.

Navbar should:

* become sticky after scrolling
* maintain strong visual hierarchy
* have subtle backdrop treatment
* not consume excessive vertical space
* remain performant
* not cause layout shift

---

# HERO SECTION

Eyebrow:

> AI meeting intelligence

Headline:

> **Meetings are where work happens. WID remembers what happened.**

Alternative headline direction:

> **Turn every meeting into something you can act on.**

Supporting copy:

> WID captures your meetings, understands the conversation, and turns it into clear notes, decisions, action items and searchable knowledge.

Primary CTA:

> Get started

Secondary CTA:

> See how it works

The hero should contain a realistic product preview rather than generic AI artwork.

---

# HERO PRODUCT PREVIEW

Show a realistic meeting intelligence interface.

Example:

```text
┌─────────────────────────────────────────────────────────┐
│ Product Strategy                                        │
│ Today · 42 min · 5 participants                         │
│                                                         │
│ 3 decisions     4 actions      1 unresolved question   │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ MEETING BRIEF                                           │
│                                                         │
│ The team agreed to move the launch to October 15.      │
│ API integration remains the primary dependency.         │
│                                                         │
│ YOUR ACTIONS                                            │
│                                                         │
│ □ Finish API integration — Friday                       │
│ □ Prepare beta documentation — Monday                  │
│                                                         │
│ [Open meeting]                                          │
└─────────────────────────────────────────────────────────┘
```

The preview should feel like the actual application.

Do not use fake futuristic interfaces.

---

# SOCIAL PROOF

Do not fabricate real customers, partnerships or statistics.

Use conceptual proof:

```text
Built for:

Sales
Engineering
Product
Consulting
Customer Success
Management
```

Use fictional/demo organizations only when explicitly labeled as demo content.

---

# PROBLEM SECTION

Headline:

> **The meeting ends. The work doesn't.**

Show the common problems:

* People forget what was discussed.
* Action items disappear into chat.
* Decisions become difficult to find.
* Someone asks, "What did we agree on?"
* Managers need context from meetings they didn't attend.
* Client commitments get lost.
* Teams repeat the same conversations.
* Meeting recordings become unread archives.

Then introduce WID:

```text
Conversation
      ↓
WID understands it
      ↓
Decision
Action
Question
Context
Follow-up
```

---

# HOW IT WORKS

Create four steps.

## 01 — Connect your calendar

Connect Google Calendar so WID understands your meeting schedule.

Important:

> Connecting your calendar does not automatically record meetings.

---

## 02 — Capture when you want

Choose a meeting and manually start capture.

No automatic recording by default.

---

## 03 — WID understands the conversation

After the meeting, WID produces:

* transcript
* summary
* decisions
* action items
* questions
* risks
* highlights
* topics

---

## 04 — Find and act on what matters

Search your meetings, ask questions and jump directly to the source conversation.

---

# FEATURE SHOWCASE

Do not use generic three-column feature cards only.

Create large, interactive product sections.

---

# FEATURE 1 — MEETING BRIEF

Show:

```text
MEETING BRIEF

The team agreed to launch on October 15.

Key points

• API integration remains the primary dependency.
• Beta will initially include 50 users.
• Customer onboarding still needs an owner.

Decisions

✓ Launch date: October 15
✓ Beta size: 50 users
✓ New dashboard uses the new API
```

CTA:

> Open meeting

---

# FEATURE 2 — ACTION ITEMS

Show:

```text
YOUR ACTIONS

□ Finish API integration
  Product Planning
  Due Friday

□ Send revised proposal
  Client Call
  Due tomorrow

□ Review deployment plan
  Engineering Sync
  No deadline
```

Each action should be linked to its source meeting.

---

# FEATURE 3 — SMART MOMENTS

Automatically organize important moments:

```text
🔥 Decision
✓ Commitment
⚠ Risk
❓ Question
💡 Insight
```

Timeline:

```text
00:00 ─── 08:14 ─── 17:42 ─── 31:05 ─── 39:12
             │          │          │
           Decision     Risk     Question
```

Clicking a moment jumps to the relevant transcript timestamp.

---

# FEATURE 4 — ASK THE MEETING

Show:

```text
Ask this meeting...

"What did we decide about the launch?"

WID

The team agreed to launch on October 15.

The decision was confirmed at 01:15.

[Jump to 01:15]
```

The frontend must be designed so this can later connect directly to a backend AI/RAG API.

---

# FEATURE 5 — SEARCHABLE MEETING MEMORY

Show:

```text
Search your meetings

"What did the client say about pricing?"

────────────────────────────────

Client Discovery Call
02:31

"We need to understand the pricing
before moving forward."

[Jump to moment]
```

Search should eventually support:

* meeting title
* participant
* transcript
* action items
* decisions
* topics
* tags
* deals

---

# FEATURE 6 — MEETING HISTORY

Show:

```text
Product Planning

Sep 18
Launch → Oct 5

Sep 25
Launch → Oct 12

Oct 1
Launch → Oct 15
```

WID should make it possible to understand how decisions changed over time.

---

# FEATURE 7 — FOLLOW-UP

Generate:

```text
Meeting follow-up

Subject:
Product Planning — Decisions & Next Steps

Hi everyone,

Thanks for today's discussion.

We aligned on:

• October 15 launch
• 50-user beta
• New API integration

Next steps:

• Waleed — API integration
• Sarah — beta documentation

Best,
Waleed
```

Actions:

```text
[Copy]
[Edit]
```

Backend sending can be plugged in later.

---

# AUTHENTICATION

Routes:

```text
/login
/register
```

For now authentication should support:

> **Continue with Google**

Google OAuth should be represented as the primary authentication flow.

The frontend must abstract authentication behind services so real OAuth can later replace mock authentication without rewriting the UI.

Example frontend abstraction:

```ts
interface AuthService {
  signInWithGoogle(): Promise<AuthResult>
  signOut(): Promise<void>
  getCurrentUser(): Promise<User | null>
}
```

The prototype may use a mock implementation.

---

# SIGN IN

Design:

```text
WID

Your meetings,
understood.

[ Continue with Google ]

────────────────────

By continuing, you agree to
Terms and Privacy.
```

Don't show unnecessary email/password fields if Google is the only authentication method for this version.

---

# SIGN UP

Same Google-first experience.

```text
Create your WID account

Continue with Google
```

After Google account selection:

```text
Welcome, Waleed.

Let's set up WID.
```

---

# GOOGLE ACCOUNT SELECTION

The UI should simulate Google's account-selection experience without attempting to clone Google's proprietary UI.

Show:

```text
Continue with Google

Select an account

○ Waleed Ahmed
  waleed@company.com

○ Waleed Ahmed
  waleed.personal@gmail.com

[Use another account]
```

The selected identity becomes the initial WID profile.

---

# COMPANY EMAIL VS PERSONAL EMAIL

Immediately after Google authentication ask:

> **How will you use WID?**

```text
Which email did you use?

○ My company's email

  I'm using WID for work and team meetings.

○ My personal email

  I'm using WID for my own meetings and projects.
```

This selection must affect onboarding and account metadata.

Store:

```ts
emailType:
  | "company"
  | "personal"
```

Do not assume company email from the domain.

Ask explicitly.

---

# GOOGLE CALENDAR CONNECTION

After authentication and email type:

```text
Connect your calendar

WID uses your calendar to understand
which meetings you have coming up.

Google Calendar

[Connect Google Calendar]
```

Important explanation:

> WID will not automatically record your meetings. You choose when to capture.

After mocked connection:

```text
✓ Google Calendar connected

12 upcoming meetings found.

[Continue]
```

Also provide:

```text
Skip for now
```

But make the value of connecting clear.

---

# CALENDAR PERMISSION UX

Before connecting:

```text
What WID needs access to

✓ View your calendar events
✓ Read meeting titles
✓ Read meeting times
✓ Read attendee information

WID does not automatically record
your calendar meetings.
```

This prepares the frontend for a real OAuth permission flow later.

---

# ONBOARDING

Create a dedicated onboarding shell.

It should feel substantially different from the main dashboard.

Use:

```text
WID logo

Step 2 of 6

━━━━━━━━━━━━━━━━━━━━━━

Question

Description

Input

[Back] [Continue]
```

Allow:

* back
* continue
* skip where appropriate
* persisted progress
* refresh recovery
* loading states
* validation
* error states

---

# ONBOARDING STEP 1 — CALENDAR

If calendar wasn't already connected:

```text
Connect Google Calendar

Bring your meetings into WID.

[Connect calendar]

Skip for now
```

If connected:

```text
✓ Google Calendar connected

12 upcoming meetings
```

---

# ONBOARDING STEP 2 — MEETING CAPTURE

Ask:

> **Which meetings should WID take notes on?**

Options:

```text
○ All calendar meetings

  WID will make every meeting available
  for manual capture.

○ Selected meetings

  Choose which types of meetings
  you want to capture.

○ I'll choose manually

  WID will never automatically capture.
  I'll start each meeting myself.
```

Default:

> **I'll choose manually**

The UI must explicitly explain:

> Your calendar helps WID understand your schedule. It does not mean WID automatically records your meetings.

---

# ONBOARDING STEP 3 — SHARING

Ask:

> **Who should meeting notes be shared with?**

Options:

```text
○ All attendees

  Meeting notes can be shared with
  everyone invited to the meeting.

○ Only me

  Keep meeting notes private unless
  you choose to share them.
```

Store:

```ts
sharingPreference:
  | "all_attendees"
  | "only_me"
```

Default should be:

> Only me

Privacy should be the safer initial state.

---

# ONBOARDING STEP 4 — UNDERSTANDING CHECKS

Ask:

> **What should WID pay attention to?**

Create selectable cards.

```text
☐ Decisions

☐ Action items

☐ Questions

☐ Risks & blockers

☐ Customer requirements

☐ Follow-up commitments

☐ Deadlines

☐ Important quotes

☐ Sales opportunities
```

Allow multiple selections.

Include:

> You can change these later.

This becomes:

```ts
meetingFocus: MeetingFocus[]
```

The frontend should make this configuration easy to send to the backend later.

---

# ONBOARDING STEP 5 — JOB FUNCTION

Ask:

> **What best describes your job function?**

Options:

```text
Sales
Engineering
Product
Marketing
Customer Success
Operations
Management
Consulting
Recruiting
Founder / Executive
Other
```

Store:

```ts
jobFunction:
  | "sales"
  | "engineering"
  | "product"
  | "marketing"
  | "customer_success"
  | "operations"
  | "management"
  | "consulting"
  | "recruiting"
  | "executive"
  | "other"
```

This preference should later personalize:

* dashboard
* summary emphasis
* action items
* meeting insights
* suggested questions
* deals
* alerts

---

# ONBOARDING STEP 6 — PERSONALIZE YOUR ACCOUNT

Ask:

```text
Personalize your WID

What should we call you?

First name
Last name

What timezone are you in?

Asia/Karachi

What do you want WID to help you with?

☐ Remember decisions
☐ Track action items
☐ Prepare follow-ups
☐ Understand customer conversations
☐ Search past meetings
☐ Keep my team aligned
```

Use React Hook Form + Zod.

---

# ZOOM INTEGRATION

After onboarding:

```text
Connect Zoom

WID requires a Zoom connection
to capture Zoom meetings.

[Connect Zoom]
```

Underneath:

> Never join Zoom meetings? Skip this step.

This should be a small, secondary text link.

Do not force the user to connect Zoom.

After connecting:

```text
✓ Zoom connected

WID can now work with your Zoom meetings.

[Continue]
```

---

# ONBOARDING COMPLETE

Show a clean completion screen:

```text
You're ready.

WID is set up for you.

Calendar
✓ Connected

Capture
Manual

Sharing
Only me

Focus
Decisions · Actions · Questions

Zoom
Connected

[Go to WID]
```

Use a subtle success animation.

Do not use excessive confetti.

---

# APPLICATION SHELL

After onboarding, enter the main portal.

Desktop structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ WID                                      Search    Alerts    │
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│ My Calls      │                                              │
│ Team Calls    │                                              │
│ Playlist      │                  CONTENT                     │
│ Alerts        │                                              │
│ Deals         │                                              │
│               │                                              │
│ ─────────     │                                              │
│ Settings      │                                              │
│ Profile       │                                              │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

Use a persistent sidebar on desktop.

Collapse it on tablet.

Use a drawer/bottom navigation strategy on mobile.

---

# TOPBAR

Include:

```text
Search

⌘ K

Notifications

Profile avatar
```

Depending on page:

```text
Page title
Breadcrumb
Date range
Filters
Primary action
```

---

# MY CALLS

This is the main meeting library.

Route:

```text
/dashboard/my-calls
```

Heading:

> My Calls

Supporting text:

> Meetings you've captured or have access to.

Primary CTA:

> * Capture meeting

Filters:

```text
All
Today
This week
This month
Shared with me
```

Search:

```text
Search meetings...
```

---

# MY CALLS CARD

Each meeting card:

```text
Product Planning

Today · 42 min

5 participants

────────────────────────

The team agreed to move
the launch to October 15...

────────────────────────

3 decisions
4 actions
1 question

[Open]
```

Also display:

```text
Captured
Processing
Ready
Failed
```

with appropriate states.

---

# MEETING LIST

Desktop can support table/list mode.

Columns:

```text
Meeting
Date
Duration
Participants
Status
Actions
```

Mobile should become cards.

Never force a desktop table into a narrow mobile viewport.

---

# MEETING DETAIL PAGE

This is one of the most important screens.

Route:

```text
/dashboard/my-calls/[meetingId]
```

Header:

```text
← My Calls

Product Planning

Oct 1 · 42 min · 5 participants

[Play] [Share] [⋯]
```

Main layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Meeting Brief                                            │
│                                                          │
│ Decisions                                                │
│                                                          │
│ Action Items                                             │
│                                                          │
│ Questions                                                │
│                                                          │
│ Risks                                                   │
│                                                          │
│ Transcript                                               │
└──────────────────────────────────────────────────────────┘
```

Desktop can use a two-column layout:

```text
Main content                 Right rail

Meeting Brief                Meeting info
Transcript                   Participants
Timeline                     Tags
                             AI Assistant
```

---

# MEETING BRIEF

Always prioritize this before transcript.

Sections:

```text
Overview
Decisions
Action items
Questions
Risks
Key moments
Topics
```

Use collapsible sections where appropriate.

---

# TRANSCRIPT

Display timestamped speaker segments.

Example:

```text
01:12

Waleed

I think we should move the
launch to next Friday.

01:24

Sarah

That works for me.

01:38

Waleed

Okay, let's make that official.
```

Clicking a transcript segment should eventually seek the audio/video player.

The frontend should implement:

```ts
TranscriptSegment {
  id: string
  speakerId: string
  speakerName: string
  startTime: number
  endTime: number
  text: string
  confidence?: number
}
```

---

# AUDIO PLAYER

Create a reusable audio player.

Features:

* play/pause
* progress
* current timestamp
* duration
* playback speed
* skip 5 seconds
* volume
* transcript synchronization

Optional:

```text
0.75x
1x
1.25x
1.5x
2x
```

The component must be independent from the backend.

It should accept:

```ts
audioUrl?: string
duration: number
segments: TranscriptSegment[]
```

---

# AI ASSISTANT

Right-side assistant:

```text
Ask about this meeting

┌─────────────────────────────────┐
│ What did we decide about       │
│ the launch?                    │
└─────────────────────────────────┘

Suggested questions:

What are my action items?
What risks were mentioned?
What did the client ask for?
What remains unresolved?
```

AI answer:

```text
The team agreed to launch on
October 15.

Source: 01:38

[Jump to source]
```

The frontend must be designed around a pluggable API.

Create an abstraction such as:

```ts
interface MeetingAssistantService {
  ask(
    meetingId: string,
    question: string
  ): Promise<MeetingAnswer>
}
```

---

# TEAM CALLS

Route:

```text
/dashboard/team-calls
```

Purpose:

Allow users to see meetings shared with their team.

Filters:

```text
Everyone
My team
Shared with me
```

Show:

* owner
* participants
* meeting
* date
* summary
* actions

Respect sharing preferences.

---

# PLAYLIST

Route:

```text
/dashboard/playlist
```

This is a personal collection of important meeting moments.

Users can save:

* highlights
* decisions
* quotes
* insights
* important timestamps

Example:

```text
My Playlist

🔥 Customer objection
Client Discovery
03:41

✓ Pricing decision
Product Planning
17:22

💡 Product insight
Research Interview
21:05
```

Actions:

```text
Play
Open meeting
Remove
```

---

# ALERTS

Route:

```text
/dashboard/alerts
```

Alerts should focus on useful meeting intelligence.

Examples:

```text
Action item due tomorrow

You committed to send the proposal
during Client Discovery.

[View meeting]
```

```text
You were mentioned

Sarah assigned you the API integration.

[View action]
```

```text
Decision changed

The launch date changed from Oct 12
to Oct 15.

[View meetings]
```

Filters:

```text
All
Unread
Actions
Mentions
Decisions
```

---

# DEALS

Route:

```text
/dashboard/deals
```

This should be designed primarily for sales/customer-facing workflows.

Do not make this a complete CRM.

Create a lightweight meeting-driven deal workspace.

Example:

```text
Deals

Acme Corp

Stage
Proposal

Last meeting
Sep 30

Next action
Send revised proposal

Signals
✓ Interested
⚠ Pricing concern
✓ Decision maker present
```

Deal stages:

```text
New
Discovery
Qualified
Proposal
Negotiation
Won
Lost
```

Each deal can reference meetings.

---

# DEAL DETAIL

Show:

```text
Acme Corp

$25,000
Proposal

────────────────────────

Next Action
Send revised proposal

────────────────────────

Recent Meetings

Discovery Call
Sep 21

Proposal Review
Sep 30

────────────────────────

Conversation Insights

✓ Strong interest
⚠ Pricing concern
? Implementation timeline
```

Everything should be mockable now and API-ready later.

---

# SETTINGS

Route:

```text
/dashboard/settings
```

Settings sections:

```text
General
Meetings
Capture
Sharing
AI & Understanding
Notifications
Integrations
Security
Appearance
```

---

# GENERAL SETTINGS

Fields:

```text
Name
Email
Timezone
Job function
Company/personal email
```

---

# MEETING SETTINGS

```text
Default sharing

○ Only me
○ All attendees

Meeting focus

☑ Decisions
☑ Action items
☑ Questions
☑ Risks
☐ Quotes
☑ Deadlines
```

---

# CAPTURE SETTINGS

Clearly communicate:

```text
Manual capture

WID will not automatically record
calendar meetings.

[Enabled]
```

Allow:

```text
Default capture mode
Audio
Video
Transcript only
```

These should be configurable for future backend support.

---

# AI & UNDERSTANDING SETTINGS

Allow the user to configure:

```text
What should WID prioritize?

Decisions
Action items
Questions
Risks
Customer requirements
Deadlines
Commitments
Sales opportunities
```

---

# NOTIFICATION SETTINGS

Options:

```text
Meeting processing completed
Action item reminders
Mentions
Shared meeting notifications
Deal updates
Weekly meeting summary
```

Use Switch components.

---

# INTEGRATIONS SETTINGS

Cards:

```text
Google Calendar
✓ Connected

Zoom
✓ Connected

Google
Connected

Coming later:

Slack
Microsoft Calendar
HubSpot
Salesforce
```

Each integration supports:

```text
Connect
Connected
Configure
Disconnect
```

The frontend should not assume the actual OAuth implementation.

---

# PROFILE

Route:

```text
/dashboard/profile
```

Show:

```text
Profile photo
First name
Last name
Email
Job function
Timezone
Account type
```

Account type:

```text
Company email
Personal email
```

---

# PROFILE MENU

Top-right menu:

```text
Waleed Ahmed
waleed@example.com

Profile
Settings
Keyboard shortcuts
Help

────────────────

Sign out
```

Sign out should use a confirmation state if appropriate.

---

# COMMAND PALETTE

Global shortcut:

```text
⌘ K
Ctrl K
```

Commands:

```text
Search meetings
Go to My Calls
Go to Team Calls
Go to Playlist
Go to Alerts
Go to Deals
Start capture
Open settings
Open profile
Toggle theme
```

Search results should be grouped:

```text
Meetings
Actions
Deals
People
Commands
```

---

# GLOBAL SEARCH

Search across:

```text
Meetings
Transcripts
Action items
Decisions
Deals
People
```

Example:

```text
Search WID

"launch"

Meetings
Product Planning
Client Discovery

Decisions
Launch date → Oct 15

Actions
Confirm launch checklist
```

The frontend should use a search service abstraction:

```ts
interface SearchService {
  search(query: string): Promise<SearchResult[]>
}
```

Mock implementation now.

API implementation later.

---

# NOTIFICATIONS

Global notification menu.

Examples:

```text
Meeting ready
Your Product Planning meeting is ready.

Action item
You have an action due tomorrow.

Mention
Sarah mentioned you in Engineering Sync.

Decision changed
Launch date changed in Product Planning.
```

Support:

* unread state
* mark read
* mark all read
* navigation to source
* empty state

---

# SHARING

When clicking Share:

```text
Share meeting

Who can access this meeting?

○ Only me
○ All attendees
○ Anyone with the link

[Copy link]
```

However, only expose "Anyone with the link" if the product configuration supports it.

Default:

> Only me

---

# SHARE EXPERIENCE

Show:

```text
Meeting shared with:

Sarah Ahmed
Ali Hassan
Hamza Siddiqui
```

Allow removal if permissions support it.

---

# MEETING PRIVACY

Every meeting should clearly indicate visibility:

```text
Private
Shared with attendees
Shared with team
```

Never hide the sharing state.

---

# ONBOARDING DATA MODEL

Use a strongly typed onboarding model.

```ts
interface OnboardingData {
  emailType: "company" | "personal"

  calendarConnected: boolean

  capturePreference:
    | "all_calendar_meetings"
    | "selected_meetings"
    | "manual"

  sharingPreference:
    | "all_attendees"
    | "only_me"

  meetingFocus: MeetingFocus[]

  jobFunction: JobFunction

  firstName: string
  lastName: string
  timezone: string

  zoomConnected: boolean
}
```

This object should eventually map cleanly to backend API requests.

---

# BACKEND-READY FRONTEND ARCHITECTURE

This is extremely important.

Do not scatter mock data throughout components.

Do NOT write:

```tsx
const meetings = [...]
```

inside page components.

Instead use:

```text
mock-data/
services/
repositories/
types/
```

---

# SERVICE LAYER

Create service interfaces.

Example:

```ts
interface MeetingService {
  list(params?: MeetingListParams): Promise<Meeting[]>

  getById(id: string): Promise<Meeting>

  create(input: CreateMeetingInput): Promise<Meeting>

  update(id: string, input: UpdateMeetingInput): Promise<Meeting>

  delete(id: string): Promise<void>
}
```

Then:

```text
services/
  meetings.ts
```

and:

```text
services/mock/
  meetings.ts
```

The UI should only communicate with the service abstraction.

Later:

```text
MockMeetingService
        ↓
RealMeetingService
        ↓
REST API
```

---

# REQUIRED SERVICE MODULES

Create abstractions for:

```text
AuthService
UserService
OnboardingService
CalendarService
MeetingService
TranscriptService
ActionItemService
SearchService
AssistantService
PlaylistService
AlertService
DealService
IntegrationService
SettingsService
```

The frontend must never directly know whether the implementation is:

* mock
* REST
* GraphQL
* server action
* future SDK

---

# API CONTRACTS

Create typed request/response models.

Examples:

```ts
interface Meeting {
  id: string
  title: string
  startedAt: string
  endedAt: string
  duration: number
  participants: Participant[]
  status: MeetingStatus
  visibility: MeetingVisibility
  summary?: MeetingSummary
}
```

```ts
interface MeetingSummary {
  overview: string
  keyPoints: string[]
  decisions: Decision[]
  actionItems: ActionItem[]
  questions: Question[]
  risks: Risk[]
}
```

```ts
interface ActionItem {
  id: string
  meetingId: string
  title: string
  description?: string
  assignee?: Participant
  dueDate?: string
  status: ActionItemStatus
  sourceSegmentId?: string
  sourceTimestamp?: number
}
```

---

# DATA FETCHING

Use **TanStack Query** for server-state-style data.

Do not use Zustand as a replacement for server state.

Use Zustand for:

* UI state
* onboarding state
* sidebar state
* command palette
* modal state
* local preferences
* capture UI state

Use TanStack Query for:

* meetings
* transcripts
* actions
* deals
* alerts
* profile
* settings
* integration status

This separation is important for future backend integration.

---

# ROUTING ARCHITECTURE

Use Next.js App Router.

Recommended structure:

```text
app/
├── (marketing)/
│   ├── page.tsx
│   ├── features/
│   ├── how-it-works/
│   ├── pricing/
│   ├── about/
│   └── contact/
│
├── (auth)/
│   ├── login/
│   └── register/
│
├── onboarding/
│   └── page.tsx
│
├── (app)/
│   ├── layout.tsx
│   ├── my-calls/
│   │   ├── page.tsx
│   │   └── [meetingId]/
│   │       └── page.tsx
│   ├── team-calls/
│   ├── playlist/
│   ├── alerts/
│   ├── deals/
│   │   ├── page.tsx
│   │   └── [dealId]/
│   ├── settings/
│   └── profile/
│
├── layout.tsx
└── globals.css
```

Use route groups appropriately.

Do not create unnecessary nested layouts.

---

# SERVER VS CLIENT COMPONENTS

Use Server Components by default.

Only use:

```tsx
"use client"
```

when the component genuinely needs:

* state
* effects
* browser APIs
* event handlers
* interactive UI
* Framer Motion where required

Marketing content should remain server-rendered wherever possible.

Dashboard shell can contain interactive client components selectively.

Do not turn the entire application into one giant Client Component.

---

# PERFORMANCE REQUIREMENTS

Performance is a first-class product requirement.

Target:

```text
LCP < 2.0s
INP < 200ms
CLS < 0.1
```

where realistically achievable under normal production conditions.

Prioritize:

* minimal JavaScript
* Server Components
* streaming
* route-level code splitting
* dynamic imports for heavy components
* optimized images
* local/static assets
* no unnecessary dependencies
* stable layouts
* minimal hydration
* efficient list rendering
* memoization only where useful
* no excessive animation
* no giant client-side state tree

---

# PERFORMANCE RULES

Do NOT:

```text
"use client"
```

at the root of every page.

Do NOT import large libraries for simple interactions.

Do NOT use Framer Motion for every element.

Do NOT animate large lists unnecessarily.

Do NOT load analytics charts until needed.

Do NOT render hidden dialogs unnecessarily.

Do NOT fetch the same data independently from many components.

Do NOT duplicate server state in Zustand.

---

# CODE SPLITTING

Use dynamic imports for heavier components such as:

* analytics charts
* audio player
* transcript search
* AI assistant
* command palette if appropriate
* complex calendar
* rich editors

Example concept:

```ts
const MeetingAssistant = dynamic(
  () => import("@/components/meeting/meeting-assistant")
)
```

Do not dynamically import everything.

Use judgment.

---

# IMAGE OPTIMIZATION

Use:

```tsx
next/image
```

where appropriate.

Use:

* correct width/height
* responsive sizes
* priority only for genuinely critical images
* optimized formats

Do not use giant background images unnecessarily.

---

# FONT PERFORMANCE

Use `next/font`.

Prefer:

```text
Geist
Inter
```

or another carefully selected modern sans-serif.

Avoid blocking external font requests.

---

# ACCESSIBILITY

Use semantic HTML.

Every interactive element must be keyboard accessible.

Support:

* keyboard navigation
* focus states
* ARIA labels
* proper headings
* form labels
* reduced motion
* sufficient contrast
* screen-reader-friendly controls

Respect:

```css
prefers-reduced-motion
```

---

# RESPONSIVE DESIGN

Support:

```text
320px
375px
390px
430px
768px
1024px
1280px
1440px
1920px
```

Mobile must not be an afterthought.

---

# MOBILE APPLICATION SHELL

On mobile:

```text
Header

Content

────────────────────────

My Calls
Team
Playlist
Alerts
Deals
```

Use a bottom navigation if appropriate.

Settings/profile can remain inside a menu.

Tables should become cards.

Drawers should become full-screen sheets where appropriate.

---

# DESIGN SYSTEM

Visual direction:

```text
Minimal
Warm
Precise
Confident
Quiet
Intelligent
Professional
```

References for interaction quality:

* Linear
* Notion
* Raycast
* Vercel
* Stripe
* Apple

Do not copy their branding.

---

# COLOR SYSTEM

Use a restrained palette.

Base:

```text
Near-black
Warm white
Neutral gray
```

Accent:

```text
Muted emerald / green
```

Do not use:

* excessive purple
* neon gradients
* glowing AI effects
* cyberpunk styling
* rainbow AI gradients

Support:

```text
Light mode
Dark mode
```

---

# TYPOGRAPHY

Prioritize:

* clear hierarchy
* compact dashboard typography
* generous marketing typography
* readable transcript text
* strong numeric metrics

Do not use oversized typography everywhere.

---

# ICONOGRAPHY

Use Lucide icons.

Icons should:

* communicate meaning
* remain visually consistent
* not replace text where text is needed
* have tooltips where ambiguous

---

# ANIMATION

Use Framer Motion selectively.

Use animation for:

* page transitions
* modal entrance
* drawer entrance
* onboarding transitions
* meeting processing
* capture state
* audio waveform
* number transitions
* hover feedback

Avoid animation overload.

The product should feel fast rather than flashy.

---

# GLOBAL STATES

Every important interaction needs:

## Loading

```text
Skeleton
Spinner where appropriate
Disabled controls
```

## Empty

```text
Icon
Explanation
Primary action
```

## Error

```text
What happened
Why it matters
Retry
```

## Success

```text
Confirmation
Toast
Updated state
```

## Processing

```text
Clear progress
```

---

# TOAST SYSTEM

Use Sonner or the chosen shadcn-compatible toast solution.

Examples:

```text
Calendar connected
```

```text
Meeting shared
```

```text
Action item updated
```

```text
Added to playlist
```

```text
Settings saved
```

---

# MODALS / DRAWERS

Create reusable primitives.

Required:

```text
Share meeting
Start capture
Stop capture
Delete meeting
Edit profile
Connect calendar
Connect Zoom
Add playlist item
Create deal
Edit action
Sign out
```

Use Dialog/Sheet appropriately.

---

# FORMS

Use:

```text
React Hook Form
+
Zod
```

Every form must have:

* labels
* validation
* errors
* loading state
* disabled state
* success state
* keyboard support
* accessible descriptions

Never rely on placeholders as labels.

---

# MOCK DATA

Create realistic fictional data.

Do not use nonsense placeholder content.

Example fictional participants:

```text
Ahmed Khan
Ayesha Malik
Hamza Siddiqui
Sara Ahmed
Usman Raza
Fatima Noor
Ali Hassan
Hira Shah
```

Use fictional companies:

```text
Acme Technologies
Northstar Labs
Vertex Digital
Atlas Properties
Crescent Health
```

Do not imply these are real WID customers.

---

# MOCK MEETINGS

Create different meeting types:

```text
Product Planning
Engineering Sync
Client Discovery
Sales Demo
Weekly 1:1
Customer Research
Design Review
Sprint Planning
Leadership Sync
```

Each should have:

* participants
* transcript
* summary
* decisions
* action items
* questions
* risks
* timestamps
* visibility
* tags

---

# MOCK TRANSCRIPT

Do not use repetitive lorem ipsum.

Example:

```text
Waleed — 01:12

I think we should move the launch
to next Friday.

Sarah — 01:24

That works from the design side.

Waleed — 01:38

Okay, let's make October 15
the official target.
```

Every important AI insight should reference a source segment.

---

# DEAL MOCK DATA

Create realistic fictional sales data.

Example:

```text
Acme Technologies
$25,000
Proposal

Northstar Labs
$12,500
Discovery

Vertex Digital
$40,000
Negotiation
```

Do not create fake logos of real companies.

---

# PLAYLIST MOCK DATA

Create examples such as:

```text
Customer objection
Product insight
Launch decision
Important commitment
Pricing discussion
```

---

# API-READY ARCHITECTURE

The most important engineering requirement:

> **The backend should be a plug-and-play replacement for the mock implementation.**

Do not build UI components around mock-specific assumptions.

Use:

```text
types/
services/
mock-services/
hooks/
components/
```

Architecture:

```text
UI
 ↓
React hooks
 ↓
Service interface
 ↓
Mock implementation
```

Later:

```text
UI
 ↓
React hooks
 ↓
Service interface
 ↓
API implementation
 ↓
Backend
```

The UI should not need to change.

---

# SERVICE EXAMPLE

```ts
interface CalendarService {
  getConnection(): Promise<CalendarConnection>
  connect(): Promise<CalendarConnection>
  disconnect(): Promise<void>
  listEvents(params?: CalendarEventParams): Promise<CalendarEvent[]>
}
```

Mock:

```ts
MockCalendarService
```

Future:

```ts
ApiCalendarService
```

---

# API CLIENT

Create a central API client abstraction.

Example:

```ts
apiClient.get()
apiClient.post()
apiClient.patch()
apiClient.delete()
```

Do not call `fetch()` manually from dozens of components.

Centralize:

* base URL
* headers
* auth
* error handling
* JSON parsing
* request IDs
* timeout handling

The prototype can use a mock adapter.

---

# ERROR CONTRACT

Define a normalized frontend error.

Example:

```ts
interface AppError {
  code: string
  message: string
  details?: unknown
}
```

UI components should not depend on backend-specific error formats.

---

# QUERY HOOKS

Create hooks such as:

```text
useMeetings()
useMeeting()
useTranscript()
useActionItems()
useDeals()
useAlerts()
useCalendar()
useIntegrations()
useProfile()
useSettings()
```

Mutations:

```text
useCreateMeeting()
useUpdateAction()
useShareMeeting()
useConnectCalendar()
useConnectZoom()
```

This makes backend integration straightforward.

---

# URL STATE

Use URL search params for state that should be shareable/bookmarkable.

Examples:

```text
/my-calls?status=ready
/my-calls?search=launch
/team-calls?member=sarah
/deals?stage=proposal
```

Do not store everything in Zustand.

---

# CACHING

Use appropriate caching/revalidation.

Public marketing pages should be highly cacheable.

Authenticated application data should use TanStack Query.

Avoid unnecessary network requests.

---

# SEO

Marketing pages should include:

* metadata
* title
* description
* OpenGraph
* semantic headings
* favicon
* canonical URL where appropriate

Suggested title:

> WID — AI Meeting Intelligence

Suggested description:

> WID turns meetings into clear notes, decisions, action items and searchable knowledge.

---

# SECURITY-READY FRONTEND

Even though this is frontend-only:

* never hardcode secrets
* never expose private API keys
* never assume user authorization in UI alone
* never trust local state for security
* never store sensitive credentials in localStorage
* prepare for authenticated API requests
* treat backend authorization as authoritative

Mock authentication must never encourage insecure patterns.

---

# ENVIRONMENT CONFIGURATION

Use environment variables for future API configuration.

Example:

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_APP_URL
```

Never put secret API keys in `NEXT_PUBLIC_*`.

---

# FOLDER STRUCTURE

Use:

```text
wid/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── features/
│   │   ├── how-it-works/
│   │   ├── pricing/
│   │   ├── about/
│   │   └── contact/
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── onboarding/
│   │   └── page.tsx
│   │
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── my-calls/
│   │   ├── team-calls/
│   │   ├── playlist/
│   │   ├── alerts/
│   │   ├── deals/
│   │   ├── settings/
│   │   └── profile/
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── marketing/
│   ├── auth/
│   ├── onboarding/
│   ├── layout/
│   ├── meetings/
│   ├── transcript/
│   ├── assistant/
│   ├── calls/
│   ├── playlist/
│   ├── alerts/
│   ├── deals/
│   ├── settings/
│   └── profile/
│
├── hooks/
│
├── lib/
│   ├── api/
│   ├── services/
│   ├── utils/
│   └── validation/
│
├── services/
│   ├── interfaces/
│   ├── mock/
│   └── api/
│
├── store/
│
├── mock-data/
│
├── types/
│
├── public/
│
├── package.json
├── components.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

---

# COMPONENT ARCHITECTURE

Do not create giant page components.

Reusable components should include:

```text
MarketingNavbar
MarketingFooter
Hero
ProductPreview
FeatureSection
HowItWorks
Pricing
FAQ
CTA

AppShell
Sidebar
Topbar
MobileNav
CommandPalette
GlobalSearch
NotificationMenu
ProfileMenu

MeetingCard
MeetingList
MeetingFilters
MeetingBrief
DecisionList
ActionItemList
QuestionList
RiskList
MeetingTimeline
Transcript
TranscriptSegment
AudioPlayer
MeetingAssistant
MeetingShareDialog

CalendarConnect
ZoomConnect

OnboardingShell
OnboardingProgress
OnboardingQuestion
EmailTypeSelector
CapturePreferenceSelector
SharingSelector
MeetingFocusSelector
JobFunctionSelector

PlaylistItem
AlertCard

DealCard
DealList
DealTimeline

SettingsSection
IntegrationCard
ProfileForm

EmptyState
ErrorState
LoadingState
Skeleton
ConfirmDialog
```

---

# STATE MANAGEMENT

Use Zustand only for client/UI state.

Stores can include:

```text
useUIStore
useOnboardingStore
useCaptureStore
usePreferencesStore
```

Do not create:

```text
useEverythingStore
```

Do not put server data into Zustand if TanStack Query can handle it.

---

# CAPTURE STORE

The capture UI should have state:

```ts
type CaptureStatus =
  | "idle"
  | "ready"
  | "capturing"
  | "paused"
  | "processing"
  | "transcribing"
  | "understanding"
  | "complete"
  | "failed"
```

Example:

```ts
interface CaptureState {
  status: CaptureStatus
  elapsedSeconds: number
  meetingId?: string
  error?: string
}
```

The actual recorder implementation should later plug into this state machine.

---

# MOCK CAPTURE

For the prototype:

```text
Start capture
 ↓
Timer starts
 ↓
Waveform animates
 ↓
Pause works
 ↓
Resume works
 ↓
Stop
 ↓
Processing animation
 ↓
Meeting becomes ready
```

The prototype must make this feel real.

No actual audio recording is required for the frontend-only version.

---

# REAL BACKEND REPLACEMENT

The future backend should be able to replace:

```text
MockAuthService
MockCalendarService
MockMeetingService
MockTranscriptService
MockAssistantService
MockDealService
MockAlertService
```

with:

```text
ApiAuthService
ApiCalendarService
ApiMeetingService
ApiTranscriptService
ApiAssistantService
ApiDealService
ApiAlertService
```

without changing the majority of UI code.

---

# RESPONSIVE MEETING DETAIL

Desktop:

```text
┌─────────────────────────────────────────────┐
│ Header                                      │
├─────────────────────────┬───────────────────┤
│ Meeting Brief           │ AI Assistant      │
│                         │                   │
│ Decisions               │ Ask meeting...   │
│ Actions                 │                   │
│ Questions               │ Suggested        │
│ Risks                   │ questions         │
│                         │                   │
│ Transcript              │ Meeting info     │
└─────────────────────────┴───────────────────┘
```

Mobile:

```text
Header

Meeting Brief

Decisions
Actions
Questions
Risks

Transcript

[Ask WID]

[Meeting info]
```

---

# EMPTY STATES

Create intentional empty states.

My Calls:

> No meetings yet.
>
> Capture your first meeting and WID will turn it into notes, decisions and action items.

CTA:

> Capture meeting

Team Calls:

> No shared meetings yet.

Playlist:

> Your important moments will appear here.

Alerts:

> You're all caught up.

Deals:

> No deals yet.

---

# ERROR STATES

Examples:

```text
We couldn't load your meetings.

[Try again]
```

```text
Google Calendar connection failed.

Your meetings haven't been changed.

[Try again]
```

```text
Zoom couldn't be connected.

[Try again]
```

Never expose raw backend errors.

---

# LOADING STATES

Use skeletons for:

* meeting list
* meeting detail
* transcript
* deals
* alerts
* profile
* settings

Avoid loading spinners for entire pages when skeletons provide better continuity.

---

# MICRO-INTERACTIONS

Implement:

* button press feedback
* hover states
* selected navigation
* active filters
* copy confirmation
* save indicators
* unsaved changes warning
* keyboard shortcuts
* transcript hover
* timeline hover
* audio progress
* notification badge
* subtle page transitions

Do not animate everything.

---

# DESIGN QUALITY BAR

The UI should feel:

```text
Quiet
Fast
Premium
Dense where useful
Spacious where needed
Intentional
Professional
```

Avoid:

```text
Generic SaaS cards everywhere
Huge gradients
Excessive rounded containers
Random illustrations
AI robot imagery
Excessive shadows
Excessive glassmorphism
```

---

# IMPORTANT UX PRINCIPLES

## Principle 1

Do not make the user read the transcript to understand the meeting.

## Principle 2

Show the important information first.

## Principle 3

Every AI insight should have evidence where possible.

## Principle 4

Manual capture must remain explicit.

## Principle 5

Privacy should be understandable.

## Principle 6

The application should feel fast.

## Principle 7

The user should always know what is happening.

## Principle 8

Never hide processing behind an unexplained spinner.

## Principle 9

Do not overwhelm onboarding.

## Principle 10

Do not create unnecessary configuration.

---

# PERFORMANCE CHECKLIST

Before completion verify:

### Rendering

* Server Components used by default
* Client Components limited
* no unnecessary hydration
* no unnecessary context providers

### Data

* TanStack Query used for server state
* caching configured
* duplicate requests avoided
* mock services isolated

### Bundle

* no unnecessary libraries
* heavy components dynamically loaded when appropriate
* icons imported efficiently

### Images

* next/image
* proper dimensions
* no layout shift

### CSS

* avoid excessive runtime styles
* Tailwind used consistently
* no massive CSS file

### Animation

* transform/opacity preferred
* reduced motion supported
* no layout-heavy animations

### UX

* fast perceived loading
* skeletons
* optimistic updates where appropriate
* proper error recovery

---

# ACCESSIBILITY CHECKLIST

Verify:

* keyboard navigation
* focus visibility
* semantic HTML
* labels
* aria attributes
* accessible dialogs
* accessible dropdowns
* accessible tabs
* accessible tables
* reduced motion
* contrast
* screen-reader descriptions

---

# AUTH / ONBOARDING ROUTE GUARDING

Prepare the application for route protection.

Conceptually:

```text
Unauthenticated
    ↓
/login

Authenticated but onboarding incomplete
    ↓
/onboarding

Authenticated + onboarding complete
    ↓
/my-calls
```

The frontend may mock these states initially.

Do not implement insecure client-only authorization as if it were real security.

---

# MOCK USER

Use a realistic fictional demo account.

Example:

```text
Waleed Ahmed
waleed@wid-demo.com
Engineering
Asia/Karachi
Company email
```

Clearly treat this as demo data.

---

# SAMPLE DASHBOARD

The initial portal should immediately show useful information.

Example:

```text
Good morning, Waleed.

Here's what needs your attention.

────────────────────────────────────

4 action items
2 decisions
1 unresolved question

────────────────────────────────────

RECENT MEETINGS

Product Planning
42 min
Today

Client Discovery
36 min
Yesterday

Engineering Sync
28 min
Yesterday
```

The product should not feel empty after onboarding.

---

# DASHBOARD PERSONALIZATION

Based on job function:

Engineering:

```text
Action items
Decisions
Technical risks
Blockers
```

Sales:

```text
Deals
Customer commitments
Objections
Follow-ups
```

Management:

```text
Team decisions
Blockers
Commitments
Unresolved issues
```

Product:

```text
Customer requirements
Product decisions
Feedback
Priorities
```

Use mock logic for the prototype.

---

# PRIVACY-FIRST COPY

Use clear language.

Good:

> WID won't automatically record your calendar meetings. You choose when to capture.

Good:

> Your meeting is private unless you choose to share it.

Avoid:

> Military-grade security.

Avoid unsupported claims.

---

# PRICING

Create a realistic SaaS pricing page but clearly mark it as illustrative if pricing is not finalized.

Possible structure:

```text
Free
For trying WID

Starter
For individuals

Team
For growing teams

Business
For organizations
```

Do not invent specific pricing unless requested.

Use:

> Pricing shown for product demonstration.

---

# FAQ

Include practical questions:

```text
Does WID automatically record meetings?

Can I choose which meetings to capture?

Does WID work with Google Calendar?

Why does WID need calendar access?

Does WID require Zoom?

Can I keep meeting notes private?

Can I share notes with attendees?

Can I search old meetings?

Can I ask questions about a meeting?

Can I export my notes?

Can I edit AI-generated action items?

What happens if transcription fails?
```

Answers should be concise and honest.

---

# FOOTER

Include:

```text
WID

AI meeting intelligence.

Product
Features
How it works
Pricing

Resources
Help
Documentation
Blog

Company
About
Contact

Legal
Privacy
Terms

© 2026 WID
```

---

# SEO

Add appropriate metadata for every public page.

Examples:

```text
WID — AI Meeting Intelligence
WID Features
How WID Works
WID Pricing
```

Use semantic page structures.

---

# CODE QUALITY

The generated project must:

* compile
* have valid TypeScript
* avoid `any`
* use strict typing
* avoid hydration errors
* use proper imports
* avoid duplicated components
* use reusable utilities
* use meaningful naming
* avoid giant page components
* avoid unnecessary client components
* avoid broken navigation
* avoid dead buttons
* avoid fake loading that never resolves
* avoid TODOs for core functionality

---

# TYPESCRIPT

Use strict TypeScript.

Prefer:

```ts
type
interface
enum-like unions
```

Avoid:

```ts
any
unknown without narrowing
as any
```

Do not suppress errors simply to make the build pass.

---

# SHADCN/UI

Use shadcn/ui where it improves consistency.

Likely components:

```text
Button
Input
Textarea
Label
Card
Badge
Dialog
Drawer
Sheet
DropdownMenu
Command
Select
Tabs
Tooltip
Popover
Calendar
Table
Avatar
Separator
Skeleton
AlertDialog
Accordion
Switch
Checkbox
RadioGroup
Sonner
```

Only install components actually used.

---

# TESTING-READY STRUCTURE

Structure components so they can later be tested.

Important test targets:

```text
Onboarding
Meeting filters
Meeting detail
Action items
Sharing
Calendar connection
Zoom connection
Search
Command palette
Settings
Profile
```

The prototype does not need a full test suite unless requested, but architecture should not make testing difficult.

---

# FINAL PRODUCT QA

Before considering the project complete:

## Marketing

* Landing page works
* Navbar works
* Mobile menu works
* CTA works
* Pricing works
* FAQ works
* Footer works

## Auth

* Google sign-in flow works in mock mode
* Account selection works
* Email type selection works

## Onboarding

* Calendar connection works
* Capture preference works
* Sharing preference works
* Understanding checks work
* Job function works
* Personalization works
* Zoom connection works
* Skip Zoom works
* Completion works

## Portal

* My Calls works
* Team Calls works
* Playlist works
* Alerts works
* Deals works
* Settings works
* Profile works

## Meeting

* Meeting detail works
* Transcript works
* Audio player works in mock mode
* Timeline works
* AI assistant works in mock mode
* Sharing works
* Action items work

## Global

* Search works
* Command palette works
* Notifications work
* Profile menu works
* Theme works
* Responsive navigation works

---

# NO DEAD ENDS

Every major button must have a consequence.

Examples:

```text
Get started
→ authentication

Continue with Google
→ account selection

Connect Calendar
→ connected state

Continue
→ next onboarding step

Skip Zoom
→ portal

Capture meeting
→ capture state

Stop
→ processing

Open meeting
→ meeting detail

Ask WID
→ answer

Jump to source
→ transcript timestamp

Share
→ share dialog

Add to playlist
→ playlist

Action complete
→ completed state
```

---

# MOCK FUNCTIONALITY REQUIREMENT

Although the frontend is not connected to a backend, it must behave as a complete application.

Use:

* local state
* Zustand
* mock services
* mock API responses
* TanStack Query-compatible service hooks
* realistic delays only where useful
* optimistic UI where appropriate

Do not make the application look fake.

---

# BACKEND PLUG-AND-PLAY REQUIREMENT

The most important engineering requirement is:

> **A backend engineer should be able to replace the mock service implementations with real API calls without rebuilding the frontend.**

The frontend should already have:

```text
Typed models
Request models
Response models
Service interfaces
Mock implementations
API client abstraction
Query hooks
Mutation hooks
Error normalization
Loading states
Empty states
Error states
```

The backend should therefore primarily require:

```text
Replace mock implementation
        ↓
Connect API client
        ↓
Keep UI unchanged
```

---

# FUTURE BACKEND CAPABILITIES

The frontend architecture should leave room for:

```text
Authentication
Google OAuth
Google Calendar
Zoom
Meeting capture
Audio upload
Transcription
Speaker diarization
AI summaries
Action extraction
Decision extraction
Semantic search
Meeting RAG
AI assistant
Sharing
Team workspaces
Deals
Notifications
Email
Billing
Analytics
```

Do not implement these backend systems now.

Design the frontend contracts for them.

---

# FUTURE API EXAMPLES

The frontend should conceptually be compatible with APIs such as:

```text
POST /auth/google
GET  /me

GET  /calendar/connection
POST /calendar/connect
GET  /calendar/events

GET  /meetings
GET  /meetings/:id
POST /meetings
PATCH /meetings/:id
DELETE /meetings/:id

GET  /meetings/:id/transcript
GET  /meetings/:id/actions
GET  /meetings/:id/decisions

POST /meetings/:id/ask

GET  /playlist
POST /playlist

GET  /alerts
PATCH /alerts/:id/read

GET  /deals
GET  /deals/:id

GET  /integrations
POST /integrations/:provider/connect

GET  /settings
PATCH /settings
```

These are frontend contract examples, not a requirement to implement a backend.

---

# FINAL DESIGN BENCHMARK

The final result should feel like:

```text
Linear's precision
+
Notion's knowledge model
+
Raycast's speed
+
Fathom's meeting intelligence
+
WID's own identity
```

Do not clone Fathom's UI.

Use the product category as inspiration while creating a distinct visual and interaction system.

---

# MOST IMPORTANT INSTRUCTION

Do not build this as a collection of pretty screens.

Build it as a **coherent meeting intelligence product**.

A user should be able to:

```text
Visit WID
   ↓
Understand the product
   ↓
Sign up with Google
   ↓
Select their Google account
   ↓
Identify company vs personal email
   ↓
Connect Google Calendar
   ↓
Understand that capture is manual
   ↓
Choose meeting sharing preference
   ↓
Choose what WID should understand
   ↓
Select their job function
   ↓
Personalize their account
   ↓
Optionally connect Zoom
   ↓
Enter the portal
   ↓
See upcoming/recent meetings
   ↓
Manually capture a meeting
   ↓
See processing state
   ↓
Open the resulting meeting
   ↓
Read the Meeting Brief
   ↓
Review decisions
   ↓
Review action items
   ↓
Inspect transcript
   ↓
Jump to timestamps
   ↓
Ask WID questions
   ↓
Save important moments
   ↓
Share meeting
   ↓
Track alerts
   ↓
Connect meetings to deals
   ↓
Manage settings/profile
```

There must be no broken links, fake dead-end buttons, missing states or disconnected experiences.

---

# FINAL ENGINEERING STANDARD

The implementation should be something a senior frontend engineer would be comfortable inheriting.

Prioritize:

1. **Correct Next.js architecture**
2. **Server Components by default**
3. **Minimal client-side JavaScript**
4. **Excellent Core Web Vitals**
5. **Typed service boundaries**
6. **Backend-ready API contracts**
7. **Reusable components**
8. **Accessible UI**
9. **Responsive design**
10. **Predictable state management**
11. **Excellent loading/error/empty states**
12. **Fast perceived performance**
13. **Minimal dependencies**
14. **No unnecessary abstraction**
15. **No giant components**
16. **No mock-data leakage into UI components**

---

# DELIVERABLE

Generate the complete project as a series of files using full file paths.

Format:

```text
File: package.json
```

```json
{
  ...
}
```

Then:

```text
File: app/layout.tsx
```

```tsx
...
```

Continue until the required project is complete.

Start with:

1. `package.json`
2. configuration
3. root layout
4. global CSS
5. theme system
6. shared UI
7. marketing components
8. landing page
9. authentication
10. onboarding
11. application shell
12. My Calls
13. Meeting Detail
14. Team Calls
15. Playlist
16. Alerts
17. Deals
18. Settings
19. Profile
20. meeting components
21. transcript components
22. AI assistant
23. service interfaces
24. mock services
25. API client abstraction
26. TanStack Query hooks
27. Zustand stores
28. types
29. mock data
30. utilities
31. README

Prioritize quality and completeness over unnecessary files.

Do not provide pseudocode.

Do not say:

> "Implement similarly."

Actually provide the implementation.

---

# RUNNING INSTRUCTIONS

After generating the project, provide:

## Installation

```bash
npm install
npm run dev
```

## shadcn/ui

Provide the exact initialization and component installation commands required.

## Important notes

Explain that:

* this is initially frontend-focused
* authentication is mocked unless explicitly connected
* Google Calendar is mocked
* Zoom is mocked
* meeting capture is mocked
* AI processing is mocked
* transcription is mocked
* no actual meeting is automatically recorded
* no real Zoom meeting is joined
* no real calendar data is accessed
* no real AI API is required
* service interfaces are intentionally prepared for backend integration
* mock services can later be replaced with real API services
* the UI should not need major restructuring when the backend is connected

---

# FINAL PRODUCT PRINCIPLE

The product should answer one question exceptionally well:

> **"What actually happened in that meeting, and what do I need to do about it?"**

Everything in WID should support that question.

The final benchmark is:

> **If someone lands on WID, they should understand the value within seconds.**

And after signing up:

> **They should be able to reach a useful meeting workspace without confusion.**

And after a meeting:

> **They should not have to read 40 minutes of transcript to understand what matters.**

And from an engineering perspective:

> **The frontend should be fast, typed, modular, accessible, and ready for a real backend to plug in without rewriting the product.**
