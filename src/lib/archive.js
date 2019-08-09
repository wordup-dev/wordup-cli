const fs = require("fs")
const path = require("path")
const fglob = require('fast-glob')
const tar = require("tar")
const tmp = require("tmp")
const ignore = require('ignore')


class Archiver {
    constructor(sourceDirectory, options) {
        this.sourceDirectory = sourceDirectory

        this.options = options || {};
        let postfix = ".tar.gz"
        if (this.options.type === "zip") {
            postfix = ".zip"
        }

        this.tempFile = tmp.fileSync({
            prefix: "wordup-archive-",
            postfix,
        })

        console.log(this.tempFile.name)

        if (!this.options.ignore) {
            this.options.ignore = [];
        }

    }

    cleanup(){
        this.tempFile.removeCallback();
    }

    async listFiles(){
        const ig = ignore().add(['/node_modules']);

        const files =  await fglob('**', {
            dot: true,
            cwd: this.sourceDirectory,
        });

        return ig.filter(files);
    }

    async createArchive(){
        try {
            fs.statSync(this.sourceDirectory);
        } catch (err) {
            if (err.code === "ENOENT") {
                //Could not read directory
              return null;
            }
            throw err;
        }

        const tempFile = this.tempFile

        const allFiles = await this.listFiles();


        return tar.c({
            gzip: true,
            file: tempFile.name,
            cwd: this.sourceDirectory,
            follow: true,
            noDirRecurse: true,
            portable: true,
        },allFiles).then(() => {
            const stats = fs.statSync(tempFile.name);
            return {
                file: tempFile.name,
                stream: fs.createReadStream(tempFile.name),
                manifest: allFiles,
                size: stats.size,
                source: this.sourceDirectory,
            };
        });

    }



}

module.exports = Archiver
