'use strict';
angular.module('columbusApp')
    .factory('githubEndpoint', ['$http', '$q', function ($http, $q) {
        return {
            getTreeRecursively: function getTreeRecursively(owner, repo, sha, directory) {
                let url = 'https://api.github.com/repos/'+owner+'/'+repo+'/git/trees/'+sha+'?recursive=1';
                console.log('[getTreeRecursively]', owner, repo, sha, directory, url);

                var deferred = $q.defer();

                $http({
                    method: 'GET',
                    url: url,
                    headers: {
                        'Authorization': 'token 18c2edbf6816fcad281d62ea52a70a11a422ae40'
                    }
                }).then(function successCallback(response) {
                    console.log('[getTreeRecursively] successCallback', response);

                    let githubRepositoryContainer = new GithubRepositoryContainer(response.data);
                    githubRepositoryContainer.applyFilter(directory);
                    let treeEntries =githubRepositoryContainer.getAllEntries();

                    var subDeferreds = [];

                    for (let i = 0; i < treeEntries.length; i++) {
                        let entry = treeEntries[i];
                        subDeferreds.push(fetchSource(owner, repo, entry.path));
                    }

                    $q.all(subDeferreds).then(function (data) {
                        data.forEach(a => {
                            githubRepositoryContainer.addSourceForPath(a.path, a.content);
                        });
                        deferred.resolve(githubRepositoryContainer);
                    });
                }, function errorCallback(response) {
                    console.log('[getTreeRecursively] errorCallback', response);
                    deferred.reject();
                });

                return deferred.promise;
            },
            fetchSource: fetchSource
        };
        function fetchSource(owner, repo, path) {
            let url = 'https://api.github.com/repos/'+owner+'/'+repo+'/contents/'+path;
            console.log('[fetchSource]', url);

            let deferred = $q.defer();

            $http({
                method: 'GET',
                url: url,
                data: '',
                headers: {
                    'Content-Type': 'application/vnd.github.v3.raw',
                    'Authorization': 'token 18c2edbf6816fcad281d62ea52a70a11a422ae40'
                }
            }).then(function successCallback(response) {
                let content = undefined;
                try {
                    content = atob(response.data.content);
                } catch (e) { /* dont care  */}

                deferred.resolve({
                    path: path,
                    content: content
                });
            }, function errorCallback(response) {
                console.log('Could not fetch source', url, response);
                deferred.reject();
            });

            return deferred.promise;
        }
    }]);

class GithubRepositoryContainer {
    constructor(data) {
        this.metaData = {
            sha : data.sha,
            url : data.url
        };
        this.tree = data.tree.filter(entry => entry.type === "blob");
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
        let filter = new RegExp(reg);
        this.tree = this.tree.filter(a => filter.test(a.path));
    }

    getFileAtPath(path) {
        return this.tree.find(a => a.path == path);
    }

    getFolderStructure() {
        let structure = [];

        this.tree.filter(entry => entry.type === "blob").forEach(entry => {
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