const { getDMMF } = require("@prisma/internals");
const path = require("path");
const fs = require("fs");

const schema = fs.readFileSync(path.join(__dirname, "prisma/schema.prisma"), "utf-8");
getDMMF({ prismaSchema: schema }).then(dmmf => {
    const models = dmmf.datamodel.models.map(m => m.name);
    console.log("Models in DMMF:", models.join(", "));
    const demoLinks = dmmf.datamodel.models.find(m => m.name === "DemoLinks");
    if (demoLinks) {
        console.log("DemoLinks fields:", demoLinks.fields.map(f => f.name + ":" + f.type).join(", "));
    } else {
        console.log("DemoLinks NOT found in DMMF!");
    }
}).catch(err => {
    console.error(err);
    process.exit(1);
});
