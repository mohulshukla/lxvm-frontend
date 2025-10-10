This is a web application which enables prediction market resoltuion via live sharing with a link. I should be able to deploy this application and create a shareable link where other users sign in with their Metamask wallet (using RainbowKit).

Once users sign in with their wallet, they are granted access to a poll where they vote on the outcome of a prediction market. The prediction market should be created by me (the admin) and I should be able to do this on the UI before hand. Once I choose to "create market" there shouuld be a link created that allows for the sharing of this to whoever has access to this link. The "voters" are all the people who receive this link and are able to the see the prediction market question, description, and details I have created. On the admin side of things I should be able to, in real-time, see the voters results as they submit evidence and their votes.

When the voters choose to vote, there is a text box that asks them "Yes" or "No", and they vote with a confidence level between 0 to 1. 0 means they think the event for sure will not happen, 1 means that they definitely think it will with absolute certainty (the user can enter any float in the middle)

While the voting period is going on there should be a graph that is created with interconnected nodes. Green nodes signify as Yes and red nodes a No, and their brightness is a gradient based on how confident they were. The admin can choose to end the voting period at any time, in which case visuals depicting all the voter summaries are shown.

The certainty of the users should be taken into account. If the total weighted sum of the voters predictions is less than 0.1 (they are strongly leaning no), or more than 0.9 (strongly learning yes), then the prediction market is automatically resolved.

Otherwise an evidence review will happen, and this can be scoped out later. 