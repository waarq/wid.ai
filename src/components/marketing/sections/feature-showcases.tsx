import dynamic from "next/dynamic"

import { featureCopy } from "../content/features"
import {
  getAskDemoData,
  getFollowUpData,
  getSmartMomentsData,
} from "../data"
import { ActionsPanel } from "../product/actions-panel"
import { BriefCard } from "../product/brief-card"
import { DecisionHistory } from "../product/decision-history"
import { SearchMemory } from "../product/search-memory"
import { FeatureRow } from "./feature-row"

// Interactive leaves load as separate chunks. They still render on the server.
const SmartMomentsDemo = dynamic(() =>
  import("../product/smart-moments-demo").then((mod) => mod.SmartMomentsDemo),
)
const AskMeetingDemo = dynamic(() =>
  import("../product/ask-meeting-demo").then((mod) => mod.AskMeetingDemo),
)
const FollowUpCard = dynamic(() => import("../product/follow-up-card").then((mod) => mod.FollowUpCard))

type Level = "h2" | "h3"

export function MeetingBriefFeature({ headingAs, space }: { headingAs?: Level; space?: "chapter" | "tight" }) {
  return <FeatureRow copy={featureCopy.brief} visual={<BriefCard />} visualSide="right" headingAs={headingAs} space={space} />
}

export function ActionItemsFeature({ headingAs, space }: { headingAs?: Level; space?: "chapter" | "tight" }) {
  return <FeatureRow copy={featureCopy.actions} visual={<ActionsPanel />} visualSide="left" headingAs={headingAs} space={space} />
}

export function SmartMomentsFeature({ headingAs, space }: { headingAs?: Level; space?: "chapter" | "tight" }) {
  const data = getSmartMomentsData()
  return (
    <FeatureRow
      copy={featureCopy.moments}
      visualSide="right"
      headingAs={headingAs}
      space={space}
      visual={
        <SmartMomentsDemo
          meetingTitle="Product Planning"
          durationLabel={data.durationLabel}
          moments={data.moments}
        />
      }
    />
  )
}

export function AskMeetingFeature({ headingAs, space }: { headingAs?: Level; space?: "chapter" | "tight" }) {
  const data = getAskDemoData()
  return (
    <FeatureRow
      copy={featureCopy.ask}
      visualSide="left"
      headingAs={headingAs}
      space={space}
      visual={<AskMeetingDemo meetingTitle={data.meetingTitle} items={data.items} />}
    />
  )
}

export function SearchFeature({ headingAs, space }: { headingAs?: Level; space?: "chapter" | "tight" }) {
  return <FeatureRow copy={featureCopy.search} visual={<SearchMemory />} visualSide="right" headingAs={headingAs} space={space} />
}

export function HistoryFeature({ headingAs, space }: { headingAs?: Level; space?: "chapter" | "tight" }) {
  return <FeatureRow copy={featureCopy.history} visual={<DecisionHistory />} visualSide="left" headingAs={headingAs} space={space} />
}

export function FollowUpFeature({ headingAs, space }: { headingAs?: Level; space?: "chapter" | "tight" }) {
  const data = getFollowUpData()
  return (
    <FeatureRow
      copy={featureCopy.followUp}
      visualSide="right"
      headingAs={headingAs}
      space={space}
      visual={<FollowUpCard subject={data.subject} body={data.body} recipients={data.recipients} />}
    />
  )
}

/** All seven showcases, used on the features page. */
export function FeatureShowcases() {
  return (
    <>
      <MeetingBriefFeature />
      <ActionItemsFeature />
      <SmartMomentsFeature />
      <AskMeetingFeature />
      <SearchFeature />
      <HistoryFeature />
      <FollowUpFeature />
    </>
  )
}
