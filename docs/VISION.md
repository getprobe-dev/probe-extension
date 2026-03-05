# PR Sidekick

## The Problem

As a developer I often struggle with reviewing other developers’ pull requests. Especially the big ones. It just so happens that, when working at a startup it is inevitable to come across those kinds. In fact it is just another Tuesday to encounter a 100 file change PR. It can be intimidating for anyone, not just me.

I often find myself looking at the change that was made and ask myself these questions:
1. Interesting, why did the dev had to resort to making this change?
2. Wow, I did not know we had something like this. When was this added again, and in what circumstances?
3. Is this the best way to write this? My spider senses are tingling! I swear I saw we tackled something similar elsewhere but differently. Did the developer take that into consideration?
4. I don’t get it. What does this do again?
5. What is the context of this change? The PR description is an alphabet soup that really doesn’t tell me why we’re doing what we’re doing.
6. Does this work? Did the devs try out X scenario?
7. And a lot more…

I guess I felt the need to “chat” with the pull request. Before I reach out to the developer and bother them with my silly questions. Well it is good to have those conversations regardless, but it is in our best interests for both the parties when they come prepared.

## The Solution

If I validate this problem, I think there are several ways to approach it.

The simplest way to solve is to have a chat pane on the right in GitHub changes page. The developer can chat with the PR. The sidekick will just take the diff and the PR description into context and try and answer.

Taking that one notch higher, the developer can click on any file that was changed to chat with hyper localized context. Even better, chat with a few lines of code that were modified.

Even better, based on the conversation, the developer can ask the sidekick to leave comments/suggestions.

Even better, the chat can be between the sidekick and the author of the PR, and all the reviewers. They can chip-in anytime and have an entire conversation right there in the PR.

So context is king. Code is available in the repo/branch already for the sidekick to inspect while answering questions, instead of just relying on the diff.

It can be lot more! Let’s say the developer used Cursor or Claude Code to develop this feature. We get a lot of context from that chat conversation history! 

Reviewer: Why did the developer take this approach?
Sidekick: While developing, the developer was presented with two options in the planning phase. The developer said that they would go with option A because XYZ reason.
Reviewer: okay that makes sense/that doesn’t sound right. The developer chose the wrong path.

This will also inform the Cursor rules and SKILL.md files as a closed loop so that this mistake isn’t repeated next time.

This can be like a browser extension.

I also think getting context from previous closed PRs that touched the same files can be helpful. And bringing in the developer that was responsible for writing the original code can be tagged in the conversation.

For the context of Pinkfish, we already are storing plan files in the auto dev repo. They serve only one use currently— to cross check implementation after Cursor is done, and when the reviewer initiates a review using the PR review file, it is cross referenced. It can be used in the context as well. Coupled with the actual conversation with Cursor is gold.

Actual conversation with Cursor also reveals the level of deliberation the developer has spent in thinking about the problem, that can be used as an evaluation mechanism of the developer themselves, and we can grade the PR on deliberation while building. It is kinda vague I know, just an idea.

The suggested fixes become a lot more grounded than just suggestions. The reviewer is actually helping the author get the PR out, and can transform into a co-author if they decided to commit.

Maybe the author while responding to the chat, can then and there itself spawn a background agent task to cursor or claude code to address the reviewer’s suggestion. Rather than take it to their dev environment manually.

An advanced feature could be traversing the developer’s journey through all the commits and really understand how the developer arrived to where they arrived. This is corollary to the chat conversation history in Cursor, but a lot more grounded in reality.

Now, as a reviewer I not only just ask questions. I test it too. This take us into another tangent, but essentially I want the reviewer to be able to spin up the exact environment the developer had while developing, as if they are testing on their computer.

Maybe we don’t need to spin up an entire environment, maybe we can start simple. Maybe it is an API that the developer wrote in the PR, maybe we can test the endpoint. There are unit and integration tests that serve the same purpose, so I am not terribly worried about having this feature. As a reviewer, I would rather test the functionality in a real environment than just trying out cURL calls. That helps with pure frontend changes as well.

Maybe the sidekick performs smoke tests for you as a reviewer. So that you wouldn’t have to do that manually.

With the advent of bug bots, and automated  LLM based smoke tests products in the market, do you see developers still spending time reviewing. Yes. Nothing beats a human review. AI-assisted PR review is the best solution.

I often would want to review PRs from my mobile phone, it is absolutely hell doing so on the GitHub app. Don’t get me wrong; they have a beautiful UI, but it’s simply not the best to view diffs in a small form factor. I wish there was something that made it easier for me to consume and make devices/ask questions in the app itself.

Just like developing has patterns that can be captured in SKILL files, reviewing also has patterns— individual and as a team. I have personally noticed this. Maybe we can automatically capture those patterns, and ultimately create a REVIEW.md for an org.

Reviewer has a shared responsibility with the developer. It cannot be just left to AI bots to find bugs. In fact with the advent of AI coding it makes it more and more easier to develop and more and more important to review. In fact the developer is the first reviewer. The more the eyes the better.

I sometimes see my reviewer feel strongly about something. Like when I created a new component that already exists, but is only 80% alike. It needs to be extended in order to fit my use case. In those cases, my reviewer sometimes leaves a pretty detailed comment or simply commits that change by becoming a co-author. I propose a midway solution to this. Why not the reviewer chat with the sidekick and delegate that to the sidekick to do that commit? A commit contributed by the reviewer through sidekick. Or a proposed commit, that the author can check and click yes or no 

In the side panel, we can intelligent prompt starter bubbles

Users can add their own API Keys to make it free. Else use my Api key for monthly subscription 