'use strict';

angular.module('columbusApp', ['ngMaterial'])
    .factory('githubEndpoint', ['$http', '$q', function ($http, $q) {
        return {
            getTreeRecursively: function getTreeRecursively(owner, repo, sha) {
                let url = 'https://api.github.com/repos/'+owner+'/'+repo+'/git/trees/'+sha+'?recursive=1';
                console.log('[getTreeRecursively]', owner, repo, sha, url);

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
                deferred.resolve({
                    path: path,
                    content: atob(response.data.content)
                });
            }, function errorCallback(response) {
                console.log('Could not fetch source', url, response);
                deferred.reject();
            });

            return deferred.promise;
        }
    }])
    .controller('AppCtrl', function($scope, $window, githubEndpoint) {

        if (angular.isUndefined($window.esprima)) {
            throw new Error('This Application depends on Esprima library - http://esprima.org/');
        }

        $scope.jsContent = '';
        $scope.syntaxContent = '';
        $scope.tokensContent = '';
        $scope.infoBaseContent  = '';
        $scope.modelContent = '';
        $scope.framework = 'React';

        $scope.githubRepositoryContainer = null;
        $scope.gitHubOwner = 'tielitz';
        $scope.gitHubRepo = 'columbus-react-example';
        $scope.gitHubSha = 'HEAD';

        $scope.extractModel = function extractModel() {
            console.log('extracting the model');

            try {

                let astParser = new AstParser($window.esprima);
                let babelParser = null;

                let ast = null;
                let parsedSourceCode = null;

                let modelExtractorChain = null;
                let modelGenerator = null;

                switch ($scope.framework) {
                    case 'React':
                        babelParser = new JsxParser();
                        parsedSourceCode = babelParser.transform($scope.jsContent);
                        ast = astParser.parseReact(parsedSourceCode);

                        modelExtractorChain = new ReactModelExtractorChain();
                        modelGenerator = new ReactModelGenerator();

                        break;

                    case 'Polymer':
                        babelParser = new BabelParser();
                        parsedSourceCode = babelParser.transform($scope.jsContent);
                        ast = astParser.parsePolymer(parsedSourceCode);

                        modelExtractorChain = new PolymerModelExtractorChain();
                        modelGenerator = new PolymerModelGenerator();

                        break;

                    case 'Angular':
                        babelParser = new BabelParser();
                        parsedSourceCode = babelParser.transform($scope.jsContent);
                        ast = astParser.parseAngular(parsedSourceCode);

                        modelExtractorChain = new AngularModelExtractorChain();
                        modelGenerator = new AngularModelGenerator();

                        break;
                }

                $scope.syntaxContent = ast.asJson();
                $scope.tokensContent = JSON.stringify((new TokenParser($window.esprima)).parse(parsedSourceCode), null, '\t');

                let extractedInfoBase = modelExtractorChain.apply(ast);

                $scope.infoBaseContent = JSON.stringify(extractedInfoBase, null, '\t');

                let generatedModel = modelGenerator.generate(extractedInfoBase);

                $scope.modelContent = JSON.stringify(generatedModel, null, '\t');

            } catch (err) {
                console.log(err);
                alert('Error ' + err);
                throw err;
            }
        }

        $scope.parseGithub = function parseGithub() {
            console.log('[parseGithub] with URL ' + $scope.gitHubOwner + ' ' + $scope.gitHubRepo );
            let githubRepositoryContainer = null;

            githubEndpoint.getTreeRecursively($scope.gitHubOwner, $scope.gitHubRepo, $scope.gitHubSha)
                .then(function (container) {
                    console.log('[parseGithub] finished parsing', container);
                    $scope.githubRepositoryContainer = container;

                    // iterate over all files. Parse ast and extract information grouped by file

                    // TODO: ONLY REACT AT THE MOMENT
                    let astParser = new AstParser($window.esprima);
                    let babelParser = new JsxParser();
                    let fileImportExtractor = new FileImportExtractor();
                    let modelExtractorChain = null;

                    let extractedInfoBase = {};
                    let modelGenerator = null;

                    for (let i = 0; i < container.tree.length; i++) {

                        let fileEntry = container.tree[i];

                        console.log('[parseGithub] processing ' + fileEntry.path);
                        let parsedSourceCode = babelParser.transform(fileEntry.source);
                        let ast = astParser.parse(parsedSourceCode);

                        if (ast instanceof ReactAst) {
                            modelExtractorChain = new ReactModelExtractorChain();
                            modelGenerator = new ReactModelGenerator();
                        }

                        if (ast instanceof AngularAst) {
                            modelExtractorChain = new AngularModelExtractorChain();
                            modelGenerator = new AngularModelGenerator();
                        }

                        if (ast instanceof PolymerAst) {
                            modelExtractorChain = new PolymerModelExtractorChain();
                            modelGenerator = new PolymerModelGenerator();
                        }

                        extractedInfoBase[fileEntry.path] = modelExtractorChain.apply(ast);
                        extractedInfoBase[fileEntry.path][fileImportExtractor.descriptor()] = fileImportExtractor.extract(ast);
                    }
                    $scope.infoBaseContent = JSON.stringify(extractedInfoBase, null, '\t');

                    let generatedModel = modelGenerator.generate(extractedInfoBase);
                    $scope.modelContent = JSON.stringify(generatedModel, null, '\t');

                });
        }

    })
    .directive('editor', ['$window','$timeout', function ($window,$timeout) {

        if (angular.isUndefined($window.ace)) {
            throw new Error('This directive depends on Ace Editor - https://github.com/ajaxorg/ace');
        }

        return {
            restrict: 'E',
            scope: {
                type: '@',
                readonly: '@',
                content: '='
            },
            link: function (scope, elem, attrs) {
                var node = elem[0];

                var mode ='';
                switch (scope.type) {
                    case 'json':
                        mode = 'ace/mode/json';
                        break;
                    case 'javascript':
                        mode = 'ace/mode/javascript';
                        break;
                    default:
                        mode = 'ace/mode/text';
                }


                //Define styles
                node.style.display='block';
                node.style.margin ='10px';


                var editor = $window.ace.edit(node);
                editor.session.setMode(mode);
                editor.$blockScrolling = Infinity;
                editor.setAutoScrollEditorIntoView(true);
                editor.setOption("minLines", 5);
                editor.setOption("maxLines", 35);

                if (mode === 'ace/mode/json') {
                    editor.setOption('tabSize', 2);
                }

                if (scope.readonly !== undefined) {
                    editor.setReadOnly(true);
                }

                // disables syntax checker
                editor.getSession().setUseWorker(false);

                //Watch 'content' and update content whenever it changes
                scope.$watch('content', function(newValue, oldValue) {
                    // only update the contents if it is different
                    // fixes the bug that the curser jumpes at the
                    // end of the editor after each key stroke
                    if (editor.getValue() !== newValue) {
                        editor.setValue(newValue);
                        editor.clearSelection();
                    }
                }, true);


                editor.on("change", function(e) {
                    $timeout(function() {
                        scope.content = editor.getValue();
                    });

                });

            }
        };
    }])
    .directive('dependencyGraph', [function () {

        if (angular.isUndefined(d3)) {
            throw new Error('This directive depends on D3 JS Editor - https://d3js.org/');
        }

        if (angular.isUndefined(cola)) {
            throw new Error('This directive depends on D3 JS Editor - http://marvl.infotech.monash.edu/webcola/index.html');
        }

        return {
            restrict: 'E',
            scope: {
                content: '=',
                width: '@',
                height: '@',
            },
            link: function (scope, elem, attrs) {

                scope.$watch('content', function (newValue, oldValue) {
                    if (newValue === undefined || newValue === '') {
                        return;
                    }

                    let dependencyGraph = JSON.parse(newValue).ReactComponentDependencyExtractor;
                    console.log('[DependencyGraph] redraw with val', dependencyGraph);

                    let nodes = Object.keys(dependencyGraph).map(a => {
                        return {name:a, width:300, height:40};
                    });

                    let links = [];
                    for (let key in dependencyGraph) {
                        // key has dependency on entries
                        let indexKey = nodes.findIndex(a => a.name === key);

                        for (let entry of dependencyGraph[key]) {
                            let indexEntry = nodes.findIndex(a => a.name === entry);

                            // Check if the node exists
                            // if not, add it to the dependency graph at the bottom
                            if (indexEntry === -1) {
                                nodes.push({name:entry, width:300, height:40});
                                indexEntry = nodes.length-1;
                            }

                            links.push({source:indexKey, target:indexEntry});
                        }
                    }
                    drawGraph(nodes, links);
                }, true);

                /**
                 * Method taken from http://marvl.infotech.monash.edu/webcola/examples/smallnonoverlappinggraph.html
                 * @param  {array} nodes [description]
                 * @param  {array} links [description]
                 */
                var drawGraph = function drawGraph(nodes, links) {

                    let width = scope.width;
                    let height= scope.height;

                    let color = d3.scale.category20();

                    let localCola = cola.d3adaptor()
                        .linkDistance(200)
                        .avoidOverlaps(true)
                        .size([width, height]);

                    // remove the svg if it already exists
                    d3.select("dependency-graph").select("svg").remove();

                    let svg = d3.select("dependency-graph").append("svg")
                        .attr("width", width)
                        .attr("height", height);

                    let graph = {
                        nodes:[
                          {name:"AdvancedHelloWorld", width:300, height:50},
                          {name:"HelloWorld", width:300, height:50}
                        ],
                        links:[
                          {source:0, target:1},
                        ]
                    };

                    localCola
                        .nodes(nodes)
                        .links(links)
                        .start();

                        // define arrow markers for graph links
                    svg.append('svg:defs').append('svg:marker')
                        .attr('id', 'end-arrow')
                        .attr('viewBox', '0 -5 10 10')
                        .attr('refX', 18)
                        .attr('markerWidth', 10)
                        .attr('markerHeight', 10)
                        .attr('orient', 'auto')
                        .append('svg:path')
                        .attr('d', 'M0,-5L10,0L0,5')
                        .attr('fill', '#000');

                    let link = svg.selectAll(".link")
                        .data(links)
                        .enter().append("line")
                        .attr("class", "link");

                    let node = svg.selectAll(".node")
                        .data(nodes)
                        .enter().append("rect")
                        .attr("class", "node")
                        .attr("width", function (d) { return d.width; })
                        .attr("height", function (d) { return d.height; })
                        .attr("rx", 5).attr("ry", 5)
                        .style("fill", function (d) { return color(1); })
                        .call(localCola.drag);

                    let label = svg.selectAll(".label")
                        .data(nodes)
                        .enter().append("text")
                        .attr("class", "label")
                        .text(function (d) { return d.name; })
                        .call(localCola.drag);

                    node.append("title")
                        .text(function (d) { return d.name; });

                    localCola.on("tick", function () {
                        link.attr("x1", function (d) { return d.source.x; })
                            .attr("y1", function (d) { return d.source.y; })
                            .attr("x2", function (d) { return d.target.x; })
                            .attr("y2", function (d) { return d.target.y; });

                        node.attr("x", function (d) { return d.x - d.width / 2; })
                            .attr("y", function (d) { return d.y - d.height / 2; });

                        label.attr("x", function (d) { return d.x; })
                             .attr("y", function (d) {
                                 var h = this.getBBox().height;
                                 return d.y + h/4;
                             });
                    });
                } //drawGraph
            }
        }
    }]);
