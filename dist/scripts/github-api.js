'use strict';

class GithubRepositoryContainer {
    constructor(data) {
        this.metaData = {
            sha : data.sha,
            url : data.url
        };
        this.tree = data.tree;
    }

    getAllEntries() {
        return this.tree;
    }

    addSourceToEntry(i, source) {
        this.tree[i]['source'] = source;
    }

    addSourceForPath(path, source) {
        let i = this.tree.findIndex(a => a.path === path);
        this.tree[i]['source'] = source;

        console.log('[GithubRepositoryContainer] addSourceForPath', path, i);
    }
    applyFilter(reg) {
        let filter = new RegExp(reg, "gim");;
        this.tree = this.tree.filter(a => filter.test(a.path));
    }

    getFileAtPath(path) {
        return this.tree.find(a => a.path == path);
    }

    getFolderStructure() {
        let structure = [];

        this.tree.forEach(entry => {
            let parts = entry.path.split("/");

            let current = structure;
            for (let i = 0; i < parts.length; i++) {

                if (i == parts.length-1) {
                    // last element
                    current.push({
                        name: parts[i],
                        path: entry.path,
                    });
                    break;
                }

                let searchIndex = current.findIndex(a => a.name === parts[i]);

                if (searchIndex >= 0) {
                    // we found the index
                    current = current[searchIndex].children;
                } else {
                    // doesnt exist yet
                    current.push({name: parts[i], children: []});

                    // we continue with the children
                    current = current[current.length-1].children;
                }
            }
        });
        console.log('[getFolderStructure2] ',structure);
        return structure;
        return JSON.stringify(structure, null, '\t');
    }
}
