const { spawn } = require("child-process-promise");

/**
 * Gets current branch name
 * @returns {string} Current branch name
 */
function getCurrentBranch() {
    return new Promise(async (resolve) => {
        const command = spawn("git", ["rev-parse", "--abbrev-ref", "HEAD"]);

        command.childProcess.stdout.on("data", (data) => resolve(data.toString().trim()));

        try {
            await command;
        } catch (err) {
            resolve(null);
        }
    });
}

/**
 * Parses revision
 * @param {string} revName Object name to parse
 * @returns {string} Parsed revision?
 */
function parseRev(revName) {
    return new Promise(async (resolve) => {
        const command = spawn("git", ["rev-parse", "--quiet", "--verify", revName]);

        command.childProcess.stdout.on("data", (data) => resolve(data.toString().trim()));

        try {
            await command;
        } catch (err) {
            resolve(null);
        }
    });
}

/**
 * Checks out to the branch
 * @param {string} branchName Branch name
 */
async function checkout(branchName) {
    // It has no sence to checkout onto branch we're in

    const currentBranch = await getCurrentBranch();

    if (currentBranch !== branchName) {
        console.log("Checking out...");

        const args = ["checkout", branchName];

        { // If branch does not exist we need to create it
            const revision = await parseRev(branchName);

            if (revision === null) args.splice(1, 0, "-b");
        }

        let checkedOut = true;

        {
            const checkingOut = spawn(`git`, args).then((result) => {
                console.info(`Checked out to "${branchName}"!`);
            });

            let errOutput = "";

            checkingOut.childProcess.stderr.on("data", (data) => errOutput += data);

            checkingOut.catch(() => {
                console.error(errOutput);

                checkedOut = false;
            });

            await checkingOut;
        }

        if (!checkedOut) throw new Error("Checkout failed");
    }
}

/**
 * Creates a commit
 * @param {string} message Commit message
 * @returns {boolean} Whether commit was created or not
 */
async function createCommit(message) {
    const commit = spawn(`git`, ["commit", "-m", message]);

    let output = "";
    let errOutput = "";

    commit.childProcess.stdout.on("data", (data) => output += data);
    commit.childProcess.stderr.on("data", (data) => errOutput += data);

    let safeError = true;

    commit.catch(() => {
        if (output.includes("no changes added to commit")) {
            return console.log("  There were no changes. Commit creation skipped!");
        }

        console.error(`Commit creation failed.\n${output}`);

        safeError = false;
    });

    try {
        await commit;

        return true;
    } catch (err) {
        // Some errors are safe to skip, such as when there were no changes...
        if (!safeError) {
            console.log(output);
            console.error(errOutput);

            throw err;
        }

        return false;
    }
}

async function addFile(fileName) {
    await spawn(`git`, ["add", fileName]);
}

async function runCommiter(files) {
    const date = new Date();

    const branchName = `update/${date.getDate() + 1}.${date.getMonth() + 1}.${date.getFullYear() - 2000}`;

    await checkout(branchName);

    const currentDate = new Intl.DateTimeFormat('ru-RU', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);

    let changes = false;

    for (let i = 0, l = files.length; i < l; i++) {
        const [code, fileName] = files[i];

        console.log(`Commiting ${code} (${fileName})...`);

        await addFile(fileName);

        console.log(`  File ${fileName} added. Is it?`)

        const commitCreated = await createCommit(`:rocket: Revision "${code}" as of ${currentDate}`);

        if (commitCreated) {
            console.log("  Commit created");

            changes = true;
        }
    }

    if (changes) console.log("There were commits created. Don't forget to push!");
}

module.exports = runCommiter;