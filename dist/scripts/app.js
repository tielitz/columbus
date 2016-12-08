'use strict';

angular.module('columbusApp', ['ngMaterial'])
    .controller('AppCtrl', function($scope, $window, githubEndpoint) {
        if (angular.isUndefined($window.esprima)) {
            throw new Error('This Application depends on Esprima library - http://esprima.org/');
        }

        // Contents of the output tab on the right
        $scope.syntaxContent = '';
        $scope.tokensContent = '';
        $scope.infoBaseContent  = '';
        $scope.dependencyGraph = '';
        $scope.modelContent = '';

        // Fetched contents of the GitHub repository
        $scope.githubRepositoryContainer = null;
        $scope.githubFolderStructure = null;

        // Selected file in the file explorer tab
        $scope.currentSelectedFile = null;

        // Information about the GitHub repository
        $scope.gitHubOwner = 'tielitz'; // 'Mobility-Services-Lab';
        $scope.gitHubRepo = 'columbus-react-example'; // 'TUMitfahrer-WebApp';
        $scope.gitHubSha = 'HEAD';
        $scope.folderToParse = '^components/.*\\.jsx$'; //'^src/components/.*\\.jsx$';

        // Shows the loading animation
        $scope.loading = false;

        // Contains a list o all parsing errors that occured in the last executiion
        $scope.parsingErrors = [];

        /**
         * Resets the input to the defaut values
         */
        function reset() {
            $scope.syntaxContent = '';
            $scope.tokensContent = '';
            $scope.infoBaseContent  = '';
            $scope.modelContent = '';
            $scope.dependencyGraph = '';

            $scope.githubRepositoryContainer = null;
            $scope.githubFolderStructure = null;
            $scope.currentSelectedFile = null;

            $scope.parsingErrors = [];
        }

        /**
         * Adds another entry to the parsingErrors which are displayed in the model tab
         * @param {String}           _msg  Message to display
         * @param {String|undefined} _type Severity, can be warn or error
         */
        function addOutputLog(_msg, _type) {
            console.log('addOutputLog', _msg, _type);
            $scope.parsingErrors.push({
                msg: _msg,
                type: _type !== undefined ? _type : 'warn'
            });
        }

        /**
         * Main method that controls the whole extraction process from start to finish
         */
        $scope.parseGithub = function parseGithub() {
            reset();
            $scope.loading = true;

            console.log('[parseGithub] with URL ' + $scope.gitHubOwner + ' ' + $scope.gitHubRepo );
            let githubRepositoryContainer = null;

            // Fetch contents of the GitHub repository with file contents already included
            githubEndpoint.getTreeRecursively($scope.gitHubOwner, $scope.gitHubRepo, $scope.gitHubSha, $scope.folderToParse)
                .then(function (container) {
                    console.log('[parseGithub] finished parsing', container);
                    $scope.githubRepositoryContainer = container;
                    $scope.githubFolderStructure = container.getFolderStructure();

                    if (container.tree.length === 0) {
                        // we found no files
                        $scope.loading = false;
                        alert('No files matching the regular expression found.');
                    }

                    // Default setup
                    let astParser = new AstParser($window.esprima);
                    let babelParser = new JsxParser();
                    let fileImportExtractor = new FileImportExtractor();
                    let modelExtractorChain = null;

                    let extractedAstContent = {};
                    let extractedTokenContent = {};
                    let extractedInfoBase = {};
                    let modelGenerator = null;

                    // iterate over all files. Parse ast and extract information grouped by file
                    for (let i = 0; i < container.tree.length; i++) {

                        let fileEntry = container.tree[i];

                        let parsedSourceCode = null;
                        let ast = null;
                        try {
                            // try to parse the source code into a framework specific AST
                            console.log('[parseGithub] processing ' + fileEntry.path);
                            parsedSourceCode = babelParser.transform(fileEntry.source);

                            // we can always use the JsxParser. wont do any harm if no JSX is present
                            ast = astParser.parse(parsedSourceCode);
                        } catch (e) {
                            console.warn('[parseGithub] could not process file', fileEntry.path);
                            addOutputLog('Unable to process file '+fileEntry.path, 'error');
                            continue;
                        }

                        if (ast instanceof ReactAst) {
                            // Add unique ids to each entry of the template so that properties and
                            // behaviour can reference them
                            JsxUniqueIdPostProcessor.process(ast);

                            // initialise React specific information extractor and model generator
                            modelExtractorChain = new ReactModelExtractorChain();
                            modelGenerator = new ReactModelGenerator();
                        }

                        if (ast instanceof AngularAst) {
                            // initialise Angular specific information extractor and model generator
                            modelExtractorChain = new AngularModelExtractorChain();
                            modelGenerator = new AngularModelGenerator();
                        }

                        if (ast instanceof PolymerAst) {
                            // initialise Polymer specific information extractor and model generator
                            modelExtractorChain = new PolymerModelExtractorChain();
                            modelGenerator = new PolymerModelGenerator();
                        }

                        /*
                         * Replace the altered naming of import statements in the whole file
                         * Babel transforms the names of the imported dependencies to something like _foo2
                         * and this post processor converts every usage back to Foo.
                         * Might not always be correct, but worked for the projects in the evaluation
                         */
                        ImportDependencyPostProcessor.process(ast);

                        // Add AST output to view model
                        extractedAstContent[fileEntry.path] = ast.getContents();
                        extractedTokenContent[fileEntry.path] = (new TokenParser($window.esprima)).parse(parsedSourceCode);

                        try {
                            // Apply information extraction
                            extractedInfoBase[fileEntry.path] = modelExtractorChain.apply(ast);

                            // Add imported dependencies from the import statements at the top
                            extractedInfoBase[fileEntry.path][fileImportExtractor.descriptor()] = fileImportExtractor.extract(ast);
                        } catch (e) {
                            // something went wrong with parsing that file
                            console.warn('Could not parse file ' + fileEntry.path, e);
                            addOutputLog('Unable to process file '+fileEntry.path, 'error');
                        }

                        // check for errors in the modelExtractor
                        modelExtractorChain.getProcessErrors().forEach(a => {
                            // add error as warnings
                            addOutputLog('Failure to process the file '+fileEntry.path+' with the '+a.extractor);
                        });
                    }
                    // display the output of the semantic analyser & information extraction
                    $scope.syntaxContent = JSON.stringify(extractedAstContent, null, '\t');
                    $scope.tokensContent = JSON.stringify(extractedTokenContent, null, '\t');
                    $scope.infoBaseContent = JSON.stringify(extractedInfoBase, null, '\t');

                    // If we have extracted at least one item, perform model generation
                    if (Object.keys(extractedInfoBase).length > 0) {
                        let generatedModel = modelGenerator.generate(extractedInfoBase);
                        $scope.modelContent = JSON.stringify(generatedModel, null, '\t');

                        $scope.dependencyGraph = JSON.stringify(
                            modelGenerator.createDependencyGraphModel(extractedInfoBase)
                            , null, '\t');
                    }

                    // finished with everything
                    $scope.loading = false;
                }, function errorCallback(response) {
                    $scope.loading = false;
                    alert('The GitHub repository could not be fetched.');
                });
        }
    })
    .directive('editor', ['$window','$timeout', function ($window,$timeout) {
        /*
         * Directive to integrate the Ace Editor into the tool
         */
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


                // Define custom styles to fit into the material design
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

                // Watch 'content' and update content whenever it changes
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
