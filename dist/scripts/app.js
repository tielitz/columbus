'use strict';

angular.module('columbusApp', ['ngMaterial'])
    .controller('AppCtrl', function($scope,$window) {

        if (angular.isUndefined($window.esprima)) {
            throw new Error('This Application depends on Esprima library - http://esprima.org/');
        }

        $scope.jsContent = '';

        $scope.syntaxContent = '';
        $scope.tokensContent = '';
        $scope.modelContent  = '';

        $scope.extractModel = function extractModel() {
            console.log('extracting the model');

            let jsxParser = new JsxParser();
            let astParser = new AstParser($window.esprima);

            let parsedJsxCode = jsxParser.transform($scope.jsContent);
            let ast = astParser.parseReact(parsedJsxCode);

            $scope.syntaxContent = ast.asJson();
            $scope.tokensContent = JSON.stringify((new TokenParser($window.esprima)).parse(parsedJsxCode), null, '\t');

            let modelExtractorChain = new ModelExtractorChain();
            let extractedModel = modelExtractorChain.apply(ast);

            $scope.modelContent = JSON.stringify(extractedModel, null, '\t');
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
                editor.setOption("maxLines", 50);

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

                    let dependencyGraph = JSON.parse(newValue).ComponentDependencyExtractor;
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
