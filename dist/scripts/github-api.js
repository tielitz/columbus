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
}
