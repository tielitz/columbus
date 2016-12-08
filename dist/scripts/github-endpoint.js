'use strict';

angular.module('columbusApp')
    .factory('githubEndpoint', ['$http', '$q', function ($http, $q) {
        /*
         * Service which retrieves the content of a GitHub repository
         */

        return {
            /**
             * Fetches the GitHub repository content as a recursive tree
             *
             * @param  {String} owner     GitHub repository owner
             * @param  {String} repo      GitHub repository
             * @param  {String} sha       Commit SHA
             * @param  {String} directory Regular expression to filter the fetched contents
             * @return {Promise}
             */
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

                    // Initialise an empty container for the fetched information
                    let githubRepositoryContainer = new GithubRepositoryContainer(response.data);

                    // filter the content with the regular expression
                    githubRepositoryContainer.applyFilter(directory);

                    // for all entries still present, fetch their contents
                    let treeEntries =githubRepositoryContainer.getAllEntries();

                    var subDeferreds = [];

                    // Each one must be fetched individually
                    for (let i = 0; i < treeEntries.length; i++) {
                        let entry = treeEntries[i];
                        subDeferreds.push(fetchSource(owner, repo, sha, entry.path));
                    }

                    $q.all(subDeferreds).then(function (data) {
                        data.forEach(a => {
                            // Add file contents to the file in the container
                            githubRepositoryContainer.addSourceForPath(a.path, a.content);
                        });
                        deferred.resolve(githubRepositoryContainer);
                    });
                }, function errorCallback(response) {
                    // whoops
                    console.log('[getTreeRecursively] errorCallback', response);
                    deferred.reject();
                });

                return deferred.promise;
            },
            fetchSource: fetchSource
        };

        /**
         * Retrieves the file contents of a speicific file in the repository
         *
         * @param  {String} owner  GitHub repository owner
         * @param  {String} repo   GitHub repository
         * @param  {String} sha    Commit SHA
         * @param  {String} path   Path of the file which should be fetched
         * @return {String}        Contents of the file
         */
        function fetchSource(owner, repo, sha, path) {
            let url = 'https://api.github.com/repos/'+owner+'/'+repo+'/contents/'+path;
            // Add commit sha if one has been provided
            if (sha !== undefined) {
                url += '?ref='+sha;
            }
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
                } catch (e) { /* I believe  */}

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

/**
 * Container class for the content of a GitHub repository
 */
class GithubRepositoryContainer {
    /**
     * Init with the content of a GitHub repository
     *
     * @param  {Object} data fetched github repository content information
     */
    constructor(data) {
        this.metaData = {
            sha : data.sha,
            url : data.url
        };
        this.tree = data.tree.filter(entry => entry.type === "blob");
    }

    /**
     * Returns all entries in the repository that were not previously filtered
     * @return {Array} All remaining files in the GitHub repository
     */
    getAllEntries() {
        return this.tree;
    }

    /**
     * Adds file contents to a specific file
     *
     * @param {String} path     Path of the file which should be updated
     * @param {[type]} source   Source code of the file
     */
    addSourceForPath(path, source) {
        let i = this.tree.findIndex(a => a.path === path);
        this.tree[i]['source'] = source;

        console.log('[GithubRepositoryContainer] addSourceForPath', path, i);
    }
    /**
     * Applies a regular expression to the tree structure
     *
     * @param  {String} reg  A regular expression
     */
    applyFilter(reg) {
        let filter = new RegExp(reg);
        this.tree = this.tree.filter(a => filter.test(a.path));
    }

    /**
     * Retrieves a specific file at the given path
     *
     * @param  {String} path A specific path
     * @return {Object}      The file at the given path
     */
    getFileAtPath(path) {
        return this.tree.find(a => a.path == path);
    }

    /**
     * Performs some weired refactoring so that I can display the contents in a multi level list
     * Feature was discarded soon afterwards but the rest of the tool depends on the function
     *
     * @return {Array} Converted GitHub content into a multi level list
     */
    getFolderStructure() {
        let structure = [];

        /*
         * Given a file path like: src/components/component.js
         * The output would split it up into src | components | component.js
         */

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
    }
}