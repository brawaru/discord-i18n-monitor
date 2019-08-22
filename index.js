// Initializing Puppeter

const puppeter = require("puppeteer");

const { promises: fs } = require("fs");

const configuration = {
    branch: process.env["DISCORD_BRANCH"] || "canary",
    context: process.env["DISCORD_CONTEXT"] || "client", 
    autoCommit: process.env["DISCORD_AUTOCOMMIT"] === "1" ? true : false
};

(async () => {
    console.log("Initializing browser view");

    const browser = await puppeter.launch();

    const tab = await browser.newPage();

    console.log("Navigating to Discord application page");

    {
        let url = configuration.branch === "stable"
            ? "https://discordapp.com/"
            : `https://${configuration.branch}.discordapp.com/`;

        if (configuration.context === "client") url += "login";

        await tab.goto(url, { waitUntil: "networkidle2" });
    }

    console.log("Intruding into Webpack");

    const intruderPushed = await tab.evaluate(() => {
        let localesModule = window.__localesModule;

        if (localesModule === undefined) {
            let webpackModules = window.__webpackModules;
    
            if (webpackModules === undefined) {
                console.log("[DDI] Intruding and exposing Webpack modules...");
    
                webpackModules = (() => {
                    // Intruder pushes itself to the Webpack chunks to get inside context
                    const moduleName = 'DNIntruder';
    
                    let webpackGetModule;
    
                    window.webpackJsonp.push([
                        [], {
                            [moduleName]: (module, _, getModule) => {
                                // Intruder's code, it should expose us getModule function
    
                                webpackGetModule = getModule;
    
                                module.exports = {};
                            }
                        },
                        [[moduleName]]
                    ]);
    
                    return webpackGetModule.c;
                })();
    
                Object.defineProperty(window, "__webpackModules", {
                    value: webpackModules
                });
            }

            function findChunk(predicate) {
                for (const key in webpackModules) {
                    const exported = webpackModules[key].exports;
    
                    if (exported.__esModule && exported.default && predicate(exported.default)) {
                        return exported.default;
                    }
    
                    if (exported && predicate(exported)) return exported;
                }
            }
    
            console.log("[DDI] Attempting to find localization module...")
    
            localesModule = findChunk(
                (obj) => obj.getLanguages != null && obj._getMessages != null
            );
    
            if (localesModule == null) {
                console.error("[DDI] Unable to find loaded localization module - are we using Discord?");
    
                return false;
            }
    
            Object.defineProperty(window, "__localesModule", {
                value: localesModule
            });

            return true;
        }
    });

    if (!intruderPushed) {
        console.error("Unable to expose localization module, was Discord updated or is not available?");

        throw new Error("Failed to set intruder in place");
    }

    console.log("Intruder in place, commanding it to query list of locales...");

    const locales = await tab.evaluate(() => window.__localesModule.getLanguages());

    const localesCount = locales.length;

    console.log(`${localesCount} locales available. Extraction...`);

    const saveContext = configuration.context === "site" ? "site" : "client";

    let files = [];

    for (let i = 0; i < localesCount; i++) {
        const { code, englishName, enabled } = locales[i];

        console.log(`Extracting ${code} (${englishName})`);

        const id = `isr${Math.floor(Math.random() * 100000)}`;

        if (!enabled) {
            console.log("  Is disabled - skipping");

            continue;
        }

        console.log("  Commanding to extract");

        await tab.evaluate(
            `(async () => {
    let readyState = [false];

    Object.defineProperty(window, "${id}", {
        value: () => {
            if (readyState[0]) delete window["${id}"];

            return readyState;
        },
        configurable: true
    });

    try {
        const locale = await window.__localesModule._getMessages("${code}");

        readyState = [true, JSON.stringify(locale, null, "\t")];
    } catch (err) {
        readyState = [true, 0];
    }
})()`
        );

        console.log("  Awaiting for command to complete...");

        let commandResult = await (new Promise((res, rej) => {
            let iterationsLeft = 100;

            let iterationInterval = setInterval(async () => {
                if (--iterationsLeft === -1) {
                    clearInterval(iterationInterval);

                    return rej("Timed out");
                }

                const commandQuery = await tab.evaluate(`window.${id}()`);

                if (commandQuery[0]) {
                    clearInterval(iterationInterval);

                    return res(commandQuery[1]);
                }

            }, 50);
        }));

        const pathPrefix = `./locales/${saveContext}/`;

        try {
            await fs.mkdir(pathPrefix, { recursive: true });
        } catch (err) {
            console.warn(err);
        }

        if (commandResult !== 0) {
            console.log("  Complete. Saving...");

            const fileName = `${pathPrefix}/${code}.json`;

            await fs.writeFile(fileName, commandResult, { encoding: "utf8" });

            files.push([code, fileName]);
        } else {
            console.warn("  Cannot get locale file - probably Discord's fault");
        }
    }

    if (configuration.autoCommit) await (require("./commiter"))(files, configuration.context);

    console.log("Complete. Bye");

    process.exit(0);
})();