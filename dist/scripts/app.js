'use strict';

angular.module('columbusApp', ['ngMaterial'])
    .controller('AppCtrl', function($scope, $window, githubEndpoint) {
        if (angular.isUndefined($window.esprima)) {
            throw new Error('This Application depends on Esprima library - http://esprima.org/');
        }

        $scope.jsContent = '';
        $scope.syntaxContent = '';
        $scope.tokensContent = '';
        $scope.infoBaseContent  = '';
        $scope.modelContent = '';

        $scope.dependencyGraph = '';

        $scope.githubRepositoryContainer = null;
        $scope.githubFolderStructure = null;
        $scope.currentSelectedFile = null;

        $scope.gitHubOwner = 'tielitz'; // 'Mobility-Services-Lab';
        $scope.gitHubRepo = 'todomvc'; // 'TUMitfahrer-WebApp';
        $scope.gitHubSha = 'HEAD';
        $scope.folderToParse = '^examples/react/.*\\.jsx$'; //'^src/components/.*\\.jsx$';
        $scope.loading = false;

        function reset() {
            $scope.jsContent = '';
            $scope.syntaxContent = '';
            $scope.tokensContent = '';
            $scope.infoBaseContent  = '';
            $scope.modelContent = '';
            $scope.dependencyGraph = '';

            $scope.githubRepositoryContainer = null;
            $scope.githubFolderStructure = null;
            $scope.currentSelectedFile = null;
        }

        $scope.parseGithub = function parseGithub() {
            reset();
            $scope.loading = true;

            console.log('[parseGithub] with URL ' + $scope.gitHubOwner + ' ' + $scope.gitHubRepo );
            let githubRepositoryContainer = null;

            githubEndpoint.getTreeRecursively($scope.gitHubOwner, $scope.gitHubRepo, $scope.gitHubSha, $scope.folderToParse)
                .then(function (container) {
                    console.log('[parseGithub] finished parsing', container);
                    $scope.githubRepositoryContainer = container;
                    $scope.githubFolderStructure = container.getFolderStructure();

                    // iterate over all files. Parse ast and extract information grouped by file

                    let astParser = new AstParser($window.esprima);
                    let babelParser = new JsxParser();
                    let fileImportExtractor = new FileImportExtractor();
                    let modelExtractorChain = null;

                    let extractedAstContent = {};
                    let extractedTokenContent = {};
                    let extractedInfoBase = {};
                    let modelGenerator = null;

                    for (let i = 0; i < container.tree.length; i++) {

                        let fileEntry = container.tree[i];

                        console.log('[parseGithub] processing ' + fileEntry.path);
                        let parsedSourceCode = babelParser.transform(fileEntry.source);
                        let ast = astParser.parse(parsedSourceCode);

                        if (ast instanceof ReactAst) {

                            // Postprocessing semantic analyser
                            JsxUniqueIdPostProcessor.process(ast);

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

                        extractedAstContent[fileEntry.path] = ast.getContents();
                        extractedTokenContent[fileEntry.path] = (new TokenParser($window.esprima)).parse(parsedSourceCode);
                        try {
                            extractedInfoBase[fileEntry.path] = modelExtractorChain.apply(ast);
                            extractedInfoBase[fileEntry.path][fileImportExtractor.descriptor()] = fileImportExtractor.extract(ast);
                        } catch (e) {
                            // something went wrong with parsing that file
                            console.warn('Could not parse file ' + fileEntry.path, e);
                        }
                    }
                    $scope.syntaxContent = JSON.stringify(extractedAstContent, null, '\t');
                    $scope.tokensContent = JSON.stringify(extractedTokenContent, null, '\t');
                    $scope.infoBaseContent = JSON.stringify(extractedInfoBase, null, '\t');

                    if (Object.keys(extractedInfoBase).length > 0) {
                        let generatedModel = modelGenerator.generate(extractedInfoBase);
                        $scope.modelContent = JSON.stringify(generatedModel, null, '\t');

                        $scope.dependencyGraph = JSON.stringify(
                            modelGenerator.createDependencyGraphModel(extractedInfoBase)
                            , null, '\t');
                    }

                    // finished with everything
                    $scope.loading = false;
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
;
