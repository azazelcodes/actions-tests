const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const before = process.env.GITHUB_EVENT_BEFORE || `${process.env.GITHUB_SHA}~1`;
const after = process.env.GITHUB_SHA;

const diff = execSync(`git diff --name-status ${before} ${after}`)
    .toString()
    .trim()
    .split("\n");

diff.forEach(line => {
    if (!line) return;
    const [status, file] = line.split(/\s+/);

    if (!file.endsWith(".json")) return;
    if (file.endsWith(".index.json")) return;
    if (!file.startsWith("quests/")) return;

    let oldName = null;
    let newName = null;

    let issuer = file.split("/")[1]; // FIXME: very stupid, works for now


    if (status !== "A") { // not new creation
        try {
            const oldContent = execSync(`git show ${before}:${file}`).toString();
            oldName = JSON.parse(oldContent).name ?? null;
        } catch {}
    }
    if (status !== "D") { // not deletion
        try {
            const newContent = fs.readFileSync(file, "utf8");
            newName = JSON.parse(newContent).name ?? null;
        } catch {}
    }


    const index = path.join("quests", `${issuer.toLowerCase()}.index.json`);
    let data = {};
    try {
        data = JSON.parse(fs.readFileSync(index, "utf8"));
    } catch {}

    switch (status) {
        case "M": // modified
            if (oldName !== newName) {
                delete data[oldName];
                data[newName] = path.basename(file, ".json");
            }
            break;

        case "D": // deleted
            delete data[oldName];
            break;

        case "A": // created
            data[newName] = path.basename(file, ".json");
            break;

        default: // unknown
            break;
    }

    fs.writeFileSync(index, JSON.stringify(data, null, 2));
});