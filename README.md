# Discord Localization Monitoring

With this repository, we are monitoring latest changes in [Discord app](https://discordapp.com/) localization files.

Git usage allows us to see what exactly has changed in the files since previous revision.

## Why?

That's a long story, but basically before there was a community translation program in which we kinda contributed. Then Discord closed the program, but left proofreaders. Now translations done by vendors, when proofreaders left to speak ideas and report mistakes (if they see one in client). So, to put it simple:

This repository allows people to see how translations change over time by the company and report anything bad they find in changes.

- If you are just an user willing to report mistake, [there's a form for this →]
- Former proofreaders probably know where or whom to report mistakes

### Community program?

Yes, there were a community translation program done through Crowdin. It was… fun (or not). But still would be interesting if only Discord was really working on it.

To learn more about closing, you can read my idea to return it (will not happen, but still):

[Return to community-contributed translations — Discord Feedback](https://support.discordapp.com/hc/en-us/community/posts/360035224931)

## In depth — how does it work?

Pretty badly, I'd say.

- Script opens Discord application site (Canary version)
- Then it gets localization module and queries available locales
- For each of locales then it gets its “messages” and saves to corresponding files (located in `locales`)
- If enabled, `git checkout`, `git add` and `git push` commands are executed

## Worth it?

Maybe, for me it's a good practice on trying to automate things. What does not worth anything is doing this manually.

---

Please note that files placed in `locales` directory is a property of Discord Inc.